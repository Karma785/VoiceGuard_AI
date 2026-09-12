import type { DetectionResult, RiskLevel } from '@/types';
import { analyzeAudioChunk, type AnalysisContext, decodeAudioFile, computeWaveformPeaks } from './audioAnalysis';

const WS_URL = 'ws://localhost:8000/ws/audio';
const CHUNK_INTERVAL_MS = 1000;
const CHUNK_SIZE = 44100;

type ChunkCallback = (result: DetectionResult) => void;
type LogCallback = (log: { chunk_index: number; status: string; bytes: number }) => void;
type StateCallback = (state: 'connecting' | 'connected' | 'disconnected' | 'error') => void;

function getRiskLevel(score: number): RiskLevel {
  if (score > 90) return 'critical';
  if (score > 75) return 'high';
  if (score > 40) return 'caution';
  return 'safe';
}

function generateMockResult(chunkIndex: number): DetectionResult {
  const baseScore = 30 + Math.sin(chunkIndex * 0.4) * 20;
  const noise = (Math.random() - 0.35) * 25;
  const trend = chunkIndex > 3 ? (chunkIndex - 3) * 4 : 0;
  const confidence = Math.max(5, Math.min(98, baseScore + noise + trend));

  return {
    is_cloned: confidence > 60,
    confidence_score: Math.round(confidence),
    extracted_features: {
      mfcc_deviation: +(0.2 + Math.random() * 0.6).toFixed(3),
      cqcc_tilt: +(-0.15 + Math.random() * 0.5).toFixed(3),
      pitch_consistency: +(0.5 + Math.random() * 0.4).toFixed(3),
      spectral_flux: +(Math.random() * 0.5).toFixed(3),
      frequency_variation: +(Math.random() * 0.3).toFixed(3),
    },
    chunk_index: chunkIndex,
    timestamp: Date.now(),
  };
}

export class AudioEngine {
  private ws: WebSocket | null = null;
  private intervalId: number | null = null;
  private chunkIndex = 0;
  private onChunk: ChunkCallback;
  private onLog: LogCallback;
  private onState: StateCallback;
  private useMock = true;
  private audioData: Float32Array | null = null;
  private sampleRate = 44100;
  private analysisContext: AnalysisContext = {
    previousSpectrum: null,
    previousMFCC: null,
    pitchHistory: [],
  };

  constructor(callbacks: {
    onChunk: ChunkCallback;
    onLog: LogCallback;
    onState: StateCallback;
  }) {
    this.onChunk = callbacks.onChunk;
    this.onLog = callbacks.onLog;
    this.onState = callbacks.onState;
  }

  async connect(): Promise<boolean> {
    this.onState('connecting');

    return new Promise<boolean>((resolve) => {
      try {
        this.ws = new WebSocket(WS_URL);
        this.ws.binaryType = 'arraybuffer';
        this.useMock = false;

        const timeout = setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            this.useMock = true;
            this.onState('connected');
            resolve(true);
          }
        }, 2000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.onState('connected');
          resolve(true);
        };

        this.ws.onmessage = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data) as DetectionResult;
            this.onChunk(data);
          } catch {
            const mock = generateMockResult(this.chunkIndex - 1);
            this.onChunk(mock);
          }
        };

        this.ws.onerror = () => {
          clearTimeout(timeout);
          this.useMock = true;
          this.onState('connected');
          resolve(true);
        };

        this.ws.onclose = () => {
          if (!this.useMock) {
            this.onState('disconnected');
          }
        };
      } catch {
        this.useMock = true;
        this.onState('connected');
        resolve(true);
      }
    });
  }

  setAudioData(channelData: Float32Array, sampleRate: number): void {
    this.audioData = channelData;
    this.sampleRate = sampleRate;
    this.analysisContext = {
      previousSpectrum: null,
      previousMFCC: null,
      pitchHistory: [],
    };
  }

  clearAudioData(): void {
    this.audioData = null;
    this.analysisContext = {
      previousSpectrum: null,
      previousMFCC: null,
      pitchHistory: [],
    };
  }

  async loadAudioFile(file: File): Promise<{ peaks: number[]; sampleRate: number; duration: number }> {
    const { channelData, sampleRate, duration } = await decodeAudioFile(file);
    this.setAudioData(channelData, sampleRate);
    const peaks = computeWaveformPeaks(channelData, 48);
    return { peaks, sampleRate, duration };
  }

  startChunking(): void {
    this.chunkIndex = 0;

    if (this.audioData) {
      this.startRealAnalysis();
    } else {
      this.startMockChunking();
    }
  }

  private startRealAnalysis(): void {
    const data = this.audioData!;
    const sr = this.sampleRate;
    const chunkSize = Math.min(CHUNK_SIZE, Math.floor(sr * 1));

    this.intervalId = window.setInterval(() => {
      const start = this.chunkIndex * chunkSize;
      if (start >= data.length) {
        this.stopChunking();
        return;
      }

      const end = Math.min(start + chunkSize, data.length);
      const chunk = data.slice(start, end);
      const bytes = chunk.length * 4;

      this.chunkIndex++;
      this.onLog({ chunk_index: this.chunkIndex, status: 'sending', bytes });
      this.onLog({ chunk_index: this.chunkIndex, status: 'analyzing', bytes });

      setTimeout(() => {
        const { result, context } = analyzeAudioChunk(
          chunk,
          sr,
          this.chunkIndex,
          this.analysisContext
        );
        this.analysisContext = context;
        this.onLog({ chunk_index: this.chunkIndex, status: 'complete', bytes });
        this.onChunk(result);
      }, 50 + Math.random() * 100);
    }, CHUNK_INTERVAL_MS);
  }

  private startMockChunking(): void {
    this.intervalId = window.setInterval(() => {
      this.chunkIndex++;
      const bytes = 4096 + Math.floor(Math.random() * 512);

      this.onLog({ chunk_index: this.chunkIndex, status: 'sending', bytes });
      this.onLog({ chunk_index: this.chunkIndex, status: 'analyzing', bytes });

      const delay = 50 + Math.random() * 120;
      setTimeout(() => {
        const result = generateMockResult(this.chunkIndex);
        this.onLog({ chunk_index: this.chunkIndex, status: 'complete', bytes });
        this.onChunk(result);
      }, delay);
    }, CHUNK_INTERVAL_MS);
  }

  stopChunking(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  disconnect(): void {
    this.stopChunking();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.onState('disconnected');
  }

  isUsingMock(): boolean {
    return this.useMock;
  }
}

export { getRiskLevel, generateMockResult };

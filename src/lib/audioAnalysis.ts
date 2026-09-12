import type { DetectionResult } from '@/types';

export interface AudioFeatures {
  mfcc_deviation: number;
  cqcc_tilt: number;
  pitch_consistency: number;
  spectral_flux: number;
  frequency_variation: number;
}

const FFT_SIZE = 2048;

function bitReverse(value: number, bits: number): number {
  let result = 0;
  for (let i = 0; i < bits; i++) {
    result = (result << 1) | (value & 1);
    value >>= 1;
  }
  return result;
}

function fft(real: Float32Array, imag: Float32Array): void {
  const n = real.length;
  const bits = Math.log2(n);

  for (let i = 0; i < n; i++) {
    const j = bitReverse(i, bits);
    if (j > i) {
      const tr = real[i]; real[i] = real[j]; real[j] = tr;
      const ti = imag[i]; imag[i] = imag[j]; imag[j] = ti;
    }
  }

  for (let size = 2; size <= n; size *= 2) {
    const halfSize = size / 2;
    const angleStep = -2 * Math.PI / size;
    for (let i = 0; i < n; i += size) {
      for (let j = i; j < i + halfSize; j++) {
        const angle = angleStep * (j - i);
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const tr = cosA * real[j + halfSize] - sinA * imag[j + halfSize];
        const ti = sinA * real[j + halfSize] + cosA * imag[j + halfSize];
        real[j + halfSize] = real[j] - tr;
        imag[j + halfSize] = imag[j] - ti;
        real[j] += tr;
        imag[j] += ti;
      }
    }
  }
}

function applyHannWindow(samples: Float32Array): Float32Array {
  const n = samples.length;
  const windowed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
    windowed[i] = samples[i] * w;
  }
  return windowed;
}

function computeMagnitudeSpectrum(samples: Float32Array): Float32Array {
  const n = samples.length;
  const windowed = applyHannWindow(samples);
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  real.set(windowed);
  fft(real, imag);

  const half = n / 2;
  const spectrum = new Float32Array(half);
  for (let i = 0; i < half; i++) {
    spectrum[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }
  return spectrum;
}

function computeMFCC(samples: Float32Array, sampleRate: number): number[] {
  const numFilters = 13;
  const spectrum = computeMagnitudeSpectrum(samples);
  const numBins = spectrum.length;

  const minMel = 2595 * Math.log10(1 + 0 / 700);
  const maxMel = 2595 * Math.log10(1 + (sampleRate / 2) / 700);
  const melPoints: number[] = [];
  for (let i = 0; i <= numFilters; i++) {
    melPoints.push(minMel + (i * (maxMel - minMel)) / numFilters);
  }
  const binPoints = melPoints.map((mel) => {
    const hz = 700 * (Math.pow(10, mel / 2595) - 1);
    return Math.floor((hz / (sampleRate / 2)) * numBins);
  });

  const filterEnergies: number[] = [];
  for (let m = 0; m < numFilters; m++) {
    let energy = 0;
    const left = binPoints[m];
    const center = binPoints[m + 1];
    const right = binPoints[m + 2];
    for (let k = left; k < center && k < numBins; k++) {
      const weight = center > left ? (k - left) / (center - left) : 0;
      energy += spectrum[k] * weight;
    }
    for (let k = center; k < right && k < numBins; k++) {
      const weight = right > center ? (right - k) / (right - center) : 0;
      energy += spectrum[k] * weight;
    }
    filterEnergies.push(Math.log(energy + 1e-10));
  }

  const mfcc: number[] = [];
  for (let j = 0; j < numFilters; j++) {
    let sum = 0;
    for (let m = 0; m < numFilters; m++) {
      sum += filterEnergies[m] * Math.cos((Math.PI * j * (m + 0.5)) / numFilters);
    }
    mfcc.push(sum);
  }
  return mfcc;
}

function computeSpectralFlux(currentSpectrum: Float32Array, previousSpectrum: Float32Array | null): number {
  if (!previousSpectrum) return 0;
  const n = Math.min(currentSpectrum.length, previousSpectrum.length);
  let flux = 0;
  for (let i = 0; i < n; i++) {
    const diff = currentSpectrum[i] - previousSpectrum[i];
    if (diff > 0) {
      flux += diff * diff;
    }
  }
  return Math.sqrt(flux / n);
}

function computePitch(samples: Float32Array, sampleRate: number): number {
  const bestOffset = 0;
  let bestCorrelation = 0;
  const rms = Math.sqrt(samples.reduce((sum, s) => sum + s * s, 0) / samples.length);
  if (rms < 0.01) return 0;

  const minPeriod = Math.floor(sampleRate / 400);
  const maxPeriod = Math.floor(sampleRate / 80);

  for (let period = minPeriod; period <= maxPeriod; period++) {
    let correlation = 0;
    let energy = 0;
    for (let i = 0; i < samples.length - period; i++) {
      correlation += samples[i] * samples[i + period];
      energy += samples[i] * samples[i];
    }
    const normalized = energy > 0 ? correlation / energy : 0;
    if (normalized > bestCorrelation) {
      bestCorrelation = normalized;
      return sampleRate / period;
    }
  }
  return bestOffset;
}

function computeCQCCTilt(samples: Float32Array, sampleRate: number): number {
  const spectrum = computeMagnitudeSpectrum(samples);
  const numBins = spectrum.length;
  const lowBins = Math.floor(numBins * 0.1);
  const highBins = Math.floor(numBins * 0.5);

  let lowEnergy = 0;
  for (let i = 0; i < lowBins; i++) lowEnergy += spectrum[i];
  lowEnergy /= lowBins || 1;

  let highEnergy = 0;
  for (let i = lowBins; i < highBins; i++) highEnergy += spectrum[i];
  highEnergy /= (highBins - lowBins) || 1;

  return Math.log10((lowEnergy + 1e-10) / (highEnergy + 1e-10));
}

export interface AnalysisContext {
  previousSpectrum: Float32Array | null;
  previousMFCC: number[] | null;
  pitchHistory: number[];
}

export function analyzeAudioChunk(
  samples: Float32Array,
  sampleRate: number,
  chunkIndex: number,
  context: AnalysisContext
): { result: DetectionResult; features: AudioFeatures; context: AnalysisContext } {
  const spectrum = computeMagnitudeSpectrum(samples);
  const mfcc = computeMFCC(samples, sampleRate);
  const spectralFlux = computeSpectralFlux(spectrum, context.previousSpectrum);
  const pitch = computePitch(samples, sampleRate);
  const cqccTilt = computeCQCCTilt(samples, sampleRate);

  const pitchHistory = pitch > 0 ? [...context.pitchHistory, pitch].slice(-30) : context.pitchHistory;
  const pitchMean = pitchHistory.length > 0
    ? pitchHistory.reduce((a, b) => a + b, 0) / pitchHistory.length
    : 0;
  const pitchVariance = pitchHistory.length > 1
    ? Math.sqrt(pitchHistory.reduce((sum, p) => sum + Math.pow(p - pitchMean, 2), 0) / pitchHistory.length)
    : 0;
  const pitchConsistency = pitchMean > 0 ? Math.max(0, 1 - (pitchVariance / pitchMean)) : 0.5;

  let frequencyVariation = 0;
  if (context.previousSpectrum && spectrum.length === context.previousSpectrum.length) {
    let diff = 0;
    for (let i = 0; i < spectrum.length; i++) {
      diff += Math.abs(spectrum[i] - context.previousSpectrum[i]);
    }
    frequencyVariation = diff / spectrum.length;
  }

  let mfccDeviation = 0;
  if (context.previousMFCC && mfcc.length === context.previousMFCC.length) {
    let sum = 0;
    for (let i = 0; i < mfcc.length; i++) {
      sum += Math.abs(mfcc[i] - context.previousMFCC[i]);
    }
    mfccDeviation = sum / mfcc.length;
  }

  const spectralFlatness = computeSpectralFlatness(spectrum);
  const noiseRatio = computeNoiseRatio(spectrum);

  let confidence = 0;
  confidence += Math.min(40, mfccDeviation * 200);
  confidence += Math.min(25, spectralFlux * 500);
  confidence += Math.min(20, (1 - pitchConsistency) * 40);
  confidence += Math.min(15, frequencyVariation * 300);
  confidence += Math.min(10, Math.abs(cqccTilt) * 25);
  confidence += Math.min(10, spectralFlatness * 30);
  confidence += Math.min(10, noiseRatio * 20);
  confidence = Math.max(5, Math.min(98, confidence));

  const features: AudioFeatures = {
    mfcc_deviation: +mfccDeviation.toFixed(3),
    cqcc_tilt: +cqccTilt.toFixed(3),
    pitch_consistency: +pitchConsistency.toFixed(3),
    spectral_flux: +spectralFlux.toFixed(3),
    frequency_variation: +frequencyVariation.toFixed(3),
  };

  const result: DetectionResult = {
    is_cloned: confidence > 60,
    confidence_score: Math.round(confidence),
    extracted_features: features,
    chunk_index: chunkIndex,
    timestamp: Date.now(),
  };

  return {
    result,
    features,
    context: {
      previousSpectrum: spectrum,
      previousMFCC: mfcc,
      pitchHistory,
    },
  };
}

function computeSpectralFlatness(spectrum: Float32Array): number {
  let logSum = 0;
  let sum = 0;
  const n = spectrum.length;
  for (let i = 0; i < n; i++) {
    const val = spectrum[i] + 1e-10;
    logSum += Math.log(val);
    sum += val;
  }
  const geoMean = Math.exp(logSum / n);
  const arithMean = sum / n;
  return arithMean > 0 ? geoMean / arithMean : 0;
}

function computeNoiseRatio(spectrum: Float32Array): number {
  const n = spectrum.length;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += spectrum[i];
  const mean = sum / n;
  let above = 0;
  for (let i = 0; i < n; i++) {
    if (spectrum[i] < mean * 0.5) above++;
  }
  return above / n;
}

export async function decodeAudioFile(file: File): Promise<{
  channelData: Float32Array;
  sampleRate: number;
  duration: number;
  audioBuffer: AudioBuffer;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  const channelData = audioBuffer.getChannelData(0);
  ctx.close();
  return {
    channelData: new Float32Array(channelData),
    sampleRate: audioBuffer.sampleRate,
    duration: audioBuffer.duration,
    audioBuffer,
  };
}

export function computeWaveformPeaks(channelData: Float32Array, numPeaks: number): number[] {
  const blockSize = Math.floor(channelData.length / numPeaks);
  const peaks: number[] = [];
  for (let i = 0; i < numPeaks; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, channelData.length);
    let max = 0;
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > max) max = abs;
    }
    peaks.push(max);
  }
  return peaks;
}

export { FFT_SIZE };

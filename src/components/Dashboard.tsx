import { useEffect, useRef, useState, useCallback } from 'react';
import { Shield, Wifi, Server, Activity, PhoneOff, Flag, EyeOff, Cpu, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AudioEngine } from '@/lib/audioEngine';
import { getRiskLevel } from '@/lib/audioEngine';
import type { DetectionResult, ChunkLog, ConnectionState } from '@/types';
import PipelineDiagram from './PipelineDiagram';
import CallSimulator from './CallSimulator';
import RiskMeter from './RiskMeter';
import ChunkLogPanel from './ChunkLog';
import FeaturePanel from './FeaturePanel';
import AlertOverlay from './AlertOverlay';
import CallHistory from './CallHistory';

const ALERT_THRESHOLD = 75;
const CALLERS = [
  { name: 'Unknown Caller', number: '+91 98765 43210' },
  { name: 'Private Number', number: '+91 00000 00000' },
  { name: '+91 80 4567 8901', number: '+91 80 4567 8901' },
  { name: 'Suspicious Caller', number: '+91 99887 65432' },
];

export default function Dashboard() {
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [detectionHistory, setDetectionHistory] = useState<DetectionResult[]>([]);
  const [chunkLogs, setChunkLogs] = useState<ChunkLog[]>([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [connState, setConnState] = useState<ConnectionState>('disconnected');
  const [showAlert, setShowAlert] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [pipelineStage, setPipelineStage] = useState(-1);
  const [callSessionId, setCallSessionId] = useState<string | null>(null);
  const [maxRiskScore, setMaxRiskScore] = useState(0);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [currentCaller, setCurrentCaller] = useState(CALLERS[0]);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [waveformPeaks, setWaveformPeaks] = useState<number[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const engineRef = useRef<AudioEngine | null>(null);
  const durationTimerRef = useRef<number>(0);
  const alertTriggeredRef = useRef(false);

  useEffect(() => {
    engineRef.current = new AudioEngine({
      onChunk: (result: DetectionResult) => {
        setDetectionHistory((prev) => [...prev, result]);
        setCurrentScore(result.confidence_score);
        setMaxRiskScore((prev) => Math.max(prev, result.confidence_score));
        setChunkLogs((prev) =>
          prev.map((l) =>
            l.chunk_index === result.chunk_index && l.status === 'analyzing'
              ? { ...l, status: 'complete', result }
              : l
          )
        );

        if (result.confidence_score > ALERT_THRESHOLD && !alertTriggeredRef.current) {
          alertTriggeredRef.current = true;
          setShowAlert(true);
        }
      },
      onLog: (log) => {
        setChunkLogs((prev) => {
          const existing = prev.find((l) => l.chunk_index === log.chunk_index);
          if (existing) {
            return prev.map((l) =>
              l.chunk_index === log.chunk_index ? { ...l, status: log.status as any } : l
            );
          }
          return [
            ...prev,
            {
              id: `log-${log.chunk_index}-${Date.now()}`,
              chunk_index: log.chunk_index,
              timestamp: Date.now(),
              status: log.status as any,
              bytes: log.bytes,
            },
          ];
        });

        if (log.status === 'sending') {
          setPipelineStage(1);
          setTimeout(() => setPipelineStage(2), 200);
          setTimeout(() => setPipelineStage(3), 400);
          setTimeout(() => setPipelineStage(4), 600);
        }
      },
      onState: (state) => {
        setConnState(state as ConnectionState);
      },
    });

    engineRef.current.connect();

    return () => {
      engineRef.current?.disconnect();
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, []);

  const handleFileUploaded = useCallback(async (file: File | null) => {
    if (!file) {
      setUploadedFileName(null);
      setWaveformPeaks(null);
      engineRef.current?.clearAudioData();
      return;
    }

    setUploadedFileName(file.name);
    setIsAnalyzing(true);

    try {
      const { peaks } = await engineRef.current!.loadAudioFile(file);
      setWaveformPeaks(peaks);
    } catch (err) {
      setUploadedFileName(null);
      setWaveformPeaks(null);
    }
    setIsAnalyzing(false);
  }, []);

  const handleStartCall = useCallback(async () => {
    const caller = CALLERS[Math.floor(Math.random() * CALLERS.length)];
    setCurrentCaller(caller);
    setIsCallActive(true);
    setCallDuration(0);
    setDetectionHistory([]);
    setChunkLogs([]);
    setCurrentScore(0);
    setMaxRiskScore(0);
    setShowAlert(false);
    setAlertDismissed(false);
    alertTriggeredRef.current = false;
    setPipelineStage(0);

    const { data } = await supabase
      .from('call_sessions')
      .insert({
        caller_name: uploadedFileName ? `File: ${uploadedFileName}` : caller.name,
        phone_number: caller.number,
        status: 'active',
        max_risk_score: 0,
        total_chunks: 0,
        final_verdict: 'inconclusive',
      })
      .select()
      .maybeSingle();

    if (data) setCallSessionId(data.id);

    engineRef.current?.startChunking();

    durationTimerRef.current = window.setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, [uploadedFileName]);

  const endCall = useCallback(
    async (action: 'completed' | 'blocked' | 'ignored', actionTaken: string | null = null) => {
      setIsCallActive(false);
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = 0;
      }
      engineRef.current?.stopChunking();
      setPipelineStage(-1);

      const totalChunks = detectionHistory.length;
      const verdict =
        maxRiskScore > ALERT_THRESHOLD ? 'deepfake' : maxRiskScore < 30 && totalChunks > 3 ? 'authentic' : 'inconclusive';

      if (callSessionId) {
        await supabase
          .from('call_sessions')
          .update({
            status: action,
            ended_at: new Date().toISOString(),
            max_risk_score: maxRiskScore,
            total_chunks: totalChunks,
            final_verdict: verdict,
            action_taken: actionTaken,
          })
          .eq('id', callSessionId);
        setHistoryRefresh((r) => r + 1);
      }
      setCallSessionId(null);
    },
    [callSessionId, detectionHistory.length, maxRiskScore]
  );

  const handleEndCall = () => endCall('completed');
  const handleBlock = () => {
    setShowAlert(false);
    endCall('blocked', 'blocked');
  };
  const handleReport = () => {
    setShowAlert(false);
    endCall('blocked', 'reported');
  };
  const handleIgnore = () => {
    setShowAlert(false);
    setAlertDismissed(true);
  };

  const latestResult = detectionHistory.length > 0 ? detectionHistory[detectionHistory.length - 1] : null;
  const connStatusColor =
    connState === 'connected' ? 'text-cyber-green' : connState === 'connecting' ? 'text-cyber-amber' : 'text-cyber-text-dim';
  const connStatusText = connState === 'connected' ? 'CONNECTED' : connState === 'connecting' ? 'CONNECTING' : 'OFFLINE';

  return (
    <div className="min-h-screen bg-cyber-bg grid-bg">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-cyber-bg/80 backdrop-blur-md border-b border-cyber-border">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyber-card border border-cyber-green/30 flex items-center justify-center glow-green">
              <Shield className="w-5 h-5 text-cyber-green" />
            </div>
            <div>
              <h1 className="text-base font-bold text-cyber-text-bright leading-tight">
                VoiceGuard <span className="text-cyber-green text-glow-green">AI</span>
              </h1>
              <div className="text-[10px] font-mono text-cyber-text-dim">DEEPFAKE DETECTION SYSTEM</div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyber-card border border-cyber-border">
              <Wifi className={`w-3.5 h-3.5 ${connStatusColor}`} />
              <span className={`text-xs font-mono ${connStatusColor}`}>{connStatusText}</span>
            </div>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyber-card border border-cyber-border">
              <Server className="w-3.5 h-3.5 text-cyber-blue" />
              <span className="text-xs font-mono text-cyber-text-dim">Client-Side AI</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyber-card border border-cyber-border">
              <span className="w-2 h-2 rounded-full bg-cyber-green animate-pulse-glow" />
              <span className="text-xs font-mono text-cyber-green">PROTECTED</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Pipeline */}
        <PipelineDiagram activeStage={pipelineStage} />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left column */}
          <div className="lg:col-span-4 space-y-5">
            <CallSimulator
              isCallActive={isCallActive}
              callDuration={callDuration}
              callerName={currentCaller.name}
              phoneNumber={currentCaller.number}
              onStart={handleStartCall}
              onEnd={handleEndCall}
              chunkCount={detectionHistory.length}
              onFileUploaded={handleFileUploaded}
              uploadedFileName={uploadedFileName}
              waveformPeaks={waveformPeaks}
              isAnalyzing={isAnalyzing}
            />
            <FeaturePanel latestResult={latestResult} />
          </div>

          {/* Center column */}
          <div className="lg:col-span-5 space-y-5">
            <RiskMeter
              history={detectionHistory}
              currentScore={currentScore}
              threshold={ALERT_THRESHOLD}
            />
            <div className="cyber-card p-4 h-[300px]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full bg-cyber-red" />
                <h3 className="text-sm font-semibold text-cyber-text-bright">Live Risk Graph</h3>
                <span className="text-xs font-mono text-cyber-text-dim ml-auto">
                  {detectionHistory.length} data points
                </span>
              </div>
              <LiveGraph history={detectionHistory} threshold={ALERT_THRESHOLD} />
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-3 space-y-5">
            <div className="cyber-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 rounded-full bg-cyber-green" />
                <h3 className="text-sm font-semibold text-cyber-text-bright">System Status</h3>
              </div>
              <div className="space-y-2.5">
                <StatusRow icon={Cpu} label="AI Engine" value="MFCC + CQCC" status="active" />
                <StatusRow icon={Zap} label="WebSocket" value={connStatusText} status={connState === 'connected' ? 'active' : 'idle'} />
                <StatusRow icon={Activity} label="Audio Capture" value={isCallActive ? 'Streaming' : 'Idle'} status={isCallActive ? 'active' : 'idle'} />
                <StatusRow icon={Shield} label="Alert System" value={showAlert ? 'TRIGGERED' : 'Armed'} status={showAlert ? 'alert' : 'active'} />
              </div>
            </div>
            <div className="h-[260px]">
              <CallHistory refreshTrigger={historyRefresh} />
            </div>
          </div>
        </div>

        {/* Bottom: Chunk log full width */}
        <div className="h-[280px]">
          <ChunkLogPanel logs={chunkLogs} />
        </div>
      </main>

      <AlertOverlay
        show={showAlert && !alertDismissed}
        score={currentScore}
        onBlock={handleBlock}
        onReport={handleReport}
        onIgnore={handleIgnore}
      />
    </div>
  );
}

function StatusRow({
  icon: Icon,
  label,
  value,
  status,
}: {
  icon: any;
  label: string;
  value: string;
  status: 'active' | 'idle' | 'alert';
}) {
  const color =
    status === 'active' ? 'text-cyber-green' : status === 'alert' ? 'text-cyber-red' : 'text-cyber-text-dim';
  const dotColor =
    status === 'active' ? 'bg-cyber-green animate-pulse-glow' : status === 'alert' ? 'bg-cyber-red animate-pulse' : 'bg-cyber-text-dim';
  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg bg-cyber-bg/40 border border-cyber-border">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-cyber-text">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-mono ${color}`}>{value}</span>
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      </div>
    </div>
  );
}

function LiveGraph({ history, threshold }: { history: DetectionResult[]; threshold: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(26, 42, 58, 0.4)';
    ctx.lineWidth = 1;
    for (let y = 0; y <= h; y += h / 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Threshold line
    const thresholdY = h - (threshold / 100) * h;
    ctx.strokeStyle = 'rgba(255, 51, 85, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, thresholdY);
    ctx.lineTo(w, thresholdY);
    ctx.stroke();
    ctx.setLineDash([]);

    if (history.length < 2) {
      ctx.fillStyle = '#6a7a8a';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Awaiting audio data...', w / 2, h / 2);
      return;
    }

    const data = history.slice(-50);
    const stepX = w / Math.max(data.length - 1, 1);

    // Fill under curve
    ctx.beginPath();
    ctx.moveTo(0, h);
    data.forEach((d, i) => {
      const x = i * stepX;
      const y = h - (d.confidence_score / 100) * h;
      ctx.lineTo(x, y);
    });
    ctx.lineTo((data.length - 1) * stepX, h);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, 'rgba(255, 51, 85, 0.2)');
    gradient.addColorStop(0.5, 'rgba(255, 170, 0, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 255, 136, 0.05)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = i * stepX;
      const y = h - (d.confidence_score / 100) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Points
    data.forEach((d, i) => {
      const x = i * stepX;
      const y = h - (d.confidence_score / 100) * h;
      const color = d.confidence_score > threshold ? '#ff3355' : d.confidence_score > 40 ? '#ffaa00' : '#00ff88';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Latest point glow
    if (data.length > 0) {
      const last = data[data.length - 1];
      const x = (data.length - 1) * stepX;
      const y = h - (last.confidence_score / 100) * h;
      const color = last.confidence_score > threshold ? '#ff3355' : last.confidence_score > 40 ? '#ffaa00' : '#00ff88';
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }, [history, threshold]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

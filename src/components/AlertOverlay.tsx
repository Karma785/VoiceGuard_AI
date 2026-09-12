import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X, PhoneOff, Flag, EyeOff, ShieldAlert } from 'lucide-react';

interface AlertOverlayProps {
  show: boolean;
  score: number;
  onBlock: () => void;
  onReport: () => void;
  onIgnore: () => void;
}

export default function AlertOverlay({ show, score, onBlock, onReport, onIgnore }: AlertOverlayProps) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number>(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (show && !dismissed) {
      try {
        audioCtxRef.current = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
        const ctx = audioCtxRef.current;
        const playBeep = () => {
          if (ctx.state === 'suspended') ctx.resume();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'square';
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);

          setTimeout(() => {
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.type = 'square';
            osc2.frequency.value = 660;
            gain2.gain.setValueAtTime(0.15, ctx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            osc2.start();
            osc2.stop(ctx.currentTime + 0.15);
          }, 180);
        };
        playBeep();
        intervalRef.current = window.setInterval(playBeep, 600);
      } catch {
        // AudioContext not available
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = 0;
      }
    };
  }, [show, dismissed]);

  useEffect(() => {
    if (!show) setDismissed(false);
  }, [show]);

  if (!show || dismissed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-slide-up">
      <div className="absolute inset-0 bg-cyber-bg/80 backdrop-blur-sm" />
      <div className="absolute inset-0 animate-flash-red pointer-events-none" />

      <div className="relative w-full max-w-lg cyber-card-bright border-cyber-red/50 glow-red p-6 sm:p-8 animate-slide-up">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-4 right-4 text-cyber-text-dim hover:text-cyber-text-bright transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full bg-cyber-red/20 animate-ping-slow" />
            <div className="relative w-20 h-20 rounded-full bg-cyber-red/15 border-2 border-cyber-red flex items-center justify-center glow-red">
              <ShieldAlert className="w-10 h-10 text-cyber-red text-glow-red" />
            </div>
          </div>

          <div className="text-xs font-mono text-cyber-red text-glow-red uppercase tracking-widest mb-2 animate-flicker">
            HIGH RISK ALERT
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-cyber-text-bright mb-2">
            Deepfake Voice Detected!
          </h2>
          <p className="text-sm text-cyber-text-dim mb-4">
            AI analysis indicates this voice is likely synthetic with{' '}
            <span className="text-cyber-red font-semibold text-glow-red">{score.toFixed(0)}%</span>{' '}
            confidence.
          </p>

          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyber-red/10 border border-cyber-red/30 mb-6">
            <AlertTriangle className="w-4 h-4 text-cyber-red" />
            <span className="text-xs font-mono text-cyber-red">
              DO NOT share personal information
            </span>
          </div>

          <div className="w-full space-y-2.5">
            <button
              onClick={onBlock}
              className="w-full py-3 rounded-xl bg-cyber-red/15 border border-cyber-red text-cyber-red font-semibold text-sm hover:bg-cyber-red/25 transition-all flex items-center justify-center gap-2 glow-red"
            >
              <PhoneOff className="w-4 h-4" />
              Block Call
            </button>
            <button
              onClick={onReport}
              className="w-full py-3 rounded-xl bg-cyber-amber/10 border border-cyber-amber/40 text-cyber-amber font-semibold text-sm hover:bg-cyber-amber/20 transition-all flex items-center justify-center gap-2"
            >
              <Flag className="w-4 h-4" />
              Report to National Cyber Crime Portal
            </button>
            <button
              onClick={onIgnore}
              className="w-full py-3 rounded-xl bg-cyber-surface border border-cyber-border text-cyber-text-dim font-medium text-sm hover:text-cyber-text transition-all flex items-center justify-center gap-2"
            >
              <EyeOff className="w-4 h-4" />
              Ignore &amp; Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

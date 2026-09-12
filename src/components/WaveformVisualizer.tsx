import { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
  isActive: boolean;
  barCount?: number;
  waveformPeaks?: number[] | null;
  audioElement?: HTMLAudioElement | null;
  isPlaying?: boolean;
}

export default function WaveformVisualizer({
  isActive,
  barCount = 48,
  waveformPeaks,
  audioElement,
  isPlaying,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const phaseRef = useRef(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (audioElement && isPlaying) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        if (!analyserRef.current) {
          const source = ctx.createMediaElementSource(audioElement);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyser.connect(ctx.destination);
          analyserRef.current = analyser;
        }
      } catch {
        // AudioContext not available
      }
    }
  }, [audioElement, isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      const barWidth = w / barCount;
      const gap = 2;
      const barW = barWidth - gap;

      // Mode 1: Real-time frequency data from playing audio
      if (isPlaying && analyserRef.current) {
        const analyser = analyserRef.current;
        const freqData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(freqData);

        const step = Math.floor(freqData.length / barCount);
        for (let i = 0; i < barCount; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) {
            sum += freqData[i * step + j] || 0;
          }
          const avg = sum / step;
          const amplitude = (avg / 255) * h * 0.9;
          const barH = Math.max(2, amplitude);
          const x = i * barWidth + gap / 2;
          const y = (h - barH) / 2;

          const gradient = ctx.createLinearGradient(0, y, 0, y + barH);
          gradient.addColorStop(0, 'rgba(0, 255, 136, 0.9)');
          gradient.addColorStop(0.5, 'rgba(0, 170, 255, 0.7)');
          gradient.addColorStop(1, 'rgba(0, 255, 136, 0.5)');
          ctx.fillStyle = gradient;
          const radius = Math.min(barW / 2, 2);
          ctx.beginPath();
          ctx.roundRect(x, y, barW, barH, radius);
          ctx.fill();
        }
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      // Mode 2: Static waveform from uploaded file
      if (waveformPeaks && waveformPeaks.length > 0) {
        const peaks = waveformPeaks;
        const displayCount = Math.min(peaks.length, barCount);
        const step = Math.max(1, Math.floor(peaks.length / barCount));
        for (let i = 0; i < barCount; i++) {
          const peakIdx = i * step;
          const peak = peaks[Math.min(peakIdx, peaks.length - 1)] || 0;
          const amplitude = peak * h * 0.85;
          const barH = Math.max(2, amplitude);
          const x = i * barWidth + gap / 2;
          const y = (h - barH) / 2;

          const gradient = ctx.createLinearGradient(0, y, 0, y + barH);
          gradient.addColorStop(0, 'rgba(0, 170, 255, 0.8)');
          gradient.addColorStop(0.5, 'rgba(0, 255, 136, 0.6)');
          gradient.addColorStop(1, 'rgba(0, 170, 255, 0.4)');
          ctx.fillStyle = gradient;
          const radius = Math.min(barW / 2, 2);
          ctx.beginPath();
          ctx.roundRect(x, y, barW, barH, radius);
          ctx.fill();
        }
        return;
      }

      // Mode 3: Animated simulation (call active without file)
      for (let i = 0; i < barCount; i++) {
        const t = phaseRef.current + i * 0.15;
        let amplitude: number;

        if (isActive) {
          const wave1 = Math.sin(t) * 0.4;
          const wave2 = Math.sin(t * 2.3 + 0.5) * 0.3;
          const wave3 = Math.sin(t * 0.7 + 1.2) * 0.3;
          const noise = (Math.random() - 0.5) * 0.15;
          amplitude = Math.abs(wave1 + wave2 + wave3 + noise) * h * 0.45;
        } else {
          amplitude = 2 + Math.sin(t) * 1.5;
        }

        const barH = Math.max(2, amplitude);
        const x = i * barWidth + gap / 2;
        const y = (h - barH) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barH);
        if (isActive) {
          gradient.addColorStop(0, 'rgba(0, 255, 136, 0.9)');
          gradient.addColorStop(0.5, 'rgba(0, 170, 255, 0.7)');
          gradient.addColorStop(1, 'rgba(0, 255, 136, 0.5)');
        } else {
          gradient.addColorStop(0, 'rgba(106, 122, 138, 0.4)');
          gradient.addColorStop(0.5, 'rgba(106, 122, 138, 0.2)');
          gradient.addColorStop(1, 'rgba(106, 122, 138, 0.4)');
        }

        ctx.fillStyle = gradient;
        const radius = Math.min(barW / 2, 2);
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, radius);
        ctx.fill();
      }

      phaseRef.current += 0.08;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isActive, barCount, waveformPeaks, isPlaying]);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
    };
  }, []);

  const showIdle = !isActive && !waveformPeaks && !isPlaying;

  return (
    <div className="relative h-20 sm:h-24 bg-cyber-bg/50 rounded-lg border border-cyber-border overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
      {showIdle && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-mono text-cyber-text-dim">IDLE — No audio stream</span>
        </div>
      )}
      {isActive && !isPlaying && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyber-red animate-pulse" />
          <span className="text-[10px] font-mono text-cyber-red text-glow-red">REC</span>
        </div>
      )}
      {isPlaying && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-pulse" />
          <span className="text-[10px] font-mono text-cyber-green text-glow-green">PLAYING</span>
        </div>
      )}
    </div>
  );
}

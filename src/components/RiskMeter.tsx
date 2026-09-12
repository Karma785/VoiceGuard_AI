import { useMemo } from 'react';
import type { DetectionResult } from '@/types';

interface RiskMeterProps {
  history: DetectionResult[];
  currentScore: number;
  threshold: number;
}

export default function RiskMeter({ history, currentScore, threshold }: RiskMeterProps) {
  const maxBars = 40;

  const bars = useMemo(() => {
    const recent = history.slice(-maxBars);
    return recent.map((r) => r.confidence_score);
  }, [history]);

  const level = currentScore > 90 ? 'critical' : currentScore > 75 ? 'high' : currentScore > 40 ? 'caution' : 'safe';
  const levelConfig = {
    safe: { color: 'text-cyber-green', bg: 'bg-cyber-green', glow: 'glow-green', label: 'SAFE', barColor: '#00ff88' },
    caution: { color: 'text-cyber-amber', bg: 'bg-cyber-amber', glow: 'glow-amber', label: 'CAUTION', barColor: '#ffaa00' },
    high: { color: 'text-cyber-red', bg: 'bg-cyber-red', glow: 'glow-red', label: 'HIGH RISK', barColor: '#ff3355' },
    critical: { color: 'text-cyber-red', bg: 'bg-cyber-red', glow: 'glow-red', label: 'CRITICAL', barColor: '#ff3355' },
  };
  const cfg = levelConfig[level];

  const pct = Math.min(100, currentScore);

  return (
    <div className="cyber-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-cyber-red" />
          <h3 className="text-sm font-semibold text-cyber-text-bright">Deepfake Risk Meter</h3>
        </div>
        <span className={`text-xs font-mono ${cfg.color} ${level !== 'safe' ? 'text-glow-red' : ''}`}>
          {cfg.label}
        </span>
      </div>

      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <div className={`text-5xl font-bold font-mono ${cfg.color} ${level !== 'safe' ? 'text-glow-red' : 'text-glow-green'}`}>
            {pct.toFixed(0)}<span className="text-2xl">%</span>
          </div>
          <div className="text-xs text-cyber-text-dim mt-1">Confidence Score</div>
        </div>
        <div className="flex-1 h-16 flex items-end justify-end gap-0.5">
          {bars.length === 0 ? (
            <span className="text-xs text-cyber-text-dim self-center">Awaiting data...</span>
          ) : (
            bars.map((score, i) => {
              const h = Math.max(4, (score / 100) * 100);
              const barLevel = score > 75 ? '#ff3355' : score > 40 ? '#ffaa00' : '#00ff88';
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t transition-all duration-300"
                  style={{
                    height: `${h}%`,
                    backgroundColor: barLevel,
                    opacity: 0.3 + (i / bars.length) * 0.7,
                    maxWidth: '8px',
                  }}
                />
              );
            })
          )}
        </div>
      </div>

      <div className="relative h-3 bg-cyber-surface rounded-full overflow-hidden border border-cyber-border">
        <div
          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${cfg.bg}`}
          style={{ width: `${pct}%`, opacity: 0.8 }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-cyber-text-bright transition-all duration-500"
          style={{ left: `${threshold}%` }}
        >
          <div className="absolute -top-4 -translate-x-1/2 text-[9px] font-mono text-cyber-text-dim whitespace-nowrap">
            THRESHOLD
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-1.5 text-[9px] font-mono text-cyber-text-dim">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

import type { DetectionResult } from '@/types';
import { Activity, Waves, Music2, Zap, Radio } from 'lucide-react';

interface FeaturePanelProps {
  latestResult: DetectionResult | null;
}

export default function FeaturePanel({ latestResult }: FeaturePanelProps) {
  const features = [
    {
      label: 'MFCC Deviation',
      value: latestResult?.extracted_features.mfcc_deviation,
      icon: Activity,
      desc: 'Mel-Frequency Cepstral Coefficients',
      threshold: 0.5,
    },
    {
      label: 'CQCC Spectral Tilt',
      value: latestResult?.extracted_features.cqcc_tilt,
      icon: Waves,
      desc: 'Constant Q Cepstral Coefficients',
      threshold: 0.2,
    },
    {
      label: 'Pitch Consistency',
      value: latestResult?.extracted_features.pitch_consistency,
      icon: Music2,
      desc: 'Fundamental frequency stability',
      threshold: 0.7,
    },
    {
      label: 'Spectral Flux',
      value: latestResult?.extracted_features.spectral_flux,
      icon: Zap,
      desc: 'Rate of spectral change between frames',
      threshold: 0.15,
    },
    {
      label: 'Frequency Variation',
      value: latestResult?.extracted_features.frequency_variation,
      icon: Radio,
      desc: 'Inter-frame frequency divergence',
      threshold: 0.1,
    },
  ];

  return (
    <div className="cyber-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-4 rounded-full bg-cyber-amber" />
        <h3 className="text-sm font-semibold text-cyber-text-bright">Extracted Audio Features</h3>
        <span className="text-xs font-mono text-cyber-text-dim ml-auto">REAL-TIME</span>
      </div>

      <div className="space-y-3">
        {features.map((f, i) => {
          const val = f.value;
          const hasValue = val !== undefined && val !== null;
          const display = hasValue ? val!.toFixed(3) : '---';
          const isAnomalous = hasValue && Math.abs(val!) > f.threshold;
          const barPct = hasValue ? Math.min(100, Math.abs(val!) * 100) : 0;

          return (
            <div key={i} className="p-3 rounded-lg bg-cyber-bg/40 border border-cyber-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <f.icon className={`w-4 h-4 ${isAnomalous ? 'text-cyber-red' : 'text-cyber-green'}`} />
                  <span className="text-xs font-medium text-cyber-text">{f.label}</span>
                </div>
                <span className={`text-sm font-mono font-semibold ${isAnomalous ? 'text-cyber-red text-glow-red' : 'text-cyber-green text-glow-green'}`}>
                  {display}
                </span>
              </div>
              <div className="text-[10px] text-cyber-text-dim mb-1.5">{f.desc}</div>
              <div className="h-1.5 bg-cyber-surface rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isAnomalous ? 'bg-cyber-red' : 'bg-cyber-green'
                  }`}
                  style={{ width: `${barPct}%`, opacity: 0.7 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {latestResult && (
        <div className="mt-4 pt-3 border-t border-cyber-border flex items-center justify-between">
          <span className="text-xs text-cyber-text-dim">AI Verdict:</span>
          <span className={`text-sm font-mono font-bold ${latestResult.is_cloned ? 'text-cyber-red text-glow-red' : 'text-cyber-green text-glow-green'}`}>
            {latestResult.is_cloned ? '⚠ VOICE CLONED' : '✓ AUTHENTIC VOICE'}
          </span>
        </div>
      )}
    </div>
  );
}

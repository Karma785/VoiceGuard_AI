import { AudioLines, Scissors, Binary, BrainCircuit, AlertTriangle, ChevronRight } from 'lucide-react';

const stages = [
  { icon: AudioLines, label: 'Incoming Audio', sub: 'Live call stream', color: 'blue' },
  { icon: Scissors, label: '1s Chunking', sub: 'Audio segmentation', color: 'amber' },
  { icon: Binary, label: 'Binary WebSocket', sub: 'Real-time transport', color: 'green' },
  { icon: BrainCircuit, label: 'MFCC / CQCC AI', sub: 'Feature extraction', color: 'green' },
  { icon: AlertTriangle, label: 'Threat Alert', sub: 'User notification', color: 'red' },
];

const colorMap: Record<string, { text: string; border: string; bg: string; glow: string }> = {
  blue: { text: 'text-cyber-blue', border: 'border-cyber-blue/40', bg: 'bg-cyber-blue/10', glow: 'glow-blue' },
  amber: { text: 'text-cyber-amber', border: 'border-cyber-amber/40', bg: 'bg-cyber-amber/10', glow: 'glow-amber' },
  green: { text: 'text-cyber-green', border: 'border-cyber-green/40', bg: 'bg-cyber-green/10', glow: 'glow-green' },
  red: { text: 'text-cyber-red', border: 'border-cyber-red/40', bg: 'bg-cyber-red/10', glow: 'glow-red' },
};

export default function PipelineDiagram({ activeStage = -1 }: { activeStage?: number }) {
  return (
    <div className="cyber-card p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-4 rounded-full bg-cyber-green" />
        <h3 className="text-sm font-semibold text-cyber-text-bright">Detection Pipeline</h3>
        <span className="text-xs font-mono text-cyber-text-dim ml-auto">REAL-TIME FLOW</span>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-2">
        {stages.map((stage, i) => {
          const c = colorMap[stage.color];
          const isActive = activeStage >= 0 && i <= activeStage;
          return (
            <div key={i} className="flex items-center flex-shrink-0">
              <div
                className={`flex flex-col items-center gap-1.5 px-2 sm:px-3 py-2.5 rounded-lg border transition-all duration-300 ${
                  isActive
                    ? `${c.bg} ${c.border} ${c.glow}`
                    : 'bg-cyber-surface border-cyber-border'
                }`}
              >
                <stage.icon
                  className={`w-5 h-5 sm:w-6 sm:h-6 ${isActive ? c.text : 'text-cyber-text-dim'}`}
                />
                <div className="text-center">
                  <div className={`text-[10px] sm:text-xs font-semibold ${isActive ? c.text : 'text-cyber-text-dim'}`}>
                    {stage.label}
                  </div>
                  <div className="text-[9px] text-cyber-text-dim hidden sm:block">
                    {stage.sub}
                  </div>
                </div>
              </div>
              {i < stages.length - 1 && (
                <ChevronRight
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 mx-0.5 flex-shrink-0 ${
                    isActive ? c.text : 'text-cyber-text-dim'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

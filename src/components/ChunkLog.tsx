import { useEffect, useRef } from 'react';
import { Send, BrainCircuit, CheckCircle2, Loader2 } from 'lucide-react';
import type { ChunkLog as ChunkLogType } from '@/types';

interface ChunkLogProps {
  logs: ChunkLogType[];
}

export default function ChunkLog({ logs }: ChunkLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getIcon = (status: string) => {
    switch (status) {
      case 'sending':
        return <Send className="w-3.5 h-3.5 text-cyber-blue" />;
      case 'analyzing':
        return <BrainCircuit className="w-3.5 h-3.5 text-cyber-amber animate-pulse" />;
      case 'complete':
        return <CheckCircle2 className="w-3.5 h-3.5 text-cyber-green" />;
      default:
        return <Loader2 className="w-3.5 h-3.5 text-cyber-text-dim" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sending':
        return 'Converting chunk to binary and sending via WebSocket...';
      case 'analyzing':
        return 'AI analyzing MFCC + CQCC features...';
      case 'complete':
        return 'Analysis complete — result received';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className="cyber-card p-4 flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-cyber-blue" />
          <h3 className="text-sm font-semibold text-cyber-text-bright">Chunk Transmission Log</h3>
        </div>
        <span className="text-xs font-mono text-cyber-text-dim">{logs.length} chunks</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1.5 min-h-0 pr-1">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full py-8">
            <span className="text-xs text-cyber-text-dim font-mono">No chunks transmitted yet</span>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-2 p-2 rounded-lg bg-cyber-bg/40 border border-cyber-border animate-slide-in-right"
            >
              <div className="flex-shrink-0 mt-0.5">{getIcon(log.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-cyber-text-bright">
                    chunk_{String(log.chunk_index).padStart(4, '0')}
                  </span>
                  <span className="text-[10px] font-mono text-cyber-text-dim">
                    {log.bytes} bytes
                  </span>
                </div>
                <div className="text-[11px] text-cyber-text-dim truncate">
                  {getStatusText(log.status)}
                </div>
                {log.result && (
                  <div className="flex items-center gap-3 mt-1 text-[10px] font-mono">
                    <span className={log.result.is_cloned ? 'text-cyber-red' : 'text-cyber-green'}>
                      {log.result.is_cloned ? 'CLONED' : 'AUTHENTIC'}
                    </span>
                    <span className="text-cyber-text-dim">
                      {log.result.confidence_score}%
                    </span>
                    <span className="text-cyber-text-dim">
                      MFCC:{log.result.extracted_features.mfcc_deviation}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-[9px] font-mono text-cyber-text-dim flex-shrink-0 mt-1">
                {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

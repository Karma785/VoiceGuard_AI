import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CallSession } from '@/types';
import { Phone, PhoneOff, ShieldCheck, AlertTriangle, Clock } from 'lucide-react';

export default function CallHistory({ refreshTrigger }: { refreshTrigger: number }) {
  const [sessions, setSessions] = useState<CallSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('call_sessions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);
      if (!cancelled && data) {
        setSessions(data as CallSession[]);
      }
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [refreshTrigger]);

  const getVerdictIcon = (verdict: string, status: string) => {
    if (status === 'blocked') return <PhoneOff className="w-3.5 h-3.5 text-cyber-red" />;
    if (verdict === 'deepfake') return <AlertTriangle className="w-3.5 h-3.5 text-cyber-red" />;
    if (verdict === 'authentic') return <ShieldCheck className="w-3.5 h-3.5 text-cyber-green" />;
    return <Phone className="w-3.5 h-3.5 text-cyber-text-dim" />;
  };

  const getVerdictColor = (verdict: string, status: string) => {
    if (status === 'blocked') return 'text-cyber-red';
    if (verdict === 'deepfake') return 'text-cyber-red';
    if (verdict === 'authentic') return 'text-cyber-green';
    return 'text-cyber-text-dim';
  };

  return (
    <div className="cyber-card p-4 flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-cyber-text-dim" />
          <h3 className="text-sm font-semibold text-cyber-text-bright">Call History</h3>
        </div>
        <span className="text-xs font-mono text-cyber-text-dim">{sessions.length} records</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
        {loading ? (
          <div className="flex items-center justify-center h-full py-8">
            <span className="text-xs text-cyber-text-dim font-mono">Loading...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex items-center justify-center h-full py-8">
            <span className="text-xs text-cyber-text-dim font-mono">No call history yet</span>
          </div>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              className="p-3 rounded-lg bg-cyber-bg/40 border border-cyber-border hover:border-cyber-border-bright transition-colors"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {getVerdictIcon(s.final_verdict, s.status)}
                  <span className="text-xs font-medium text-cyber-text-bright">{s.caller_name}</span>
                </div>
                <span className={`text-[10px] font-mono uppercase ${getVerdictColor(s.final_verdict, s.status)}`}>
                  {s.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-cyber-text-dim">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(s.started_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <div className="flex items-center gap-3">
                  <span>{s.total_chunks} chunks</span>
                  <span className={s.max_risk_score > 75 ? 'text-cyber-red' : s.max_risk_score > 40 ? 'text-cyber-amber' : 'text-cyber-green'}>
                    {Number(s.max_risk_score).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

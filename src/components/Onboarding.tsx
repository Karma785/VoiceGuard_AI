import { useState, useEffect } from 'react';
import { Shield, ShieldCheck, AudioLines, Radio, ArrowRight, Lock, Zap, Eye } from 'lucide-react';

interface OnboardingProps {
  onPermissionGranted: () => void;
}

export default function Onboarding({ onPermissionGranted }: OnboardingProps) {
  const [permissionActive, setPermissionActive] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimating(true), 200);
    return () => clearTimeout(t);
  }, []);

  const handleToggle = () => {
    const next = !permissionActive;
    setPermissionActive(next);
    if (next) {
      setShowGuide(true);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-bg grid-bg flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyber-green/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyber-blue/5 rounded-full blur-3xl" />
      </div>

      <div className={`relative w-full max-w-2xl transition-all duration-700 ${animating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-cyber-card border border-cyber-green/30 glow-green mb-4">
            <Shield className="w-10 h-10 text-cyber-green" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-cyber-text-bright mb-2">
            VoiceGuard <span className="text-cyber-green text-glow-green">AI</span>
          </h1>
          <p className="text-cyber-text-dim text-sm">
            Real-Time Deepfake Voice Detection &amp; Prevention System
          </p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-xs font-mono text-cyber-text-dim px-2 py-1 rounded bg-cyber-surface border border-cyber-border">
              SIH26104
            </span>
            <span className="text-xs font-mono text-cyber-text-dim px-2 py-1 rounded bg-cyber-surface border border-cyber-border">
              v1.0.0
            </span>
          </div>
        </div>

        <div className="cyber-card-bright p-6 sm:p-8 scan-overlay">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-cyber-surface border border-cyber-border flex items-center justify-center">
              <Lock className="w-6 h-6 text-cyber-amber" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-cyber-text-bright mb-1">
                Accessibility Service Permission
              </h2>
              <p className="text-sm text-cyber-text-dim leading-relaxed">
                VoiceGuard requires accessibility access to securely capture background incoming audio streams during calls for real-time deepfake analysis.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-cyber-surface border border-cyber-border mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${permissionActive ? 'bg-cyber-green animate-pulse-glow text-cyber-green' : 'bg-cyber-text-dim'}`} />
              <span className={`font-mono text-sm ${permissionActive ? 'text-cyber-green text-glow-green' : 'text-cyber-text-dim'}`}>
                {permissionActive ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            <button
              onClick={handleToggle}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                permissionActive ? 'bg-cyber-green/30 border border-cyber-green' : 'bg-cyber-border border border-cyber-border-bright'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full transition-all duration-300 flex items-center justify-center ${
                  permissionActive
                    ? 'translate-x-7 bg-cyber-green glow-green'
                    : 'bg-cyber-text-dim'
                }`}
              >
                {permissionActive && <ShieldCheck className="w-3.5 h-3.5 text-cyber-bg" />}
              </span>
            </button>
          </div>

          {showGuide && (
            <div className="animate-slide-up space-y-3 mb-6">
              <div className="flex items-center gap-2 text-xs font-mono text-cyber-green text-glow-green uppercase tracking-wider">
                <Eye className="w-3.5 h-3.5" />
                Permission Guide
              </div>
              <div className="space-y-2.5">
                {[
                  { icon: AudioLines, text: 'Captures incoming audio from calls in real-time', color: 'text-cyber-blue' },
                  { icon: Radio, text: 'Streams 1-second audio chunks to AI analysis engine', color: 'text-cyber-amber' },
                  { icon: Zap, text: 'Triggers instant alerts when deepfake voice is detected', color: 'text-cyber-green' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg bg-cyber-bg/50 border border-cyber-border animate-slide-up"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <item.icon className={`w-4 h-4 ${item.color} flex-shrink-0`} />
                    <span className="text-sm text-cyber-text">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onPermissionGranted}
            disabled={!permissionActive}
            className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
              permissionActive
                ? 'bg-cyber-green/15 border border-cyber-green text-cyber-green hover:bg-cyber-green/25 glow-green'
                : 'bg-cyber-surface border border-cyber-border text-cyber-text-dim cursor-not-allowed'
            }`}
          >
            {permissionActive ? (
              <>
                Enter Dashboard
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              'Enable Permission to Continue'
            )}
          </button>
        </div>

        <div className="flex items-center justify-center gap-6 mt-6 text-xs font-mono text-cyber-text-dim">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-pulse" />
            SYSTEM READY
          </span>
          <span>•</span>
          <span>MFCC + CQCC ENGINE</span>
          <span>•</span>
          <span>WEBSOCKET ENABLED</span>
        </div>
      </div>
    </div>
  );
}

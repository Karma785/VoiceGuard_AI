import { useRef, useState, useCallback } from 'react';
import { Phone, PhoneOff, Upload, Play, Pause, X, FileAudio, Loader2 } from 'lucide-react';
import WaveformVisualizer from './WaveformVisualizer';

interface CallSimulatorProps {
  isCallActive: boolean;
  callDuration: number;
  callerName: string;
  phoneNumber: string;
  onStart: () => void;
  onEnd: () => void;
  chunkCount: number;
  onFileUploaded: (file: File) => void;
  uploadedFileName: string | null;
  waveformPeaks: number[] | null;
  isAnalyzing: boolean;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ACCEPTED_TYPES = '.wav,.mp3,.mp4,audio/wav,audio/mpeg,audio/mp4,audio/x-m4a';

export default function CallSimulator({
  isCallActive,
  callDuration,
  callerName,
  phoneNumber,
  onStart,
  onEnd,
  chunkCount,
  onFileUploaded,
  uploadedFileName,
  waveformPeaks,
  isAnalyzing,
}: CallSimulatorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleFile = useCallback((file: File) => {
    const ext = file.name.toLowerCase().split('.').pop();
    if (!['wav', 'mp3', 'mp4', 'm4a'].includes(ext || '')) {
      return;
    }
    onFileUploaded(file);
    setIsPlaying(false);
    setPlayProgress(0);
  }, [onFileUploaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * audioDuration;
    setPlayProgress(pct * 100);
  };

  const handleClearFile = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setPlayProgress(0);
    setAudioDuration(0);
    onFileUploaded(null as any);
  };

  return (
    <div className="cyber-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-cyber-green" />
          <h3 className="text-sm font-semibold text-cyber-text-bright">Call Simulator</h3>
        </div>
        <div className="flex items-center gap-2">
          {isCallActive ? (
            <span className="flex items-center gap-1.5 text-xs font-mono text-cyber-green text-glow-green">
              <span className="w-2 h-2 rounded-full bg-cyber-green animate-pulse-glow" />
              LIVE
            </span>
          ) : isAnalyzing ? (
            <span className="flex items-center gap-1.5 text-xs font-mono text-cyber-amber text-glow-amber">
              <Loader2 className="w-3 h-3 animate-spin" />
              ANALYZING
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-mono text-cyber-text-dim">
              <span className="w-2 h-2 rounded-full bg-cyber-text-dim" />
              IDLE
            </span>
          )}
        </div>
      </div>

      {/* File Upload Section */}
      <div className="mb-4">
        <div className="text-[10px] font-mono text-cyber-text-dim mb-1.5 uppercase tracking-wider">
          Audio File Upload
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileChange}
          className="hidden"
        />
        {!uploadedFileName ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={handleBrowse}
            className={`cursor-pointer rounded-lg border-2 border-dashed transition-all p-4 text-center ${
              isDragging
                ? 'border-cyber-green bg-cyber-green/10 glow-green'
                : 'border-cyber-border bg-cyber-bg/40 hover:border-cyber-green/50 hover:bg-cyber-bg/60'
            }`}
          >
            <div className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isDragging ? 'bg-cyber-green/20' : 'bg-cyber-surface border border-cyber-border'
              }`}>
                <Upload className={`w-5 h-5 ${isDragging ? 'text-cyber-green' : 'text-cyber-text-dim'}`} />
              </div>
              <div className="text-xs text-cyber-text">
                {isDragging ? 'Drop audio file here' : 'Drag & drop or click to browse'}
              </div>
              <div className="text-[10px] font-mono text-cyber-text-dim">
                Supports .WAV, .MP3, .MP4
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-cyber-green/30 bg-cyber-bg/40 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyber-green/10 border border-cyber-green/30 flex items-center justify-center flex-shrink-0">
                <FileAudio className="w-4 h-4 text-cyber-green" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-cyber-text-bright truncate">{uploadedFileName}</div>
                <div className="text-[10px] font-mono text-cyber-text-dim">
                  {audioDuration > 0 ? `${formatDuration(Math.floor(audioDuration))} ` : ''}
                  Ready for analysis
                </div>
              </div>
              <button
                onClick={handleClearFile}
                className="p-1 rounded text-cyber-text-dim hover:text-cyber-red transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Audio element for playback */}
            <audio
              ref={audioRef}
              onLoadedMetadata={(e) => {
                const el = e.currentTarget;
                setAudioDuration(el.duration);
                audioRef.current = el;
              }}
              onTimeUpdate={(e) => {
                const el = e.currentTarget;
                if (el.duration) {
                  setPlayProgress((el.currentTime / el.duration) * 100);
                }
              }}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />

            {/* Playback controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlayPause}
                className="w-9 h-9 rounded-full bg-cyber-green/15 border border-cyber-green/40 text-cyber-green flex items-center justify-center hover:bg-cyber-green/25 transition-all flex-shrink-0"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <div
                onClick={handleSeek}
                className="flex-1 h-1.5 bg-cyber-surface rounded-full overflow-hidden cursor-pointer"
              >
                <div
                  className="h-full bg-cyber-green rounded-full transition-all"
                  style={{ width: `${playProgress}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-cyber-text-dim flex-shrink-0">
                {audioDuration > 0 ? formatDuration(Math.floor(audioDuration)) : '--:--'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Caller info */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-cyber-bg/40 border border-cyber-border mb-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          isCallActive ? 'bg-cyber-green/10 border border-cyber-green/40' : 'bg-cyber-surface border border-cyber-border'
        }`}>
          <Phone className={`w-5 h-5 ${isCallActive ? 'text-cyber-green' : 'text-cyber-text-dim'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-cyber-text-bright truncate">{callerName}</div>
          <div className="text-xs font-mono text-cyber-text-dim">{phoneNumber}</div>
        </div>
        {isCallActive && (
          <div className="text-right flex-shrink-0">
            <div className="text-lg font-mono font-semibold text-cyber-green text-glow-green">
              {formatDuration(callDuration)}
            </div>
            <div className="text-[10px] font-mono text-cyber-text-dim">{chunkCount} chunks</div>
          </div>
        )}
      </div>

      {/* Waveform */}
      <div className="mb-4">
        <div className="text-[10px] font-mono text-cyber-text-dim mb-1.5 uppercase tracking-wider">
          Audio Waveform
        </div>
        <WaveformVisualizer
          isActive={isCallActive}
          waveformPeaks={waveformPeaks}
          audioElement={audioRef.current}
          isPlaying={isPlaying}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {!isCallActive ? (
          <button
            onClick={onStart}
            disabled={isAnalyzing}
            className="flex-1 py-3 rounded-xl bg-cyber-green/15 border border-cyber-green text-cyber-green font-semibold text-sm hover:bg-cyber-green/25 transition-all flex items-center justify-center gap-2 glow-green disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Phone className="w-4 h-4" />
            Simulate Incoming Call
          </button>
        ) : (
          <button
            onClick={onEnd}
            className="flex-1 py-3 rounded-xl bg-cyber-red/15 border border-cyber-red text-cyber-red font-semibold text-sm hover:bg-cyber-red/25 transition-all flex items-center justify-center gap-2 glow-red"
          >
            <PhoneOff className="w-4 h-4" />
            End Call
          </button>
        )}
      </div>
    </div>
  );
}

export interface DetectionResult {
  is_cloned: boolean;
  confidence_score: number;
  extracted_features: {
    mfcc_deviation: number;
    cqcc_tilt: number;
    pitch_consistency: number;
    spectral_flux: number;
    frequency_variation: number;
  };
  chunk_index: number;
  timestamp: number;
}

export interface CallSession {
  id: string;
  caller_name: string;
  phone_number: string;
  status: 'active' | 'blocked' | 'ignored' | 'completed';
  started_at: string;
  ended_at: string | null;
  max_risk_score: number;
  total_chunks: number;
  final_verdict: 'authentic' | 'deepfake' | 'inconclusive';
  action_taken: string | null;
}

export interface ChunkLog {
  id: string;
  chunk_index: number;
  timestamp: number;
  status: 'sending' | 'analyzing' | 'complete';
  result?: DetectionResult;
  bytes: number;
}

export type RiskLevel = 'safe' | 'caution' | 'high' | 'critical';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export type ScreenState = 'onboarding' | 'dashboard';

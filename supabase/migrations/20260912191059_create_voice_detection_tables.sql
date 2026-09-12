/*
# Voice Clone Detection - Call Sessions & Detection Chunks

1. New Tables
- `call_sessions`: stores each simulated call session with its outcome
  - `id` (uuid, primary key)
  - `caller_name` (text, the simulated caller identity)
  - `phone_number` (text, fake phone number for display)
  - `status` (text: 'active' | 'blocked' | 'ignored' | 'completed')
  - `started_at` (timestamptz, when the call began)
  - `ended_at` (timestamptz, when the call ended, nullable)
  - `max_risk_score` (numeric, highest deepfake confidence reached during the call)
  - `total_chunks` (integer, number of 1-second audio chunks analyzed)
  - `final_verdict` (text: 'authentic' | 'deepfake' | 'inconclusive')
  - `action_taken` (text, nullable: 'blocked' | 'reported' | 'ignored')
- `detection_chunks`: stores per-second AI analysis results for each call
  - `id` (uuid, primary key)
  - `session_id` (uuid, FK to call_sessions)
  - `chunk_index` (integer, sequential chunk number)
  - `is_cloned` (boolean, AI verdict for this chunk)
  - `confidence_score` (numeric, 0-100)
  - `mfcc_deviation` (numeric, MFCC feature deviation)
  - `cqcc_tilt` (numeric, CQCC spectral tilt)
  - `pitch_consistency` (numeric, pitch consistency score)
  - `created_at` (timestamptz)
2. Security
- Enable RLS on both tables.
- Allow anon + authenticated CRUD (single-tenant demo, no sign-in).
*/

CREATE TABLE IF NOT EXISTS call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_name text NOT NULL DEFAULT 'Unknown Caller',
  phone_number text NOT NULL DEFAULT '+91 00000 00000',
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  max_risk_score numeric DEFAULT 0,
  total_chunks integer DEFAULT 0,
  final_verdict text DEFAULT 'inconclusive',
  action_taken text
);

ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_call_sessions" ON call_sessions;
CREATE POLICY "anon_select_call_sessions" ON call_sessions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_call_sessions" ON call_sessions;
CREATE POLICY "anon_insert_call_sessions" ON call_sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_call_sessions" ON call_sessions;
CREATE POLICY "anon_update_call_sessions" ON call_sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_call_sessions" ON call_sessions;
CREATE POLICY "anon_delete_call_sessions" ON call_sessions FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS detection_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  is_cloned boolean NOT NULL DEFAULT false,
  confidence_score numeric NOT NULL DEFAULT 0,
  mfcc_deviation numeric NOT NULL DEFAULT 0,
  cqcc_tilt numeric NOT NULL DEFAULT 0,
  pitch_consistency numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE detection_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_detection_chunks" ON detection_chunks;
CREATE POLICY "anon_select_detection_chunks" ON detection_chunks FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_detection_chunks" ON detection_chunks;
CREATE POLICY "anon_insert_detection_chunks" ON detection_chunks FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_detection_chunks" ON detection_chunks;
CREATE POLICY "anon_update_detection_chunks" ON detection_chunks FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_detection_chunks" ON detection_chunks;
CREATE POLICY "anon_delete_detection_chunks" ON detection_chunks FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_detection_chunks_session_id ON detection_chunks(session_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_started_at ON call_sessions(started_at DESC);

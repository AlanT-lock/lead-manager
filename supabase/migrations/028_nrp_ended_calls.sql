-- Appels NRP déjà terminés (ended reçu) : évite de créer un pending quand in-progress arrive après ended (ordre webhook).
CREATE TABLE IF NOT EXISTS nrp_ended_calls (
  call_id TEXT PRIMARY KEY,
  ended_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nrp_ended_calls_ended_at ON nrp_ended_calls(ended_at);
ALTER TABLE nrp_ended_calls ENABLE ROW LEVEL SECURITY;

-- File d'attente pour transfert NRP : on ne transfère qu'après un délai (ex. 10s)
-- pour laisser la détection de messagerie vocale annuler l'appel avant.
CREATE TABLE IF NOT EXISTS nrp_pending_transfers (
  call_id TEXT PRIMARY KEY,
  batch_id UUID NOT NULL,
  telepro_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  control_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nrp_pending_transfers_created_at ON nrp_pending_transfers(created_at);

ALTER TABLE nrp_pending_transfers ENABLE ROW LEVEL SECURITY;

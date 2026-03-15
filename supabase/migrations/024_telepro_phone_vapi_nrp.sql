-- Numéro de téléphone des télépros (où les appeler pour le transfert NRP)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Config Vapi par télépro (assistant + numéro Twilio + message d'attente)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vapi_assistant_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vapi_phone_number_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vapi_hold_message TEXT;

-- Batch d'appels NRP : 2 appels en parallèle par télépro (on stocke 1 ligne par appel)
CREATE TABLE IF NOT EXISTS nrp_call_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL,
  telepro_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  call_id TEXT NOT NULL,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  control_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nrp_call_batches_call_id ON nrp_call_batches(call_id);
CREATE INDEX IF NOT EXISTS idx_nrp_call_batches_batch_id ON nrp_call_batches(batch_id);
CREATE INDEX IF NOT EXISTS idx_nrp_call_batches_telepro_id ON nrp_call_batches(telepro_id);

-- Une fois qu'un lead décroche, on notifie le télépro pour ouvrir la fiche (polling)
CREATE TABLE IF NOT EXISTS telepro_pending_lead_opens (
  telepro_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS : accès uniquement via service role (backend). Aucune policy = aucun accès pour les clients front.
ALTER TABLE nrp_call_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE telepro_pending_lead_opens ENABLE ROW LEVEL SECURITY;

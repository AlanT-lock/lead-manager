-- Date du dernier appel NRP via l'agent IA (pour prioriser les leads NRP à appeler)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_nrp_ai_call_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_leads_last_nrp_ai_call_at ON leads(last_nrp_ai_call_at NULLS FIRST);

-- Permettre lead_id NULL dans telepro_pending_lead_opens (utilisé pour signaler "personne n'a répondu")
ALTER TABLE telepro_pending_lead_opens ALTER COLUMN lead_id DROP NOT NULL;

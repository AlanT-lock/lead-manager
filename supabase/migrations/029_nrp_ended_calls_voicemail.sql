-- Optionnel : marquer les appels tombés sur messagerie (analytics / double-check).
ALTER TABLE nrp_ended_calls ADD COLUMN IF NOT EXISTS is_voicemail BOOLEAN DEFAULT false;

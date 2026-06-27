-- Numéro Twilio pour les appels NRP (inbound: quel numéro appartient à quel télépro)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twilio_phone_number TEXT;

COMMENT ON COLUMN profiles.twilio_phone_number IS 'Numéro Twilio E.164 (ex: +33612345678) pour ce télépro (appels entrants).';

-- Voix TTS Twilio (Say) par télépro : ex. Polly.Mathieu, Polly.Celine
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twilio_say_voice TEXT;
COMMENT ON COLUMN profiles.twilio_say_voice IS 'Voix Twilio pour les messages (Say), ex. Polly.Mathieu, Polly.Celine. Si vide, utilise TWILIO_SAY_VOICE ou Polly.Mathieu.';

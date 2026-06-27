-- Voix de l'agent (2-3 choix français) et message audio optionnel
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vapi_voice_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_message_audio_url TEXT;

-- Valeurs possibles pour vapi_voice_id (11labs, français) : charlotte, alice, rachel

-- Bucket pour les messages audio des agents NRP (public pour que Vapi puisse les lire)
INSERT INTO storage.buckets (id, name, public) VALUES ('agent-audio', 'agent-audio', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can upload agent-audio" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'agent-audio' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Public read agent-audio" ON storage.objects FOR SELECT
  USING (bucket_id = 'agent-audio');

CREATE POLICY "Admins can update agent-audio" ON storage.objects FOR UPDATE
  USING (bucket_id = 'agent-audio' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete agent-audio" ON storage.objects FOR DELETE
  USING (bucket_id = 'agent-audio' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

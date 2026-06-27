CREATE TABLE IF NOT EXISTS rappels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  callback_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rappels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on rappels"
  ON rappels
  FOR ALL
  USING (true)
  WITH CHECK (true);

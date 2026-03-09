-- Table code_courrier pour le suivi des codes courrier (espace secrétaire)
CREATE TABLE IF NOT EXISTS code_courrier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  nrp_count INTEGER NOT NULL DEFAULT 0,
  callback_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE code_courrier ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on code_courrier"
  ON code_courrier
  FOR ALL
  USING (true)
  WITH CHECK (true);

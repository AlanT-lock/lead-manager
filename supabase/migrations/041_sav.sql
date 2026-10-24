-- Rubrique SAV : demandes de service après-vente, indépendantes des leads.
-- Alimentée par le formulaire public (/demande-sav) et par les espaces admin/secrétaire.
CREATE TABLE IF NOT EXISTS sav_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  problem_type TEXT NOT NULL,
  description TEXT NOT NULL,
  photos TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'a_traiter'
    CHECK (status IN ('a_traiter', 'resolu', 'a_reprogrammer', 'absent')),
  rescheduled_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'client' CHECK (source IN ('client', 'interne')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sav_requests_created_at_idx ON sav_requests (created_at DESC);

-- RLS activée SANS politique : la table contient des données personnelles et le
-- formulaire est public. Tout passe par les routes API (service role, RLS contournée) ;
-- la clé anon ne doit rien pouvoir lire ni écrire directement.
ALTER TABLE sav_requests ENABLE ROW LEVEL SECURITY;

-- Photos : bucket privé, lecture par URLs signées générées côté serveur.
INSERT INTO storage.buckets (id, name, public)
VALUES ('sav-photos', 'sav-photos', false)
ON CONFLICT (id) DO NOTHING;

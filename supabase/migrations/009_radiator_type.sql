-- Type de radiateur (multi-sélection : Fonte, Acier, Plancher chauffant)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS radiator_type TEXT[] DEFAULT '{}';

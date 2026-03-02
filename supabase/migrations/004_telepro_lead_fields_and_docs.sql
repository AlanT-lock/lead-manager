-- Nouveaux champs lead (télépro)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS surface_m2 DECIMAL(10,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS revenu_fiscal_ref DECIMAL(12,2);

-- Nouveaux types de documents (télépro : taxe foncière, avis d'imposition)
ALTER TYPE document_type ADD VALUE 'taxe_fonciere';
ALTER TYPE document_type ADD VALUE 'avis_imposition';

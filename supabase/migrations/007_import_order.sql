-- Colonne pour préserver l'ordre exact d'import (position dans le fichier CSV)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS import_order INTEGER;

CREATE INDEX IF NOT EXISTS idx_leads_import_order ON leads(import_order) WHERE import_order IS NOT NULL;

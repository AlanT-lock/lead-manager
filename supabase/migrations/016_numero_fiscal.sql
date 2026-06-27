-- Numéro fiscal du lead
ALTER TABLE leads ADD COLUMN IF NOT EXISTS numero_fiscal TEXT;

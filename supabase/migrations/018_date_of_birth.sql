-- Date de naissance du lead
ALTER TABLE leads ADD COLUMN IF NOT EXISTS date_of_birth DATE;

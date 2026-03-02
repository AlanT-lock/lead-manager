-- Bénéfice apporteur d'affaires (section finance)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS benefit_apporteur_affaires DECIMAL(12,2);

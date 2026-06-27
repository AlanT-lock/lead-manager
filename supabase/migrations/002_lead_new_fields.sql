-- Type d'électricité
CREATE TYPE electricity_type AS ENUM ('monophase', 'triphase');

-- Ajouter SSC et Ballon solaire au type installation
ALTER TYPE installation_type ADD VALUE 'ssc';
ALTER TYPE installation_type ADD VALUE 'ballon_solaire';

-- Nouveaux champs sur leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS electricity_type electricity_type;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS commentaire TEXT;

-- Nouveaux statuts : Incomplet, Bloqué MPR, Validé
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'incomplet' AFTER 'documents_recus';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'bloque_mpr' AFTER 'incomplet';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'valide' AFTER 'bloque_mpr';

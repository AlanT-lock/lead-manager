-- Colonne date d'ajout = date du premier log (import CSV, création manuelle, etc.)
-- Utilise le premier log de chaque lead, quel que soit le statut (nouveau, nrp, etc.)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS added_at TIMESTAMPTZ;

-- Backfill: pour chaque lead, utiliser la date du premier log ou created_at si aucun log
UPDATE leads l
SET added_at = COALESCE(
  (SELECT MIN(ll.created_at) FROM lead_logs ll WHERE ll.lead_id = l.id),
  l.created_at
)
WHERE added_at IS NULL;

-- Trigger: à l'insertion du premier log, définir added_at si pas encore défini
CREATE OR REPLACE FUNCTION set_lead_added_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE leads
  SET added_at = NEW.created_at
  WHERE id = NEW.lead_id AND added_at IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_lead_log_insert_set_added_at ON lead_logs;
CREATE TRIGGER on_lead_log_insert_set_added_at
  AFTER INSERT ON lead_logs
  FOR EACH ROW EXECUTE FUNCTION set_lead_added_at();

CREATE INDEX IF NOT EXISTS idx_leads_added_at ON leads(added_at);

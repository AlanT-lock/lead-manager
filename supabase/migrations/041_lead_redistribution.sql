-- Redistribution de leads (admin uniquement)
--
-- Principe : l'admin choisit un lot de leads (ex. les 50 derniers NRP de chaque
-- télépro), ils sont mélangés puis répartis entre les télépros, sans jamais
-- revenir à un télépro qui a déjà eu le lead.
--
-- Côté télépro, un lead redistribué doit ressembler à un lead neuf : statut
-- « Nouveau » et date d'ajout = date de la redistribution. Côté admin, la vraie
-- date (created_at / added_at) et tout l'historique sont conservés.

-- 1. Date d'ajout vue par le télépro : date à laquelle le lead lui a été attribué.
--    Les colonnes created_at / added_at restent la vraie date, lue par l'admin.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS telepro_added_at TIMESTAMPTZ;
UPDATE leads SET telepro_added_at = COALESCE(added_at, created_at) WHERE telepro_added_at IS NULL;
ALTER TABLE leads ALTER COLUMN telepro_added_at SET DEFAULT NOW();
ALTER TABLE leads ALTER COLUMN telepro_added_at SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_assigned_telepro_added_at ON leads(assigned_to, telepro_added_at DESC);

-- 2. Une ligne par redistribution lancée (le « lot »), avec les filtres utilisés.
CREATE TABLE IF NOT EXISTS lead_redistributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  lead_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Une ligne par lead redistribué : qui l'avait, qui le reçoit, et l'état du
--    lead juste avant sa remise à zéro (traçabilité complète pour l'admin).
CREATE TABLE IF NOT EXISTS lead_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  redistribution_id UUID NOT NULL REFERENCES lead_redistributions(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  from_telepro UUID REFERENCES profiles(id) ON DELETE SET NULL,
  to_telepro UUID REFERENCES profiles(id) ON DELETE SET NULL,
  previous_status lead_status,
  previous_nrp_count INTEGER,
  previous_callback_at TIMESTAMPTZ,
  previous_commentaire TEXT,
  previous_telepro_added_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_distributions_lead_id ON lead_distributions(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_distributions_redistribution_id ON lead_distributions(redistribution_id);

-- Accès uniquement via service role (backend admin). Aucune policy = aucun accès front.
ALTER TABLE lead_redistributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_distributions ENABLE ROW LEVEL SECURITY;

-- 4. Application atomique d'un plan de redistribution.
--    p_assignments : [{ "lead_id": uuid, "from_telepro": uuid, "to_telepro": uuid }, ...]
--    Un lead est ignoré s'il a changé de télépro entre l'aperçu et la validation,
--    ou si le télépro cible l'a déjà eu (garde-fou côté base).
--    Retourne le nombre de leads effectivement redistribués.
CREATE OR REPLACE FUNCTION apply_lead_redistribution(
  p_created_by UUID,
  p_filters JSONB,
  p_assignments JSONB
)
RETURNS TABLE (redistribution_id UUID, applied_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch_id UUID;
  v_count INTEGER := 0;
  v_item JSONB;
  v_lead leads%ROWTYPE;
  v_lead_id UUID;
  v_from UUID;
  v_to UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  INSERT INTO lead_redistributions (created_by, filters)
  VALUES (p_created_by, COALESCE(p_filters, '{}'::jsonb))
  RETURNING id INTO v_batch_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_assignments, '[]'::jsonb))
  LOOP
    v_lead_id := (v_item->>'lead_id')::UUID;
    v_from := (v_item->>'from_telepro')::UUID;
    v_to := (v_item->>'to_telepro')::UUID;

    SELECT * INTO v_lead FROM leads WHERE id = v_lead_id FOR UPDATE;
    IF NOT FOUND THEN CONTINUE; END IF;
    IF v_lead.assigned_to IS DISTINCT FROM v_from THEN CONTINUE; END IF;
    IF v_to IS NULL OR v_to = v_from THEN CONTINUE; END IF;
    IF EXISTS (
      SELECT 1 FROM lead_distributions d
      WHERE d.lead_id = v_lead_id AND (d.from_telepro = v_to OR d.to_telepro = v_to)
    ) THEN CONTINUE; END IF;

    INSERT INTO lead_distributions (
      redistribution_id, lead_id, from_telepro, to_telepro,
      previous_status, previous_nrp_count, previous_callback_at,
      previous_commentaire, previous_telepro_added_at, created_at
    ) VALUES (
      v_batch_id, v_lead_id, v_from, v_to,
      v_lead.status, v_lead.nrp_count, v_lead.callback_at,
      v_lead.commentaire, v_lead.telepro_added_at, v_now
    );

    -- Remise à zéro de ce que voit le télépro : le lead lui paraît neuf.
    UPDATE leads SET
      assigned_to = v_to,
      status = 'nouveau',
      nrp_count = 0,
      callback_at = NULL,
      commentaire = NULL,
      last_nrp_ai_call_at = NULL,
      status_changed_at = v_now,
      telepro_added_at = v_now,
      updated_at = v_now
    WHERE id = v_lead_id;

    INSERT INTO lead_logs (lead_id, user_id, action, old_status, new_status, created_at)
    VALUES (v_lead_id, p_created_by, 'redistribution', v_lead.status, 'nouveau', v_now);

    v_count := v_count + 1;
  END LOOP;

  UPDATE lead_redistributions SET lead_count = v_count WHERE id = v_batch_id;

  RETURN QUERY SELECT v_batch_id, v_count;
END;
$$;

-- Réservée au backend (service role) : jamais appelable depuis le navigateur.
REVOKE ALL ON FUNCTION apply_lead_redistribution(UUID, JSONB, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION apply_lead_redistribution(UUID, JSONB, JSONB) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION apply_lead_redistribution(UUID, JSONB, JSONB) TO service_role;

-- Catégorie de lead : Fenêtre (défaut) / Clim 1 € / Clim 3990 €
CREATE TYPE lead_category AS ENUM ('fenetre', 'clim_1euro', 'clim_3990euros');

ALTER TABLE leads
  ADD COLUMN category lead_category NOT NULL DEFAULT 'fenetre';

CREATE INDEX idx_leads_category ON leads(category);

-- Rétro-remplissage explicite de tous les leads existants (déjà couvert par le DEFAULT, idempotent)
UPDATE leads SET category = 'fenetre';

-- Ajouter Label Energie, S2EE, Econolia, ADPER, Eco Green aux options du champ délégataire
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_delegataire_group_check;
ALTER TABLE leads ADD CONSTRAINT leads_delegataire_group_check CHECK (
  delegataire_group IN (
    'Dépôt Drapo', 'Omega', 'Dast', 'Ynergie', 'Synerciel',
    'Premium', 'Eco negoce',
    'Label Energie', 'S2EE', 'Econolia', 'ADPER', 'Eco Green'
  )
);

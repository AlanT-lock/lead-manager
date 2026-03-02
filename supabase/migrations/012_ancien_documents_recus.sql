-- Nouveau statut "Ancien documents reçus" (visible admin uniquement, télépro peuvent voir mais pas sélectionner)
ALTER TYPE lead_status ADD VALUE 'ancien_documents_recus' AFTER 'documents_recus';

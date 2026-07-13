-- Nouveau statut de lead : « Transfert » (accessible par tous les rôles), avant « Annulé »
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'transfert' AFTER 'ancien_documents_recus';

-- Nouveau statut de lead : « Devis envoyé » (admin/secrétaire), après « Documents reçus »
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'devis_envoye' AFTER 'documents_recus';

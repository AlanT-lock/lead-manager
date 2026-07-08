-- Nouveau statut de lead : « Devis à envoyer » (admin/secrétaire), entre « Documents reçus » et « Devis envoyé »
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'devis_a_envoyer' AFTER 'documents_recus';

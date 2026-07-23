-- Nouveau statut de lead : « Avis 2025 bloqué » (accessible par tous les rôles), après « Bloqué MPR »
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'avis_2025_bloque' AFTER 'bloque_mpr';

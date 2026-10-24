-- Nouveau statut de lead : « Pas éligible » (accessible par tous les rôles), après « Avis 2025 bloqué »
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'pas_eligible' AFTER 'avis_2025_bloque';

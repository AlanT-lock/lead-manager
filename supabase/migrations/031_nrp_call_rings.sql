-- Enregistrement des appels NRP pour lesquels on a reçu un "ringing" (bip d'attente).
-- Si in-progress arrive sans ring → messagerie directe → on annule l'appel.
CREATE TABLE IF NOT EXISTS nrp_call_rings (
  call_id TEXT PRIMARY KEY
);

ALTER TABLE nrp_call_rings ENABLE ROW LEVEL SECURITY;

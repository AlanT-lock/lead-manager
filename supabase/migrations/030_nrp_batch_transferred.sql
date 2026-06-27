-- Un seul transfert par batch NRP : le premier appel qui "gagne" enregistre ici.
-- Les autres appels de la même batch ne doivent pas rappeler le télépro.
CREATE TABLE IF NOT EXISTS nrp_batch_transferred (
  batch_id UUID PRIMARY KEY,
  transferred_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE nrp_batch_transferred ENABLE ROW LEVEL SECURITY;

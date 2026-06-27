-- Soft delete pour les télépros (préserve l'historique des appels)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

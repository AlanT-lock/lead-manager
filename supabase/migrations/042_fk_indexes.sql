-- Index couvrants pour les clés étrangères signalées par l'advisor Supabase
-- « unindexed_foreign_keys » (lint 0001). Accélère les jointures, les
-- ON DELETE CASCADE / SET NULL et les filtres sur ces colonnes.
-- Purement additif : aucune règle d'accès ni donnée modifiée.

create index if not exists idx_code_courrier_assigned_to on public.code_courrier (assigned_to);
create index if not exists idx_import_batches_imported_by on public.import_batches (imported_by);
create index if not exists idx_lead_documents_lead_id on public.lead_documents (lead_id);
create index if not exists idx_lead_documents_uploaded_by on public.lead_documents (uploaded_by);
create index if not exists idx_lead_logs_user_id on public.lead_logs (user_id);
create index if not exists idx_nrp_call_batches_lead_id on public.nrp_call_batches (lead_id);
create index if not exists idx_nrp_pending_transfers_lead_id on public.nrp_pending_transfers (lead_id);
create index if not exists idx_nrp_pending_transfers_telepro_id on public.nrp_pending_transfers (telepro_id);
create index if not exists idx_products_supplier_id on public.products (supplier_id);
create index if not exists idx_telepro_pending_lead_opens_lead_id on public.telepro_pending_lead_opens (lead_id);

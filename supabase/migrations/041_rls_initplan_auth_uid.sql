-- Performance RLS : auth.uid() est réévalué pour CHAQUE ligne examinée.
-- Écrit (select auth.uid()), Postgres le calcule une seule fois par requête
-- (initPlan). Aucune règle d'accès ne change : seule la forme de l'expression.
-- Source : advisor Supabase « auth_rls_initplan » (lint 0003).
--
-- ALTER POLICY ne touche que l'expression : rôles et commande restent identiques.
-- À relire puis à appliquer manuellement (non appliquée automatiquement).

begin;

-- import_batches
alter policy "Admins can insert import batches" on public.import_batches
  with check (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'admin'::text));
alter policy "Admins can view import batches" on public.import_batches
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'admin'::text));
alter policy "Secretaires can insert import batches" on public.import_batches
  with check (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'secretaire'::text));
alter policy "Secretaires can view import batches" on public.import_batches
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'secretaire'::text));

-- lead_documents
alter policy "Admins can manage documents" on public.lead_documents
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'admin'::text));
alter policy "Secretaires can manage documents" on public.lead_documents
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'secretaire'::text))
  with check (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'secretaire'::text));

-- lead_logs
alter policy "Secretaires can view all lead logs" on public.lead_logs
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'secretaire'::text));
alter policy "Users can insert logs" on public.lead_logs
  with check (user_id = (select auth.uid()));
alter policy "Users can view logs of their leads" on public.lead_logs
  using (exists (
    select 1 from leads
    where leads.id = lead_logs.lead_id
      and (leads.assigned_to = (select auth.uid())
           or exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'admin'::text))
  ));

-- lead_materials
alter policy "Admins and secretaries can manage lead_materials" on public.lead_materials
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = any (array['admin'::text, 'secretaire'::text])))
  with check (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = any (array['admin'::text, 'secretaire'::text])));

-- leads
alter policy "Admins can do everything on leads" on public.leads
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'admin'::text));
alter policy "Admins can insert leads" on public.leads
  with check (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'admin'::text));
alter policy "Secretaires can do everything on leads" on public.leads
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'secretaire'::text))
  with check (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'secretaire'::text));
alter policy "Telepros can update their leads (except financial)" on public.leads
  using (assigned_to = (select auth.uid()))
  with check (assigned_to = (select auth.uid()));
alter policy "Telepros can view their leads" on public.leads
  using (assigned_to = (select auth.uid())
         or exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'admin'::text));

-- notifications
alter policy "Users can update own notifications" on public.notifications
  using (user_id = (select auth.uid()));
alter policy "Users can view own notifications" on public.notifications
  using (user_id = (select auth.uid()));

-- product_types
alter policy "Admins and secretaries can view product_types" on public.product_types
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = any (array['admin'::text, 'secretaire'::text])));
alter policy "Admins can manage product_types" on public.product_types
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'admin'::text))
  with check (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'admin'::text));
alter policy "Stockage can manage product_types" on public.product_types
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'stockage'::text))
  with check (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'stockage'::text));

-- products
alter policy "Admins and secretaries can view products" on public.products
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = any (array['admin'::text, 'secretaire'::text])));
alter policy "Admins can manage products" on public.products
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'admin'::text))
  with check (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'admin'::text));
alter policy "Stockage can manage products" on public.products
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'stockage'::text))
  with check (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'stockage'::text));

-- profiles
alter policy "Admins can insert profiles" on public.profiles
  with check (exists (select 1 from profiles profiles_1 where profiles_1.id = (select auth.uid()) and profiles_1.role = 'admin'::text));
alter policy "Admins can update profiles" on public.profiles
  using (exists (select 1 from profiles profiles_1 where profiles_1.id = (select auth.uid()) and profiles_1.role = 'admin'::text));
alter policy "Admins can view all profiles" on public.profiles
  using (exists (select 1 from profiles profiles_1 where profiles_1.id = (select auth.uid()) and profiles_1.role = 'admin'::text));
alter policy "Users can view own profile" on public.profiles
  using ((select auth.uid()) = id);

commit;

-- Compteurs du menu latéral, agrégés côté base.
-- Avant : le layout téléchargeait TOUS les leads (8744 lignes, 9 allers-retours
-- séquentiels, ~769ms) à chaque navigation pour les compter en JavaScript.
-- Ici : un GROUP BY renvoie au plus 42 lignes (3 catégories x 14 statuts) en un
-- aller-retour, et le coût cesse de croître avec la taille de la base.
--
-- p_assigned_to null   -> admin / secrétaire : tous les leads.
-- p_assigned_to fourni -> un télépro : ses leads uniquement.
--
-- Les casts ::text sont obligatoires : category et status sont des enums
-- (lead_category, lead_status), incompatibles avec « returns table (... text) ».
create or replace function lead_status_counts(p_assigned_to uuid default null)
returns table (category text, status text, count bigint)
language sql
stable
as $$
  select category::text, status::text, count(*)
  from leads
  where p_assigned_to is null or assigned_to = p_assigned_to
  group by category, status;
$$;

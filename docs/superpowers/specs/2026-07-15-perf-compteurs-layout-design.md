# Accélérer le chargement des pages : compteurs du menu latéral

Date : 2026-07-15
Statut : validé, prêt pour le plan d'implémentation

## Problème

Les pages du CRM mettent parfois très longtemps à charger. La lenteur touche toutes les
pages de l'espace `(app)`, et elle s'aggrave à mesure que la base grandit.

## Cause racine (mesurée)

`src/app/(app)/layout.tsx:62-79` télécharge **tous les leads** de la base, par tranches
de 1000 et en allers-retours séquentiels, pour calculer les compteurs du menu latéral.
Le layout s'exécutant sur chaque page, ce coût est payé à chaque navigation.

Mesures réelles contre la base de production (lecture seule, autorisée par
l'utilisateur), le 2026-07-15 :

```
TOTAL LEADS: 8744

--- Boucle compteurs du layout ---
  9 allers-retours séquentiels, 8744 lignes
  >>> TOTAL 769ms

1 page de 25 leads (travail utile) : 63ms
compteur notifications             : 54ms
1 requête profil                   : 53ms
```

Coût par navigation :

| Étape | Coût | Utile ? |
|---|---|---|
| Middleware : `getUser` + profil | ~103 ms | en double |
| Layout : `getUser` + profil | ~103 ms | en double |
| Layout : compteur notifications | ~54 ms | oui |
| **Layout : boucle des compteurs** | **769 ms** | **non** |
| Page : ses vraies données | ~123 ms | oui |
| **Total** | **~1150 ms** | |

Les deux tiers de la latence servent à calculer des badges de navigation. Le coût est
en O(nombre total de leads) : un aller-retour de plus tous les 1000 leads.

Le layout est par ailleurs entièrement séquentiel — aucun `Promise.all`, alors que le
tableau de bord admin (`src/app/(app)/admin/page.tsx:51`) utilise déjà ce motif.

## Correctif

### 1. Agréger côté base

Nouvelle migration `supabase/migrations/038_lead_status_counts.sql` :

```sql
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
```

`p_assigned_to is null` sert l'admin et la secrétaire (tous les leads) ; sinon on filtre
sur le télépro. C'est exactement la condition de la boucle actuelle, déplacée dans la base.

**Les casts `::text` sont obligatoires** : `category` et `status` sont des types enum
(`lead_category` défini dans `034_lead_category.sql:2`, `lead_status` dans
`001_initial_schema.sql:36`). Sans cast, la fonction est rejetée au déploiement pour
incompatibilité avec `returns table (... text)`.

L'agrégat renvoie au maximum 42 lignes (3 catégories × 14 statuts) au lieu de 8744 —
une réduction d'environ 200×.

### 2. Paralléliser le layout

La boucle disparaît au profit d'un appel `.rpc("lead_status_counts", ...)`, et les
requêtes indépendantes partent ensemble :

```
getUser()                                 (obligatoire en premier : fournit user.id)
  └─ Promise.all([profil, notifications]) (ne dépendent que de user.id)
       └─ rpc lead_status_counts(...)     (dépend du rôle, donc du profil)
```

La parallélisation ne rapporte qu'environ 54 ms : les compteurs ont besoin du rôle, donc
du profil, ce qui impose trois étapes. Elle est retenue parce qu'elle est quasi gratuite,
pas parce qu'elle est décisive. L'essentiel du gain vient de l'agrégat.

## Gain attendu

| | Avant | Après |
|---|---|---|
| Layout | ~926 ms | ~164 ms |
| Middleware | ~103 ms | ~103 ms (hors périmètre) |
| Page | ~123 ms | ~123 ms |
| **Total** | **~1150 ms** | **~390 ms** |

Environ 3× plus rapide. Surtout, le coût cesse de croître avec la base : un `GROUP BY`
sur 8744 ou 50 000 lignes coûte quasiment pareil.

## Comportement

Inchangé. Les compteurs affichent les mêmes nombres, calculés sur les mêmes leads.

## Vérification

**Le risque ici n'est pas la performance, c'est la justesse.** Une optimisation qui rend
des compteurs faux est un échec, quelle que soit sa vitesse.

Le test qui compte compare, sur les vraies données, le résultat de
`lead_status_counts()` à celui de la boucle actuelle — pour l'admin (`p_assigned_to`
null) et pour un télépro (`p_assigned_to` renseigné). Les deux doivent produire des
compteurs identiques, catégorie par catégorie et statut par statut.

Mesurer aussi le temps de la RPC pour confirmer l'ordre de grandeur annoncé (~60 ms).

## Hors périmètre

- **Cache des compteurs** : envisagé puis écarté. Une fois l'agrégat en place, la requête
  coûte ~60 ms ; un cache économiserait ~60 ms de plus au prix de compteurs périmés et
  d'une invalidation à gérer. Mauvais échange.
- **Déduplication middleware/layout** (`getUser` + profil faits deux fois, ~100 ms) :
  touche l'authentification, donc risque de régression sérieux pour un gain marginal.
  Décision de l'utilisateur de ne pas l'inclure.

## Pistes ouvertes

- `vercel.json` épingle la région `iad1` (Virginie). Si la base Supabase est en Europe,
  chaque aller-retour traverse l'Atlantique et toutes les mesures ci-dessus sont
  optimistes par rapport à la production. La région de la base n'a pas pu être
  déterminée : l'API est derrière Cloudflare, et l'utilisateur ne l'a pas encore
  indiquée. À vérifier dans Settings → General du dashboard Supabase.
- Les mesures de cette spec ont été prises depuis la machine de l'utilisateur, pas
  depuis Vercel. Les valeurs absolues en production peuvent différer ; les rapports
  entre elles, et la nature O(N) de la boucle, ne changent pas.

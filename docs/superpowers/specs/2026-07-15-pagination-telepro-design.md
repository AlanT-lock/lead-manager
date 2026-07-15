# Paginer /telepro/leads : supprimer le plafond silencieux à 1000 leads

Date : 2026-07-15
Statut : validé, prêt pour le plan d'implémentation

## Problème

`/telepro/leads` charge tous les leads du télépro sans pagination
(`src/app/(app)/telepro/leads/page.tsx:33-37`) :

```ts
let query = adminClient
  .from("leads")
  .select("*")
  .eq("assigned_to", user.id)
  .order("created_at", { ascending: false });
```

Ni `.range()` ni `.limit()`. Or PostgREST plafonne toute requête à 1000 lignes. La page
reçoit donc 1000 lignes et s'arrête là — **sans erreur, sans message**. Le tri étant
`created_at desc`, le télépro voit ses 1000 leads les plus récents ; les plus anciens
ont disparu de son écran.

## Impact (mesuré le 2026-07-15, lecture seule sur la production)

Sur 11 télépros actifs, 3 dépassent le plafond :

| Télépro | Leads réels | Visibles | Invisibles |
|---|---|---|---|
| Lefebvre Sandra | 2747 | 1000 | **1747 (64 %)** |
| Legrand Nathalie | 2424 | 1000 | **1424 (59 %)** |
| Laborde Marie | 1678 | 1000 | **678 (40 %)** |

Vérification directe, en reproduisant la requête de la page :

```
Télépro : Lefebvre Sandra
  leads réellement en base   : 2747
  lignes rendues par la page : 1000
>>> BUG CONFIRME : 1747 leads (64%) sont INVISIBLES pour elle.
```

Environ 3800 leads sont attribués à quelqu'un qui ne peut pas les ouvrir. Pour une
plateforme de téléprospection, ce sont des leads qui ne seront jamais appelés.

## Historique de la décision

La spec `2026-07-14-pagination-leads-design.md` avait documenté ce bug et l'avait laissé
hors périmètre :

> **Elle ne le corrige pas pour `/telepro/leads` ni `/admin/redistribute`**, qui restent
> non paginées et donc toujours plafonnées à 1000 — hors périmètre, mais à savoir.

La non-pagination de `/telepro/leads` y figurait comme **exigence explicite** de
l'utilisateur. Interrogé le 2026-07-15, il indique qu'aucune raison métier ne la
motivait — c'était une contrainte de simplicité. La décision est donc inversée en
connaissance de cause.

## Correctif

Reproduire sur `/telepro/leads` le motif de pagination déjà en place sur `/admin/leads`.
Toute l'infrastructure existe : `fetchPaginatedLeads`, `parsePage`, `parsePerPage`,
`PER_PAGE_COOKIE`, `PER_PAGE_OPTIONS`, `LeadsPagination` (`src/lib/pagination.ts`,
`src/components/ui-kit/LeadsPagination.tsx`).

### 1. `src/app/(app)/telepro/leads/page.tsx`

Pagination serveur : `per` (URL, puis cookie, puis défaut 50), `page`, `count: "exact"`,
`fetchPaginatedLeads`, et `<LeadsPagination page={page} per={per} total={total} />`.

**Ordre total obligatoire.** La requête actuelle trie par `created_at desc` seulement.
Sans second critère, deux leads de même `created_at` peuvent changer de place entre deux
requêtes et donc apparaître deux fois ou être sautés. `/admin/leads` ajoute `.order("id")`
pour cette raison (`src/app/(app)/admin/leads/page.tsx:100-110`) ; `/telepro/leads` en a
besoin aussi. Sans ce point, on remplacerait un bug de troncature par un bug de doublons.

### 2. `src/app/(app)/telepro/leads/TeleproLeadsTable.tsx`

Le tri « statut modifié le » est aujourd'hui côté client (`useMemo` ligne 64, sur le
tableau `leads` reçu en props). Avec une pagination serveur, il ne trierait que la page
affichée — un tri qui ment. Il passe donc côté serveur, en reproduisant le motif de
`AdminLeadsTable` : prop `statusSort`, cycle none→desc→asc écrit dans l'URL.

### 3. `src/app/(app)/telepro/leads/LeadsFilters.tsx`

Ce panneau ne préserve aujourd'hui aucun paramètre : changer un filtre perdrait la taille
de page. Il doit préserver `per`, `sort` et `dir`, et omettre `page` — changer un filtre
ramène en page 1, comme `AdminLeadsFilters`.

### Pas de `key` de réinitialisation

`/admin/leads` passe un `tableKey` à sa table pour vider la sélection multiple au
changement de page (sans quoi on pourrait supprimer des leads invisibles).
`TeleproLeadsTable` n'a aucune sélection multiple : ce garde-fou est inutile ici.

## Vérification

Script en lecture seule qui, pour Lefebvre Sandra (2747 leads), parcourt **toutes les
pages** de la nouvelle requête paginée et vérifie :

1. le total annoncé vaut 2747, et non 1000 ;
2. la réunion de toutes les pages contient 2747 identifiants **distincts** ;
3. aucun doublon, aucun lead manquant.

Le test échoue aujourd'hui (il trouverait 1000). Les points 2 et 3 attrapent précisément
le bug d'ordre instable : si le `.order("id")` est oublié, des doublons apparaîtront et le
script le dira. Une assertion sur le seul total ne suffirait pas.

## Hors périmètre

- **`/admin/redistribute`** reste non paginée, donc toujours plafonnée à 1000. Son
  compteur « {leads.length} lead(s) à redistribuer » continuera d'annoncer 1000 pour
  Sandra alors qu'elle en a 2747 — le chiffre lui-même est faux. Décision de
  l'utilisateur de la traiter dans un lot séparé : la page repose sur une sélection
  manuelle, et la paginer imposerait 14 manipulations pour transférer 2747 leads. Ce
  problème mérite sa propre réflexion plutôt qu'un traitement en passant. **Dette
  explicite, pas un oubli.**
- Les compteurs du menu latéral ne sont pas concernés : ils passent déjà par l'agrégat
  SQL `lead_status_counts` (spec `2026-07-15-perf-compteurs-layout-design.md`) et ne sont
  pas plafonnés.

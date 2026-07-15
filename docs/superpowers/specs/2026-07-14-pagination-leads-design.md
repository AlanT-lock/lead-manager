# Pagination des listes de leads (admin + secrétaire) — Design

- **Date** : 2026-07-14
- **Projet** : Lead Manager (CRM téléprospection, Next.js 15 + Supabase)
- **Statut** : validé, prêt pour le plan d'implémentation

## Objectif

Paginer les listes de leads servies aux rôles **admin** et **secrétaire** : 25/50/100/200 leads par
page, navigation par numéros de page en liste horizontale croissante, boutons précédent/suivant, les
leads les plus récents en premier. La liste des télépros reste sur une page unique.

## Périmètre

| Page | Rôles | Paginée | Tri |
|---|---|---|---|
| `/admin/leads` | admin + secrétaire | **oui** | `created_at` desc |
| `/admin/documents-recus` | admin + secrétaire | **oui** | `updated_at` desc (existant, inchangé) |
| `/admin/redistribute` | admin | non (hors périmètre) | `created_at` desc |
| `/telepro/leads` | télépro | **non** (exigence explicite) | `created_at` desc |

**Aucun garde-fou de rôle à écrire.** `/admin/leads` et `/admin/documents-recus` sont déjà réservées
à admin + secrétaire : le middleware (`src/lib/supabase/middleware.ts:76-81`) et le layout admin
(`src/app/(app)/admin/layout.tsx:36`) redirigent les télépros. La liste télépro est sur une route
séparée (`/telepro/leads`) et n'est pas touchée. La contrainte « uniquement secrétaire et admin » est
donc satisfaite par la topologie des routes, pas par une condition dans le code.

## Décisions (validées avec l'utilisateur)

1. **Périmètre** : les deux pages admin (`/admin/leads` **et** `/admin/documents-recus`).
2. **Taille par défaut** : **50**, mémorisée entre les visites et partagée par les deux pages.
3. **Sélection multiple** : limitée à la **page courante**. « Tout cocher » coche les leads affichés ;
   changer de page vide la sélection. On n'agit jamais sur un lead hors écran.
4. **Approche** : **pagination serveur** (`.range()` + `count: "exact"`), pas de découpage client.
5. **Tri `status_changed_at`** : basculé côté serveur via l'URL ; `/admin/redistribute` est mise à
   jour pour l'appliquer aussi (sinon son bouton de tri deviendrait inerte).
6. **Ellipses** : au-delà de 8 pages, affichage condensé (`1 … 4 5 [6] 7 8 … 25`).
7. **Barre masquée** quand il n'y a qu'une seule page.

## Contexte technique important

### Bug latent corrigé au passage : le plafond des 1000 lignes

Aucune des listes n'a de `.limit()`/`.range()`, mais **PostgREST plafonne silencieusement à 1000
lignes**. Au-delà de 1000 leads correspondant à un filtre, la page en affiche 1000 et les autres sont
invisibles, sans aucun message. Le repo connaît déjà ce plafond et le contourne ailleurs : la boucle
de comptage des badges du menu latéral itère par tranches de 1000 (`src/app/(app)/layout.tsx:63-79`).

La pagination serveur corrige ce bug pour les deux pages admin. **Elle ne le corrige pas pour
`/telepro/leads` ni `/admin/redistribute`**, qui restent non paginées et donc toujours plafonnées à
1000 — hors périmètre, mais à savoir.

### Le tri client deviendrait faux

`AdminLeadsTable.tsx:74-90` trie `status_changed_at` côté client, sur le tableau `leads` reçu en
props (`useState` + `useMemo`, cycle none→desc→asc). Avec une pagination serveur, ce tri ne
trierait que les 50 leads de la page courante : un tri faux, présenté comme un tri global. Il doit
donc passer côté serveur.

### `AdminLeadsTable` est partagée

`/admin/redistribute` importe `AdminLeadsTable` (`src/app/(app)/admin/redistribute/page.tsx:4,71-75`,
avec `excludeTeleproId`). La pagination vit donc **dans les pages**, pas dans le composant de table —
la table reste ignorante de la pagination. Seul le tri, lui, devient URL-driven pour les trois pages.

### Pattern existant à suivre

Tous les filtres sont **URL-driven** : `searchParams` → requête serveur → `router.push` depuis les
composants de filtres. `page`/`per` s'y intègrent sans refonte. Les filtres utilisent des `<select>`
HTML natifs stylés à la main ; `src/components/ui/select.tsx` existe mais **n'est importé nulle part**
— on ne l'introduit pas ici, pour ne pas avoir deux styles de menu déroulant sur la même page.

## Architecture

### Contrat d'URL

- `?page=<n>` — 1-indexé. Absent ⇒ page 1.
- `?per=<25|50|100|200>` — absent ⇒ cookie, sinon 50.
- `?sort=status_changed_at&dir=<asc|desc>` — absent ⇒ tri par défaut de la page.

Bénéfices : lien partageable, bouton Retour fonctionnel, état conservé au rafraîchissement.

### Mémorisation par cookie (et non `localStorage`)

Le choix de taille doit être connu **du serveur** au moment du rendu. Un cookie est lisible dans un
Server Component ⇒ la page se rend directement avec la bonne taille. Avec `localStorage`, le serveur
rendrait 50 leads puis le client corrigerait — clignotement visible à chaque visite.

- Nom : `leads_per_page`. Portée `path=/`, durée 1 an, `SameSite=Lax`.
- Écrit côté client (`document.cookie`) au changement de taille, en même temps que le `router.push`.
- Lu côté serveur via `cookies()` **uniquement si `per` est absent de l'URL** (l'URL prime).
- Valeur invalide ou hors liste ⇒ ignorée, retour à 50.
- Les deux pages admin partagent le cookie (exigence : choix partagé).

> Ces pages sont déjà dynamiques (elles lisent `searchParams`) ; lire un cookie ne change donc pas
> leur stratégie de rendu.

### Requête serveur

Pour chaque page paginée :

```ts
const { page, per } = parsePagination(params, cookiePer);   // valeurs déjà validées/clampées
const offset = (page - 1) * per;

let query = adminClient
  .from("leads")
  .select(`*, profile:profiles!assigned_to(full_name, email)`, { count: "exact" })
  .order(<colonne de tri>, { ascending: <dir> })
  .range(offset, offset + per - 1);
```

Les filtres existants (`status`, `q`, `telepro`, `from`/`to`, `chantier`, `delegataire`,
`installation_type`, `category`) s'appliquent **avant** `.range()` : le `count` reflète le résultat
filtré, et paginer un résultat filtré fonctionne naturellement. Aucun filtre n'est modifié.

**Départage obligatoire (`.order("id")` en dernier)** : une pagination n'est déterministe que si
l'ordre est total. Deux leads partageant la même valeur de tri peuvent sinon être renvoyés dans un
ordre différent d'une requête à l'autre — un même lead apparaîtrait alors deux fois, ou serait sauté,
entre la page 1 et la page 2. Le risque est réel ici : `status_changed_at` est nul pour tous les leads
jamais modifiés, et un import CSV peut produire des `created_at` identiques. Chaque requête paginée se
termine donc par `.order("id", { ascending: false })`.

**Clamp de la page hors bornes** : le nombre de pages n'est connu qu'après la requête (`count`). Si
`page` dépasse le dernier index (ex. un filtre resserre le résultat à 12 leads alors que l'URL dit
`page=8`), on **re-exécute la requête sur la dernière page réelle** plutôt que d'afficher un tableau
vide. Cas rare (URL manipulée, filtre resserré, leads supprimés) ⇒ une seconde requête est acceptable
et reste plus simple qu'un `count` préalable systématique.

### Ordre de tri par page

| Page | Tri par défaut | Tri via `?sort=status_changed_at` |
|---|---|---|
| `/admin/leads` | `created_at` desc | `.order("status_changed_at", { ascending: dir === "asc" })` |
| `/admin/documents-recus` | `updated_at` desc | pas de tri de colonne (la table n'en a pas aujourd'hui) |
| `/admin/redistribute` | `created_at` desc | idem `/admin/leads` (réparation) |

## Composants

### `src/lib/pagination.ts` (nouveau)

Point unique de vérité, importé par les pages et par le composant de pagination.

- `PER_PAGE_OPTIONS = [25, 50, 100, 200] as const`
- `DEFAULT_PER_PAGE = 50`
- `PER_PAGE_COOKIE = "leads_per_page"`
- `parsePerPage(value): number` — renvoie la valeur si elle est dans `PER_PAGE_OPTIONS`, sinon
  `DEFAULT_PER_PAGE`. Traite `undefined`, `"abc"`, `"37"`, `"-5"`.
- `parsePage(value): number` — entier ≥ 1, sinon 1.
- `pageCount(total, per): number` — au moins 1 (une liste vide = 1 page).
- `clampPage(page, count): number` — ramène dans `[1, count]`.
- `pageNumbers(current, total): (number | "ellipsis")[]` — la séquence à afficher (règle ci-dessous).

Ce module est du calcul pur, sans dépendance à Next ni à Supabase : testable directement (Vitest).

### `src/components/ui-kit/LeadsPagination.tsx` (nouveau, `"use client"`)

Placé sous chaque tableau, aux côtés de `PageHeader` dans `ui-kit/`. Purement présentationnel : il
reçoit sa position et son total, et pousse les nouveaux paramètres dans l'URL.

```ts
type LeadsPaginationProps = {
  page: number;   // page courante (1-indexée, déjà clampée)
  per: number;    // taille de page courante
  total: number;  // nombre total de leads pour le filtre courant
};
```

Pas de prop `basePath` : le composant lit `usePathname()` et réécrit les `useSearchParams()` courants,
comme le toggle de tri. Il préserve ainsi tous les filtres sans les connaître.

Contenu : compteur « 51–100 sur 1 234 », boutons précédent/suivant (désactivés aux extrémités), liste
horizontale des numéros par ordre croissant, sélecteur `<select>` natif 25/50/100/200.

Comportements :
- Clic sur un numéro / précédent / suivant ⇒ `router.push` avec `page` mis à jour, **tous les autres
  paramètres d'URL préservés** (filtres, tri, `per`).
- Changement de taille ⇒ écrit le cookie, puis `router.push` avec `per=<n>` et **`page=1`**.
- `total === 0` ou une seule page ⇒ le composant ne rend **rien** (sur un filtre à 3 leads, la barre
  n'apporte rien).
- `data-testid` : `pagination`, `pagination-prev`, `pagination-next`, `pagination-per`,
  `pagination-page-<n>` — pour les tests e2e, cohérent avec `filter-*` existants.

### Règle d'affichage des numéros

- **≤ 8 pages** : tous les numéros, sans ellipse.
- **> 8 pages** : toujours la première et la dernière, les voisines immédiates de la page courante,
  ellipses pour combler. Page 6 sur 25 ⇒ `1 … 4 5 [6] 7 8 … 25`. Page 2 sur 25 ⇒ `1 [2] 3 4 … 25`.
- La page courante est visuellement distincte et non cliquable.

## Fichiers modifiés

### `src/app/(app)/admin/leads/page.tsx`
Lire `page`/`per`/`sort`/`dir` ; lire le cookie si `per` absent ; ajouter `{ count: "exact" }`,
`.range()` et l'ordre de tri conditionnel ; clamp hors bornes ; passer `statusSort` à
`AdminLeadsTable` ; rendre `<LeadsPagination>` sous **les deux** branches de tableau (`AdminLeadsTable`
et `DocumentsRecusTable` — la page bascule sur cette dernière quand `status=documents_recus`).

### `src/app/(app)/admin/documents-recus/page.tsx`
Même traitement, en conservant `updated_at` desc et ses filtres propres (dont `delegataire`
multi-valeurs).

### `src/app/(app)/admin/leads/AdminLeadsFilters.tsx`
`buildParams()` (l.51-70) construit une `URLSearchParams` **neuve** : elle doit désormais **préserver
`per`** (et le tri) tout en **omettant `page`** ⇒ tout changement de filtre ramène en page 1. C'est le
comportement voulu : sinon on filtrerait sur 12 résultats en restant page 8, face à un tableau vide.

### `src/app/(app)/admin/documents-recus/DocumentsRecusFilters.tsx`
Même correction sur son `buildParams()` (l.20-33).

### `src/app/(app)/admin/leads/AdminLeadsTable.tsx`
- Supprimer `statusSort`/`sortedLeads` (`useState` + `useMemo`, l.72-90) ; itérer `leads` directement.
- Nouvelle prop `statusSort: "none" | "asc" | "desc"`, fournie par la page depuis l'URL.
- `toggleStatusSort` (l.83-89) garde son cycle none→desc→asc à l'identique pour l'utilisateur, mais
  pousse le résultat dans l'URL au lieu d'un `setState` : `router.push` sur `usePathname()` avec les
  `useSearchParams()` courants, en réécrivant `sort`/`dir` et en remettant `page=1` (changer l'ordre
  invalide la position courante). Le composant a déjà `useRouter`.
  > On passe par `usePathname()`/`useSearchParams()` plutôt que par une prop `basePath` : la table
  > sert deux routes, et le toggle doit de toute façon préserver les paramètres existants — dont
  > `?telepro=<id>` sur `/admin/redistribute`.
- `toggleAll` (l.140-141) et `checked={selected.size === leads.length}` (l.348) restent **inchangés** :
  `leads` ne contient plus que la page courante, donc « tout cocher » devient « cocher la page
  courante » sans modification. La sélection se vide naturellement à chaque navigation (le composant
  est remonté par le nouveau rendu serveur) — conforme à la décision 3, sans code ajouté.

### `src/app/(app)/admin/documents-recus/DocumentsRecusTable.tsx` — **aucun changement**
Vérifié : cette table n'a ni sélection multiple ni tri de colonne (son seul état local porte sur
l'édition des commentaires). Elle reçoit `leads` et l'affiche ; recevoir une page au lieu de la
totalité ne demande rien. Elle est rendue par les **deux** pages paginées.

### `src/app/(app)/admin/redistribute/page.tsx`
Lire `sort`/`dir` et appliquer l'ordre, pour que le bouton de tri de la table partagée reste
fonctionnel. **Pas de pagination** (hors périmètre).

## Tests

**Unitaires (Vitest, nouveau dans le repo)** — le repo n'avait aucun runner unitaire. On ajoute
**Vitest** (`vitest.config.ts`, script `npm test`, `include: ["src/**/*.test.ts"]` pour ne pas
empiéter sur `e2e/` qui appartient à Playwright). Justification : `src/lib/pagination.ts` est du
calcul pur, et la séquence à ellipses est un classique à erreurs de bornes — un e2e la testerait très
mal (il faudrait un navigateur et un volume de données réel). `src/lib/pagination.test.ts` couvre :
`parsePerPage` (valide / absent / `"37"` / `"abc"`), `parsePage` (`"0"`, `"-5"`, `"abc"`),
`pageCount` (total 0 ⇒ 1 page), `clampPage`, et `pageNumbers` (≤ 8 pages sans ellipse ; page 6/25 ⇒
`1 … 4 5 6 7 8 … 25` ; premières et dernières pages ; comblement d'un trou d'une seule page).

**e2e (`e2e/leads-pagination.admin.spec.ts`, nouveau)** — dans le style de
`e2e/leads-filters.admin.spec.ts` (`data-testid` + assertion sur l'URL, `test.skip(!hasAuthEnv)`) :
1. Le sélecteur de taille met `per=100` dans l'URL.
2. Le clic sur « suivant » met `page=2` dans l'URL.
3. Changer un filtre alors qu'on est en `page=3` retire `page` de l'URL (retour page 1) et conserve
   `per`.

Ces tests n'exigent aucun volume de données particulier : ils portent sur le contrat d'URL. Les
assertions dépendantes du volume (le tableau contient exactement 50 lignes) ne sont pas testées en
e2e — la base de test n'a pas de volume garanti.

**Vérification manuelle** : sur un filtre à plus de 200 leads, vérifier que les pages 1 et 2 ne
partagent aucun lead, que le compteur est cohérent, que le tri « statut modifié le » ordonne bien
l'ensemble (le 1er lead de la page 2 vient après le dernier de la page 1) et que le choix de taille
survit à un rechargement puis en passant d'une page admin à l'autre.

**`npx tsc --noEmit` = 0 erreur.**

## Hors périmètre (YAGNI)

- Pas de pagination sur `/telepro/leads` (exigence explicite) ni sur `/admin/redistribute` : toutes
  deux restent plafonnées à 1000 lignes par PostgREST.
- Pas de sélection cumulée entre les pages, ni de « sélectionner les N résultats du filtre ».
- Pas de tri serveur sur les autres colonnes que `status_changed_at`.
- Pas de migration Postgres, pas de route API, pas de changement de logique métier.
- On n'introduit pas `src/components/ui/select.tsx` (inutilisé) ; on suit le `<select>` natif des
  filtres existants.
- On ne « répare » pas l'incohérence de tri entre `/admin/leads` (`created_at`) et
  `/admin/documents-recus` (`updated_at`) : comportement existant, volontaire.

## Critères de réussite

1. Sur `/admin/leads` et `/admin/documents-recus`, un admin ou une secrétaire voit 50 leads par
   défaut, les plus récents en premier, avec une barre de pagination numérotée sous le tableau.
2. Le sélecteur 25/50/100/200 fonctionne ; le choix survit à un rechargement et vaut sur les deux
   pages.
3. Les numéros de page, précédent et suivant naviguent en conservant filtres, recherche et tri.
4. Tout changement de filtre ramène en page 1.
5. Un filtre dépassant 1000 leads est désormais entièrement parcourable (plafond PostgREST corrigé).
6. `/telepro/leads` est strictement inchangée : tous les leads sur une seule page, aucune barre.
7. Le tri « statut modifié le » ordonne l'ensemble du résultat, pas seulement la page affichée.
8. `npx tsc --noEmit` = 0 erreur ; les tests e2e passent.

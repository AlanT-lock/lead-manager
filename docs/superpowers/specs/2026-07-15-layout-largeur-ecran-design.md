# Adapter les pages de leads à la largeur de l'écran

Date : 2026-07-15
Statut : validé, prêt pour le plan d'implémentation

## Problème

Sur un écran de 13 pouces, les pages de leads exigent un scroll horizontal pour tout
voir. La gêne porte sur les filtres, le bouton « Ajouter un lead » et la barre de
pagination. Le scroll horizontal du tableau lui-même est jugé acceptable.

Sur un grand écran, tout fonctionne correctement.

## Cause

`src/app/(app)/layout.tsx:96` :

```tsx
<main className="flex-1 lg:ml-64 min-h-screen pt-4 pb-8 px-4 lg:px-8 bg-[#f4f7fb]">
```

`<main>` est un enfant flex sans `min-w-0`. Un enfant flex a `min-width: auto` par
défaut, ce qui l'empêche de devenir plus étroit que la largeur intrinsèque de son
contenu. Le tableau large gonfle donc `<main>` au lieu de scroller dans sa propre
boîte : l'`overflow-x-auto` que le composant `Table`
(`src/components/ui/table.tsx`) pose déjà autour de chaque tableau ne se déclenche
jamais, et c'est la page entière qui dépasse la largeur du viewport.

Les filtres, le bouton et la pagination sont alors emportés par la page qui déborde.

Le Drawer est en `position: fixed` (`src/components/Drawer.tsx:105`), donc hors du
flux : `<main>` est en pratique le seul enfant flex en jeu.

### Pourquoi le grand écran va bien

Tant que le tableau tient dans la largeur disponible, aucun débordement ne se produit
et le défaut reste invisible. Il n'apparaît que lorsque le contenu dépasse le viewport.

### Les composants ne sont pas en cause

Vérifié à la lecture — aucun ne nécessite de modification :

- **Filtres** (`AdminLeadsFilters.tsx:142`) : déjà responsives,
  `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6`.
- **Bouton d'ajout** (`PageHeader.tsx`) : `flex-col gap-3 sm:flex-row`.
- **Pagination** (`LeadsPagination.tsx:55`) : `flex-col sm:flex-row`, et la liste des
  numéros est bornée à 9 entrées maximum (`FULL_LIST_MAX_PAGES = 8`, `NEIGHBOURS = 2`,
  ellipses au-delà) — environ 450 px dans le pire cas.

Ils sont tous déjà corrects. C'est leur conteneur qui ment sur sa largeur.

## Correctif

Ajouter `min-w-0` au `<main>` du layout `(app)` :

```tsx
<main className="flex-1 min-w-0 lg:ml-64 min-h-screen pt-4 pb-8 px-4 lg:px-8 bg-[#f4f7fb]">
```

## Résultat attendu

- `<main>` peut se réduire à la largeur du viewport.
- Le tableau retrouve son scroll horizontal **dans son propre cadre** (acceptable).
- Filtres, bouton d'ajout et pagination restent dans la largeur de l'écran, à toute
  taille, via leurs classes responsives existantes.
- Plus aucun scroll horizontal de page.

## Portée

Le correctif est dans le layout partagé `(app)`, donc il vaut d'un coup pour
`/admin/leads`, `/telepro/leads`, `/admin/documents-recus` et toutes les autres pages
de l'espace applicatif.

## Hors périmètre

- **Panneau de filtres repliable** : la gêne rapportée est sur ordinateur, où les
  filtres tiennent déjà sur 3-4 colonnes. Complexité sans bénéfice.
- **Retouche des filtres, du bouton ou de la pagination** : ils sont déjà corrects ;
  les modifier reviendrait à soigner un symptôme.

## Vérification

Test e2e sur `/admin/leads`, viewport 1280×800 (13 pouces) :

```
document.documentElement.scrollWidth <= document.documentElement.clientWidth
```

C'est la traduction littérale de « la page ne scrolle pas horizontalement ». Le test
doit échouer avant le correctif et passer après — sans quoi il ne prouve rien.

Comme les autres specs `.admin.spec.ts`, il se skippe tant que `.env.test.local` est
absent (`hasAuthEnv` dans `e2e/helpers.ts`).

### Limite connue

Le diagnostic vient de la lecture du CSS, où le mécanisme est net et bien connu, mais
il n'a pas été observé dans un navigateur faute d'identifiants e2e. Le test ci-dessus
est ce qui transforme ce raisonnement en preuve : sa capacité à échouer avant le
correctif doit être constatée, pas supposée.

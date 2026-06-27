# Catégories de leads — Design

- **Date** : 2026-06-27
- **Projet** : Lead Manager (CRM téléprospection, Next.js 15 + Supabase)
- **Statut** : validé, prêt pour le plan d'implémentation

## Contexte

Chaque lead a aujourd'hui un **statut** (`status`, ENUM `lead_status` : nouveau, nrp, a_rappeler,
en_attente_doc, documents_recus, incomplet, bloque_mpr, valide, installe,
ancien_documents_recus, annule). On veut ajouter une **catégorie** transversale, indépendante du
statut, pour classer le type de produit du lead.

## Objectif

Ajouter une **catégorie** à chaque lead, parmi 3 valeurs, filtrable depuis tous les espaces
(admin, secrétaire, télépro), via un menu latéral imbriqué (catégorie → statuts) et via la barre de
filtres des pages de leads.

## Décisions de cadrage (validées avec l'utilisateur)

1. **Statuts identiques pour les 3 catégories.** On garde l'unique liste de statuts actuelle ; la
   catégorie est un filtre supplémentaire. Dans le menu, chaque catégorie déploie la même liste de
   statuts, mais compteurs et résultats sont limités aux leads de cette catégorie.
2. **Catégorie modifiable** à la création et à l'édition d'un lead (admin ET télépro), avec
   « Fenêtre » par défaut.
3. **Filtre catégorie présent aussi dans la barre de filtres** des pages de leads, en plus du menu.

## Catégories

| Clé technique (ENUM) | Libellé affiché |
|----------------------|-----------------|
| `fenetre`            | Fenêtre         |
| `clim_1euro`         | Clim 1 €        |
| `clim_3990euros`     | Clim 3990 €     |

Ordre d'affichage partout : Fenêtre, Clim 1 €, Clim 3990 €.

## 1. Modèle de données

Nouvelle colonne `category` sur `leads`, en ENUM Postgres (cohérent avec `status`, `color`,
`installation_type`). `NOT NULL DEFAULT 'fenetre'` : tous les leads existants sont rétro-remplis à
`fenetre` par le DEFAULT au moment de l'ajout de colonne, et tout nouveau lead (création manuelle ou
import CSV) hérite de `fenetre` tant qu'aucune autre valeur n'est fournie.

**Migration** `supabase/migrations/034_lead_category.sql` :

```sql
CREATE TYPE lead_category AS ENUM ('fenetre', 'clim_1euro', 'clim_3990euros');

ALTER TABLE leads
  ADD COLUMN category lead_category NOT NULL DEFAULT 'fenetre';

CREATE INDEX idx_leads_category ON leads(category);
```

**Commande SQL de backfill demandée** (tous les leads existants → Fenêtre). Redondante avec le
`DEFAULT` ci-dessus mais explicite, idempotente, sans risque — à exécuter dans le SQL Editor de
Supabase :

```sql
UPDATE leads SET category = 'fenetre';
```

## 2. Types (`src/lib/types.ts`)

```ts
export type LeadCategory = 'fenetre' | 'clim_1euro' | 'clim_3990euros';

export const LEAD_CATEGORIES: LeadCategory[] = ['fenetre', 'clim_1euro', 'clim_3990euros'];

export const LEAD_CATEGORY_LABELS: Record<LeadCategory, string> = {
  fenetre: 'Fenêtre',
  clim_1euro: 'Clim 1 €',
  clim_3990euros: 'Clim 3990 €',
};
```

Ajouter `category: LeadCategory;` à l'interface `Lead`.

## 3. Menu latéral imbriqué (`src/components/Drawer.tsx`)

Aujourd'hui : entrée « Tous les leads » / « Mes leads » avec une flèche qui déploie la liste des
statuts (`statusSubmenuExpanded`), compteurs via `statusCounts: Record<status, number>`.

Demain, 2 niveaux d'imbrication :

```
Tous les leads            ▸     (flèche : déploie les 3 catégories)
  ├─ Fenêtre              ▸     (flèche : déploie les statuts de Fenêtre)
  │    ├─ Tous      (n)
  │    ├─ Nouveau   (n)
  │    └─ … (liste de statuts déjà affichée aujourd'hui)
  ├─ Clim 1 €             ▸
  └─ Clim 3990 €          ▸
```

- **État** : `categoriesExpanded: boolean` (niveau 0) + `expandedCategory: LeadCategory | null`
  (quelle catégorie a ses statuts dépliés). Une seule catégorie dépliée à la fois.
- **Navigation** :
  - Clic sur le libellé d'une catégorie → `${baseHref}?category=<cat>`
  - Clic « Tous » sous une catégorie → `${baseHref}?category=<cat>`
  - Clic sur un statut → `${baseHref}?category=<cat>&status=<status>`
  - Le lien principal « Tous les leads » / « Mes leads » → `${baseHref}` (aucun filtre)
  où `baseHref` = `/admin/leads` (admin/secrétaire) ou `/telepro/leads` (télépro).
- **Compteurs** : propres à chaque catégorie. « Tous » d'une catégorie = somme des statuts de cette
  catégorie. La liste de statuts montrée reste celle utilisée aujourd'hui (`LEAD_STATUSES_ADMIN`,
  comportement inchangé).
- **Mise en évidence (actif)** : la catégorie/statut actif est déterminé par les paramètres d'URL
  `category` et `status`.

## 4. Compteurs (`src/app/(app)/layout.tsx`)

`statusCounts` passe d'un `Record<status, number>` à une structure imbriquée par catégorie :
`Record<LeadCategory, Record<status, number>>` (le total d'une catégorie est la somme de ses
statuts, calculée à l'affichage).

Calcul : **une seule requête** (au lieu des 11 requêtes `count` actuelles côté admin) sélectionnant
`status, category` sur le périmètre voulu (tous les leads pour admin/secrétaire ;
`assigned_to = user.id` pour télépro), puis comptage en mémoire. Cela aligne aussi la branche
admin/secrétaire sur la branche télépro existante.

## 5. Pages de leads (`admin/leads/page.tsx`, `telepro/leads/page.tsx`)

- Lire un nouveau paramètre `searchParams.category`.
- Si présent et valide (∈ `LEAD_CATEGORIES`), ajouter `.eq("category", category)` à la requête,
  exactement comme `status`. Combinable avec tous les filtres existants (status, telepro, dates,
  chantier, délégataire, type d'installation, recherche).

## 6. Barre de filtres (`AdminLeadsFilters.tsx`, `LeadsFilters.tsx`)

Ajout d'un menu déroulant **Catégorie** : Toutes / Fenêtre / Clim 1 € / Clim 3990 €. Il met à jour
le paramètre d'URL `category` (vide = Toutes), dans le même style et le même mécanisme que les
filtres existants de chaque composant.

## 7. Formulaires de création / édition

Ajout d'un sélecteur **Catégorie** (3 options, défaut « Fenêtre ») dans :

- `admin/leads/new/CreateLeadForm.tsx`
- `admin/leads/[id]/AdminLeadForm.tsx`
- `telepro/leads/new/CreateLeadForm.tsx`
- `telepro/leads/TeleproLeadForm.tsx`

Et persistance du champ `category` dans les routes API correspondantes :

- `POST /api/admin/create-lead`
- `POST /api/telepro/create-lead`
- `PATCH/PUT /api/admin/lead/[id]`
- `PATCH/PUT /api/telepro/lead/[id]`

À l'édition, le sélecteur est pré-rempli avec la catégorie actuelle du lead.

## Hors périmètre (YAGNI)

- Pas de statuts distincts par catégorie (décision 1).
- Pas de catégorie dans le fichier CSV importé : les leads importés prennent `fenetre` par défaut.
- Pas de modification des statistiques / graphiques par catégorie (peut être ajouté plus tard).
- Pas de gestion dynamique des catégories (la liste est figée à 3 valeurs dans le code/ENUM).

## Critères de réussite (tests manuels)

1. Après migration + backfill, **tous** les leads existants ont `category = fenetre`.
2. Le menu « Tous les leads » (admin/secrétaire) et « Mes leads » (télépro) déploie les 3
   catégories ; chaque catégorie déploie ses statuts avec des compteurs corrects.
3. Naviguer via le menu filtre bien la liste par catégorie (et par catégorie+statut).
4. Le sélecteur de catégorie de la barre de filtres filtre la liste et reste cohérent avec l'URL.
5. Créer un lead avec une catégorie choisie → la catégorie est enregistrée et visible.
6. Éditer la catégorie d'un lead existant → la modification est persistée.
7. `npm run build` réussit (pas d'erreur TypeScript).

# Catégories de leads — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une catégorie (Fenêtre / Clim 1 € / Clim 3990 €) à chaque lead, filtrable depuis tous les espaces via un menu latéral imbriqué (catégorie → statuts) et la barre de filtres.

**Architecture:** Nouvelle colonne ENUM `category` sur `leads` (défaut `fenetre`). Le filtrage suit exactement le mécanisme existant du paramètre d'URL `status` (`searchParams` → `.eq("category", …)`). Le menu (`Drawer`) gagne un niveau d'imbrication. Les compteurs du menu passent à une structure catégorie × statut, calculée en une requête.

**Tech Stack:** Next.js 15 (App Router, Server Components), TypeScript, Supabase (Postgres + supabase-js), Tailwind CSS.

## Global Constraints

- **Catégories (figées, 3 valeurs)** — clés ENUM ↔ libellés exacts (utiliser le sigle €, espace avant €) :
  - `fenetre` → `Fenêtre`
  - `clim_1euro` → `Clim 1 €`
  - `clim_3990euros` → `Clim 3990 €`
- **Ordre d'affichage partout** : Fenêtre, Clim 1 €, Clim 3990 €.
- **Défaut** : tout lead sans catégorie explicite = `fenetre` (couvre l'existant et l'import CSV).
- **Statuts inchangés** : la liste de statuts (`LEAD_STATUSES_ADMIN`) est la même pour les 3 catégories.
- **Pas de framework de test dans ce projet** : la vérification de chaque tâche = `npx tsc --noEmit` (type-check, aucune erreur) **+** les vérifications manuelles décrites. Ne PAS introduire de framework de test.
- **Convention de commit** : messages en français, préfixe `feat(...)` / `chore(...)`, terminés par `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

## Prérequis (une seule fois, avant la Task 1)

Les dépendances ne sont pas installées dans ce dossier.

- [ ] **Installer les dépendances**

```bash
cd /Users/alantouati/lead-manager
npm install
```

- [ ] **Vérifier que le type-check passe sur la base actuelle**

Run: `npx tsc --noEmit`
Expected: aucune erreur (sortie vide, code 0).

---

### Task 1: Fondations — migration SQL + types

**Files:**
- Create: `supabase/migrations/034_lead_category.sql`
- Modify: `src/lib/types.ts` (ajout du type/labels après la ligne 24 ; ajout d'un champ à l'interface `Lead` après `status` ligne 196)

**Interfaces:**
- Produces: `LeadCategory` (`'fenetre' | 'clim_1euro' | 'clim_3990euros'`), `LEAD_CATEGORIES: LeadCategory[]`, `LEAD_CATEGORY_LABELS: Record<LeadCategory, string>`, et le champ `Lead.category: LeadCategory`. Toutes les tâches suivantes en dépendent.

- [ ] **Step 1: Créer la migration SQL**

Créer `supabase/migrations/034_lead_category.sql` avec :

```sql
-- Catégorie de lead : Fenêtre (défaut) / Clim 1 € / Clim 3990 €
CREATE TYPE lead_category AS ENUM ('fenetre', 'clim_1euro', 'clim_3990euros');

ALTER TABLE leads
  ADD COLUMN category lead_category NOT NULL DEFAULT 'fenetre';

CREATE INDEX idx_leads_category ON leads(category);

-- Rétro-remplissage explicite de tous les leads existants (déjà couvert par le DEFAULT, idempotent)
UPDATE leads SET category = 'fenetre';
```

> Cette migration s'applique **manuellement** dans le SQL Editor de Supabase (le projet n'a pas de stack Supabase locale). Pas d'exécution automatisée dans cette tâche.

- [ ] **Step 2: Ajouter le type et les libellés dans `types.ts`**

Dans `src/lib/types.ts`, juste après le bloc `LEAD_STATUSES_ADMIN` (après la ligne 24, avant `export type LeadColor`), insérer :

```ts
export type LeadCategory = 'fenetre' | 'clim_1euro' | 'clim_3990euros';

export const LEAD_CATEGORIES: LeadCategory[] = ['fenetre', 'clim_1euro', 'clim_3990euros'];

export const LEAD_CATEGORY_LABELS: Record<LeadCategory, string> = {
  fenetre: 'Fenêtre',
  clim_1euro: 'Clim 1 €',
  clim_3990euros: 'Clim 3990 €',
};
```

- [ ] **Step 3: Ajouter le champ à l'interface `Lead`**

Dans `src/lib/types.ts`, interface `Lead`, juste après la ligne `status: LeadStatus;` (ligne 196), ajouter :

```ts
  category: LeadCategory;
```

- [ ] **Step 4: Vérifier le type-check**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/034_lead_category.sql src/lib/types.ts
git commit -m "feat(leads): colonne category (ENUM) + types Fenêtre/Clim 1 €/Clim 3990 €

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Filtrage par catégorie sur les pages de leads

**Files:**
- Modify: `src/app/(app)/admin/leads/page.tsx`
- Modify: `src/app/(app)/telepro/leads/page.tsx`

**Interfaces:**
- Consumes: `LEAD_CATEGORIES`, `LeadCategory` (Task 1).
- Produces: les deux pages lisent `searchParams.category` et appliquent `.eq("category", category)`.

- [ ] **Step 1: Page admin — lire et filtrer la catégorie**

Dans `src/app/(app)/admin/leads/page.tsx` :

1. Étendre le type de `searchParams` (ligne 14) en ajoutant `category?: string` :

```ts
  searchParams: Promise<{ status?: string; q?: string; telepro?: string; from?: string; to?: string; chantier?: string; delegataire?: string; installation_type?: string; category?: string }>;
```

2. Mettre à jour l'import ligne 4 :

```ts
import { CHANTIER_STATUS_FIELDS, LEAD_CATEGORIES, type LeadCategory, type LeadStatus } from "@/lib/types";
```

3. Après la ligne `const installationType = params.installation_type;` (ligne 25), ajouter :

```ts
  const category = params.category as LeadCategory | undefined;
```

4. Après le bloc de filtre `installationType` (après la ligne 54), ajouter :

```ts
  if (category && LEAD_CATEGORIES.includes(category)) {
    query = query.eq("category", category);
  }
```

- [ ] **Step 2: Page télépro — lire et filtrer la catégorie**

Dans `src/app/(app)/telepro/leads/page.tsx` :

1. Étendre le type de `searchParams` (ligne 11) :

```ts
  searchParams: Promise<{ status?: string; q?: string; from?: string; to?: string; category?: string }>;
```

2. Ajouter l'import en haut du fichier (après la ligne 6) :

```ts
import { LEAD_CATEGORIES, type LeadCategory } from "@/lib/types";
```

3. Après `const to = params.to;` (ligne 23), ajouter :

```ts
  const category = params.category as LeadCategory | undefined;
```

4. Après le bloc `if (status) { … }` (après la ligne 39), ajouter :

```ts
  if (category && LEAD_CATEGORIES.includes(category)) {
    query = query.eq("category", category);
  }
```

- [ ] **Step 3: Vérifier le type-check**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/admin/leads/page.tsx" "src/app/(app)/telepro/leads/page.tsx"
git commit -m "feat(leads): filtre URL ?category= sur les pages leads admin et télépro

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Sélecteur de catégorie dans les barres de filtres

**Files:**
- Modify: `src/app/(app)/admin/leads/AdminLeadsFilters.tsx`
- Modify: `src/app/(app)/telepro/leads/LeadsFilters.tsx`

**Interfaces:**
- Consumes: `LEAD_CATEGORIES`, `LEAD_CATEGORY_LABELS` (Task 1).
- Produces: un `<select>` qui pousse `?category=` dans l'URL (vide = toutes), combiné aux filtres existants.

- [ ] **Step 1: `AdminLeadsFilters` — import**

Remplacer l'import ligne 6 par :

```ts
import { LEAD_STATUS_LABELS, LEAD_STATUSES_ADMIN, CHANTIER_STATUS_FIELDS, DELEGATAIRE_GROUPS, LEAD_CATEGORIES, LEAD_CATEGORY_LABELS } from "@/lib/types";
```

- [ ] **Step 2: `AdminLeadsFilters` — état courant + buildParams**

1. Après `const currentStatus = searchParams.get("status") || "";` (ligne 25), ajouter :

```ts
  const currentCategory = searchParams.get("category") || "";
```

2. Dans `buildParams`, étendre la signature `overrides` (ligne 48) pour inclure `category?: string` :

```ts
  const buildParams = useCallback((overrides?: { status?: string; telepro?: string; chantier?: string; delegataire?: string; q?: string; from?: string; to?: string; category?: string }) => {
```

3. Dans le corps de `buildParams`, après `const d = overrides?.delegataire ?? currentDelegataire;` (ligne 53), ajouter :

```ts
    const cat = overrides?.category ?? currentCategory;
```

4. Après `if (d) params.set("delegataire", d);` (ligne 60), ajouter :

```ts
    if (cat) params.set("category", cat);
```

5. Ajouter `currentCategory` au tableau de dépendances du `useCallback` (ligne 65) :

```ts
  }, [currentStatus, currentTelepro, currentChantier, currentDelegataire, search, from, to, currentCategory]);
```

- [ ] **Step 3: `AdminLeadsFilters` — handler + `<select>`**

1. Après `handleStatusChange` (après la ligne 86), ajouter :

```ts
  const handleCategoryChange = (category: string) => {
    router.push(`${basePath}?${buildParams({ category }).toString()}`);
  };
```

2. Dans la grille de filtres (gardée par `basePath === "/admin/leads"`), juste avant le `<div>` du filtre **Statut** (avant la ligne 123), insérer ce bloc :

```tsx
          <div>
            <label className="block text-sm text-slate-600 mb-1">Catégorie</label>
            <select
              value={currentCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Toutes les catégories</option>
              {LEAD_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {LEAD_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
```

- [ ] **Step 4: `LeadsFilters` (télépro) — import**

Remplacer l'import ligne 6 par :

```ts
import { LEAD_STATUS_LABELS, LEAD_STATUSES_ADMIN, LEAD_CATEGORIES, LEAD_CATEGORY_LABELS, type LeadStatus } from "@/lib/types";
```

- [ ] **Step 5: `LeadsFilters` — état + buildParams + handler**

1. Après `const currentStatus = searchParams.get("status") || "";` (ligne 12), ajouter :

```ts
  const currentCategory = searchParams.get("category") || "";
```

2. Étendre la signature `overrides` de `buildParams` (ligne 32) :

```ts
  const buildParams = useCallback((overrides?: { status?: string; q?: string; from?: string; to?: string; category?: string }) => {
```

3. Après `const s = overrides?.status ?? currentStatus;` (ligne 34), ajouter :

```ts
    const cat = overrides?.category ?? currentCategory;
```

4. Après `if (s) params.set("status", s);` (ligne 38), ajouter :

```ts
    if (cat) params.set("category", cat);
```

5. Ajouter `currentCategory` aux dépendances (ligne 43) :

```ts
  }, [currentStatus, search, from, to, currentCategory]);
```

6. Après `handleStatusChange` (après la ligne 64), ajouter :

```ts
  const handleCategoryChange = (category: string) => {
    router.push(`/telepro/leads?${buildParams({ category }).toString()}`);
  };
```

- [ ] **Step 6: `LeadsFilters` — `<select>`**

Dans la grille (ligne 91), juste avant le `<div>` du filtre **Statut** (avant la ligne 92), insérer :

```tsx
        <div>
          <label className="block text-sm text-slate-600 mb-1">Catégorie</label>
          <select
            value={currentCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Toutes les catégories</option>
            {LEAD_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {LEAD_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
```

- [ ] **Step 7: Vérifier le type-check**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(app)/admin/leads/AdminLeadsFilters.tsx" "src/app/(app)/telepro/leads/LeadsFilters.tsx"
git commit -m "feat(leads): sélecteur Catégorie dans les barres de filtres admin et télépro

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Compteurs catégorie×statut + menu latéral imbriqué

**Files:**
- Modify: `src/app/(app)/layout.tsx` (calcul des compteurs + prop passée au `Drawer`)
- Modify: `src/components/Drawer.tsx` (type de prop + rendu imbriqué)

**Interfaces:**
- Consumes: `LEAD_CATEGORIES`, `LEAD_CATEGORY_LABELS`, `LeadCategory`, `LEAD_STATUSES_ADMIN`, `LEAD_STATUS_LABELS` (Task 1 + existant).
- Produces: nouvelle forme de `statusCounts` = `Record<string, Record<string, number>>` (clé = catégorie, valeur = `{ statut: nombre }`). Le `Drawer` consomme cette forme.

- [ ] **Step 1: `layout.tsx` — import**

Remplacer l'import ligne 7 par :

```ts
import { LEAD_STATUSES_ADMIN, LEAD_CATEGORIES } from "@/lib/types";
```

- [ ] **Step 2: `layout.tsx` — calcul des compteurs en une requête**

Remplacer tout le bloc de calcul des compteurs (lignes 53 à 82, de `let statusCounts: Record<string, number> = {};` jusqu'au `catch` inclus) par :

```ts
  let statusCounts: Record<string, Record<string, number>> = {};
  try {
    let rowsQuery = adminClient.from("leads").select("status, category");
    if (!isAdminOrSecretaire) {
      rowsQuery = rowsQuery.eq("assigned_to", user.id);
    }
    const { data: rows } = await rowsQuery;
    const counts: Record<string, Record<string, number>> = {};
    for (const cat of LEAD_CATEGORIES) {
      counts[cat] = {};
      for (const s of LEAD_STATUSES_ADMIN) counts[cat][s] = 0;
    }
    for (const row of rows || []) {
      const cat = row.category as string;
      const s = row.status as string;
      if (cat in counts && s in counts[cat]) counts[cat][s]++;
    }
    statusCounts = counts;
  } catch {
    // Ignore errors, counts will be empty
  }
```

(La prop `statusCounts={statusCounts}` passée au `Drawer` ligne 92 reste inchangée.)

- [ ] **Step 3: `Drawer.tsx` — imports et type de prop**

1. Remplacer l'import ligne 29 par :

```ts
import { LEAD_STATUS_LABELS, LEAD_STATUSES_ADMIN, LEAD_CATEGORIES, LEAD_CATEGORY_LABELS, type LeadStatus, type LeadCategory } from "@/lib/types";
```

2. Dans `interface DrawerProps` (ligne 35), remplacer :

```ts
  statusCounts?: Record<string, number>;
```

par :

```ts
  statusCounts?: Record<string, Record<string, number>>;
```

- [ ] **Step 4: `Drawer.tsx` — état d'expansion à deux niveaux**

Remplacer la ligne 69 :

```ts
  const [statusSubmenuExpanded, setStatusSubmenuExpanded] = useState(false);
```

par :

```ts
  // Niveau 0 : déploie les catégories ; Niveau 1 : déploie les statuts d'UNE catégorie à la fois
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<LeadCategory | null>(null);
```

- [ ] **Step 5: `Drawer.tsx` — remplacer le rendu du sous-menu imbriqué**

Dans le `.map`, remplacer **tout le bloc** allant de la ligne 144 (`const statuses = LEAD_STATUSES_ADMIN;`) jusqu'à la fin de la branche `hasStatusSubmenu` — c'est-à-dire jusqu'au `) : (` de la ligne 219 exclu — par le code ci-dessous.

Concrètement : les lignes 144-145 (déclarations) puis tout le contenu entre `{"hasStatusSubmenu" in item && item.hasStatusSubmenu ? (` (ligne 149) et le `) : (` (ligne 219) sont remplacés. Le reste du fichier (la branche `else` qui rend un simple `<Link>`, lignes 219-232) est inchangé.

Nouvelles déclarations (remplacent les lignes 144-145) :

```tsx
              const currentCategory = isLeadsPage ? (searchParams.get("category") as LeadCategory | null) : null;
              const currentStatus = isLeadsPage ? searchParams.get("status") : null;
              const statuses = LEAD_STATUSES_ADMIN;
              const catTotal = (cat: LeadCategory) =>
                Object.values(statusCounts[cat] ?? {}).reduce((a, b) => a + b, 0);
```

Nouveau contenu de la branche `hasStatusSubmenu` (remplace les lignes 149-218, c.-à-d. le `<> … </>` après le `?`) :

```tsx
                    <>
                      <div
                        className={`flex items-center gap-1 px-4 py-3 rounded-lg transition-colors ${
                          isActive
                            ? "bg-white/25 text-white font-medium"
                            : "text-white hover:bg-white/20"
                        }`}
                      >
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 flex-1 min-w-0"
                        >
                          <item.icon className="w-5 h-5 shrink-0" />
                          {item.label}
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setCategoriesExpanded((v) => !v);
                          }}
                          className="p-1.5 rounded-md hover:bg-white/20 text-white shrink-0"
                          aria-label={categoriesExpanded ? "Replier les catégories" : "Déplier les catégories"}
                          aria-expanded={categoriesExpanded}
                        >
                          {categoriesExpanded ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      {categoriesExpanded && (
                        <div className="pl-4 pr-2 py-1 space-y-1">
                          {LEAD_CATEGORIES.map((cat) => {
                            const isCatActive = currentCategory === cat;
                            const isCatExpanded = expandedCategory === cat;
                            return (
                              <div key={cat} className="space-y-1">
                                <div
                                  className={`flex items-center gap-1 px-2 py-2 rounded-md transition-colors ${
                                    isCatActive
                                      ? "bg-white/25 text-white font-medium"
                                      : "text-white/90 hover:bg-white/20"
                                  }`}
                                >
                                  <Link
                                    href={`${item.href}?category=${cat}`}
                                    onClick={() => setOpen(false)}
                                    className="flex items-center justify-between gap-2 flex-1 min-w-0 text-sm"
                                  >
                                    <span className="truncate">{LEAD_CATEGORY_LABELS[cat]}</span>
                                    <span className="text-white/70 tabular-nums">{catTotal(cat)}</span>
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setExpandedCategory((v) => (v === cat ? null : cat));
                                    }}
                                    className="p-1 rounded-md hover:bg-white/20 text-white shrink-0"
                                    aria-label={isCatExpanded ? "Replier les statuts" : "Déplier les statuts"}
                                    aria-expanded={isCatExpanded}
                                  >
                                    {isCatExpanded ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                                {isCatExpanded && (
                                  <div className="pl-3 pr-1 py-1 space-y-1">
                                    <Link
                                      href={`${item.href}?category=${cat}`}
                                      onClick={() => setOpen(false)}
                                      className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors ${
                                        isCatActive && !currentStatus
                                          ? "bg-white/25 text-white font-medium"
                                          : "text-white/90 hover:bg-white/20"
                                      }`}
                                    >
                                      <span>Tous</span>
                                      <span className="text-white/70 tabular-nums">{catTotal(cat)}</span>
                                    </Link>
                                    {statuses.map((s) => (
                                      <Link
                                        key={s}
                                        href={`${item.href}?category=${cat}&status=${s}`}
                                        onClick={() => setOpen(false)}
                                        className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors ${
                                          isCatActive && currentStatus === s
                                            ? "bg-white/25 text-white font-medium"
                                            : "text-white/90 hover:bg-white/20"
                                        }`}
                                      >
                                        <span>{LEAD_STATUS_LABELS[s as LeadStatus]}</span>
                                        <span className="text-white/70 tabular-nums">
                                          {statusCounts[cat]?.[s] ?? 0}
                                        </span>
                                      </Link>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
```

- [ ] **Step 6: Vérifier le type-check**

Run: `npx tsc --noEmit`
Expected: aucune erreur. (En particulier : `statusCounts` est bien typé `Record<string, Record<string, number>>` et plus utilisé comme `Record<string, number>` ; il ne doit rester aucune référence à `statusSubmenuExpanded`.)

- [ ] **Step 7: Vérification manuelle**

```bash
npm run dev
```

Se connecter (admin) puis vérifier dans le menu latéral :
- « Tous les leads » a une flèche → un clic déploie **Fenêtre / Clim 1 € / Clim 3990 €** (avec un total chacune).
- Chaque catégorie a sa propre flèche → un clic déploie la liste des statuts avec compteurs.
- Cliquer « Fenêtre » mène à `/admin/leads?category=fenetre` et filtre la liste.
- Cliquer un statut sous « Fenêtre » mène à `/admin/leads?category=fenetre&status=<statut>`.
- Refaire la vérification côté **télépro** sur « Mes leads » (`/telepro/leads`).

- [ ] **Step 8: Commit**

```bash
git add "src/app/(app)/layout.tsx" src/components/Drawer.tsx
git commit -m "feat(menu): sous-menu imbriqué catégorie→statuts + compteurs catégorie×statut

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Catégorie modifiable (formulaires + routes API)

**Files:**
- Modify: `src/app/api/admin/create-lead/route.ts`
- Modify: `src/app/api/telepro/create-lead/route.ts`
- Modify: `src/app/api/admin/lead/[id]/route.ts`
- Modify: `src/app/api/telepro/lead/[id]/route.ts`
- Modify: `src/app/(app)/admin/leads/new/CreateLeadForm.tsx`
- Modify: `src/app/(app)/telepro/leads/new/CreateLeadForm.tsx`
- Modify: `src/app/(app)/admin/leads/[id]/AdminLeadForm.tsx`
- Modify: `src/app/(app)/telepro/leads/TeleproLeadForm.tsx`

**Interfaces:**
- Consumes: `LEAD_CATEGORIES`, `LEAD_CATEGORY_LABELS` (Task 1) ; champ `Lead.category`.
- Produces: les 4 formulaires envoient `category` ; les 4 routes API la persistent.

#### Routes API d'abord (pour que les formulaires aient une cible)

- [ ] **Step 1: `api/admin/create-lead` — accepter `category`**

1. Dans la destructuration du body (bloc lignes 27-47), ajouter `category,` (par ex. après `installation_type,`).
2. Dans l'objet `leadData` (après `installation_type: installation_type || null,` ligne 88), ajouter :

```ts
    category: category || "fenetre",
```

- [ ] **Step 2: `api/telepro/create-lead` — accepter `category`**

1. Ajouter `category,` à la destructuration du body (bloc lignes 27-46).
2. Dans `leadData`, après `installation_type: installation_type || null,` (ligne 74), ajouter :

```ts
    category: category || "fenetre",
```

- [ ] **Step 3: `api/admin/lead/[id]` — autoriser `category` en update**

Dans le tableau `allowedFields` (lignes 59-71), ajouter `"category"` (par ex. à la suite de `"installateur",`) :

```ts
    "installateur", "category",
```

- [ ] **Step 4: `api/telepro/lead/[id]` — autoriser `category` en update**

Dans le tableau `teleproAllowedFields` (lignes 78-82), ajouter `"category"` :

```ts
    "is_owner", "installation_type", "electricity_type", "commentaire", "category",
```

- [ ] **Step 5: Type-check intermédiaire**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

#### Formulaires de création

- [ ] **Step 6: `admin/leads/new/CreateLeadForm.tsx` — état + import + select**

1. Ajouter l'import (après les imports existants en haut du fichier) :

```ts
import { LEAD_CATEGORIES, LEAD_CATEGORY_LABELS } from "@/lib/types";
```

2. Dans l'état initial `form` (le champ `color: ""` est à la ligne 48), ajouter à côté :

```ts
    category: "fenetre",
```

3. Repérer le `<select>` du champ **Couleur** (value `form.color`, lignes ~278-281) et insérer juste avant son `<div>` parent le bloc suivant (reprendre les **mêmes classes CSS** que le `<div>`/`<label>`/`<select>` du champ Couleur voisin) :

```tsx
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
                <select
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {LEAD_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {LEAD_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
```

(Le submit envoie déjà `{ ...form }`, donc `category` part automatiquement.)

- [ ] **Step 7: `telepro/leads/new/CreateLeadForm.tsx` — état + import + select**

Identique au Step 6, dans ce fichier : import `LEAD_CATEGORIES, LEAD_CATEGORY_LABELS` ; ajouter `category: "fenetre",` à l'état `form` (à côté de `color: ""` ligne 37) ; insérer le même bloc `<select>` juste avant le champ **Couleur** (value `form.color`, lignes ~244-247), en reprenant les classes du champ Couleur voisin.

- [ ] **Step 8: Type-check + vérif manuelle (création)**

```bash
npx tsc --noEmit   # aucune erreur
npm run dev
```

Créer un lead (admin puis télépro) en choisissant une catégorie autre que Fenêtre → le lead apparaît bien dans le filtre de cette catégorie.

#### Formulaires d'édition

- [ ] **Step 9: `admin/leads/[id]/AdminLeadForm.tsx` — payload + import + select**

1. Ajouter l'import :

```ts
import { LEAD_CATEGORIES, LEAD_CATEGORY_LABELS } from "@/lib/types";
```

2. Dans la fonction `buildUpdates`, après `color: lead.color,` (ligne 52), ajouter :

```ts
    category: lead.category,
```

3. Repérer le `<select>` **Couleur** (value `(lead.color as string) || ""`, lignes ~426-428) et insérer juste avant son `<div>` parent (mêmes classes que le champ Couleur voisin) :

```tsx
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
              <select
                value={(lead.category as string) || "fenetre"}
                onChange={(e) => updateField("category", e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {LEAD_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {LEAD_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
```

- [ ] **Step 10: `telepro/leads/TeleproLeadForm.tsx` — payload + import + select**

1. Ajouter l'import :

```ts
import { LEAD_CATEGORIES, LEAD_CATEGORY_LABELS } from "@/lib/types";
```

2. Dans la fonction `pickLeadFields`, après `color: l.color,` (ligne 91), ajouter :

```ts
    category: l.category,
```

3. Repérer le `<select>` **Couleur** (value `(lead.color as string) || ""`, lignes ~470-474) et insérer juste avant son `<div>` parent (mêmes classes que le champ Couleur voisin) :

```tsx
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
              <select
                value={(lead.category as string) || "fenetre"}
                onChange={(e) => handleFieldChange("category", e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {LEAD_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {LEAD_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
```

- [ ] **Step 11: Type-check**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 12: Vérification manuelle (édition)**

```bash
npm run dev
```

Ouvrir un lead existant (admin puis télépro), changer sa catégorie, laisser l'auto-save s'exécuter (ou enregistrer), recharger la page → la nouvelle catégorie est conservée, et le lead suit le filtre de catégorie correspondant.

- [ ] **Step 13: Commit**

```bash
git add "src/app/api/admin/create-lead/route.ts" "src/app/api/telepro/create-lead/route.ts" "src/app/api/admin/lead/[id]/route.ts" "src/app/api/telepro/lead/[id]/route.ts" "src/app/(app)/admin/leads/new/CreateLeadForm.tsx" "src/app/(app)/telepro/leads/new/CreateLeadForm.tsx" "src/app/(app)/admin/leads/[id]/AdminLeadForm.tsx" "src/app/(app)/telepro/leads/TeleproLeadForm.tsx"
git commit -m "feat(leads): catégorie modifiable à la création et à l'édition (formulaires + API)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Déploiement (après les 5 tâches)

1. **Appliquer la migration** dans le SQL Editor de Supabase : coller le contenu de `supabase/migrations/034_lead_category.sql` et l'exécuter. (Le `UPDATE leads SET category = 'fenetre';` final garantit que **tous** les leads existants sont en Fenêtre.)
2. Vérifier que la colonne `category` existe (`select category, count(*) from leads group by category;` → tout en `fenetre`).
3. Déployer l'application (la cible Netlify vs Vercel reste à trancher — hors périmètre de ce plan).

## Récapitulatif de couverture du spec

- Colonne `category` ENUM + défaut `fenetre` + backfill SQL → **Task 1**.
- 3 catégories avec libellés exacts (€) → **Global Constraints + Task 1**.
- Filtrage par catégorie, tous les espaces → **Task 2** (requête) + **Task 3** (barre de filtres) + **Task 4** (menu).
- Menu imbriqué catégorie→statuts avec compteurs → **Task 4**.
- Catégorie modifiable à la création/édition (admin + télépro) → **Task 5**.
- Import CSV → couvert par le `DEFAULT` (aucune tâche dédiée, conforme au « hors périmètre » du spec).

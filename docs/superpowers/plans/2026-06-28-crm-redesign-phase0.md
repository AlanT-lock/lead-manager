# Refonte CRM — Phase 0 (Fondations & filet de sécurité) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser les fondations de la refonte (design tokens + Inter, shadcn/ui, composants de base et métier) et le filet de sécurité Playwright (harness + tests des parcours critiques sur l'UI actuelle), SANS changer le visuel des écrans existants ni aucune logique.

**Architecture:** On centralise les tokens dans `globals.css` (Tailwind v4 `@theme`), on installe shadcn/ui sous `src/components/ui/`, on crée des composants métier réutilisables sous `src/components/`, et on met en place Playwright avec une authentification par rôle réutilisable (storageState). Les tests E2E sont écrits MAINTENANT, sur l'UI actuelle, pour figer le comportement attendu avant la refonte visuelle des phases suivantes.

**Tech Stack:** Next.js 15 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · lucide-react · @playwright/test · Supabase.

## Global Constraints

- **Phase 0 ne change AUCUN visuel d'écran existant** : on ajoute des tokens, des composants (non encore branchés), des `data-testid`, et des tests. Les écrans rendus restent identiques à l'œil.
- **Aucune modification** de logique métier, schéma DB, migrations, routes API, requêtes, ou logique de rôles.
- **Tokens (direction C)** — valeurs exactes : primary `#2563eb` (hover `#1d4ed8`), accent `#3b82f6`, sidebar dégradé `#0b1f3a`→`#13294b`, fond `#f4f7fb`, surface `#ffffff`, bordure `#e1e8f2`, texte fort `#0b1f3a`, atténué `#64748b`. Sémantiques : succès `#22c55e`/`#dcfce7`/`#15803d`, attention `#eab308`/`#fef9c3`/`#a16207`, erreur `#ef4444`/`#fee2e2`/`#b91c1c`, info `#4338ca`/`#e0e7ff`. Chip Fenêtre `#e0ecfe`/`#2563eb`, chip neutre `#f1f5f9`/`#64748b`. Rayons : boutons/inputs `9px`, cartes `12px`. Police : **Inter** via `next/font`.
- **Source de vérité statuts/catégories** : `src/lib/types.ts` (`LeadStatus`, `LeadCategory`, `LEAD_STATUS_LABELS`, `LEAD_CATEGORY_LABELS`, `STATUS_CHART_COLORS`). Les composants `StatusBadge`/`CategoryChip` en dérivent — ne pas dupliquer les libellés.
- **Vérification** : `npx tsc --noEmit` à 0 erreur à chaque tâche. Pour les tests Playwright auth-dépendants, voir « Prérequis tests » — les sous-agents vérifient `tsc` + `npx playwright test --list` (les tests compilent et sont découverts) ; l'exécution complète se fait quand `.env.test.local` est renseigné.
- **Convention de commit** : messages en français, préfixe `feat(...)`/`chore(...)`/`test(...)`, terminés par `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

## Prérequis tests (externe, fourni par l'utilisateur — documenté, non bloquant pour écrire les tests)

Les tests E2E qui passent l'authentification ont besoin de comptes de test et d'identifiants. Fichier `.env.test.local` (non commité, déjà couvert par `.gitignore` via `.env*`) :

```
E2E_BASE_URL=http://localhost:3000
E2E_ADMIN_EMAIL=...           E2E_ADMIN_PASSWORD=...
E2E_SECRETAIRE_EMAIL=...      E2E_SECRETAIRE_PASSWORD=...
E2E_TELEPRO_EMAIL=...         E2E_TELEPRO_PASSWORD=...
```

Les tests sont **auto-semants** : ils créent leurs propres leads via l'UI puis les filtrent/éditent, donc aucune donnée pré-remplie n'est requise — seulement les 3 comptes ci-dessus pointant sur l'instance Supabase de dev/test. Tant que `.env.test.local` est absent, la suite auth est ignorée proprement (skip), et seuls les tests sans auth tournent.

## File Structure (Phase 0)

- `src/app/globals.css` — tokens (modifié)
- `src/app/layout.tsx` — chargement Inter via `next/font` (modifié)
- `components.json`, `src/lib/utils.ts`, `src/components/ui/*` — shadcn (créés)
- `src/components/StatusBadge.tsx`, `src/components/CategoryChip.tsx` — créés
- `src/components/ui-kit/PageHeader.tsx`, `StatCard.tsx` — créés (composants métier d'habillage)
- `playwright.config.ts`, `e2e/` (setup + specs) — créés
- `package.json` — scripts/deps (modifié)
- `data-testid` ajoutés dans quelques composants existants (modifiés, non visuels)

---

### Task 1: Design tokens + police Inter

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: variables CSS de thème utilisables en Tailwind (`bg-[var(--color-primary)]` ou via `@theme` les utilitaires `bg-primary`, etc.) et la police Inter appliquée au `body`.

- [ ] **Step 1: Réécrire `globals.css` avec les tokens**

Remplacer tout le contenu de `src/app/globals.css` par :

```css
@import "tailwindcss";

:root {
  --background: #f4f7fb;
  --foreground: #0b1f3a;

  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-accent: #3b82f6;
  --color-surface: #ffffff;
  --color-border: #e1e8f2;
  --color-muted: #64748b;

  --sidebar-from: #0b1f3a;
  --sidebar-to: #13294b;

  --color-success: #22c55e;
  --color-success-bg: #dcfce7;
  --color-success-fg: #15803d;
  --color-warning: #eab308;
  --color-warning-bg: #fef9c3;
  --color-warning-fg: #a16207;
  --color-danger: #ef4444;
  --color-danger-bg: #fee2e2;
  --color-danger-fg: #b91c1c;
  --color-info: #4338ca;
  --color-info-bg: #e0e7ff;

  --radius-control: 9px;
  --radius-card: 12px;
  --shadow-soft: 0 1px 2px rgba(13, 38, 76, .06);
  --shadow-elevated: 0 10px 30px rgba(11, 31, 58, .18);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-mono: ui-monospace, monospace;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
}
```

- [ ] **Step 2: Charger Inter via `next/font` dans `layout.tsx`**

Lire `src/app/layout.tsx`. En haut, ajouter l'import et instancier la police, puis appliquer la variable `--font-inter` sur `<html>` (ou `<body>`). Exemple à intégrer en respectant la structure existante du fichier :

```tsx
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
```

Et ajouter `className={inter.variable}` sur la balise racine (`<html lang="fr" className={inter.variable}>` ou équivalent selon le fichier). Ne PAS changer le reste du layout.

- [ ] **Step 3: Vérifier le type-check**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 4: Vérifier visuellement (non-régression)**

```bash
npm run dev
```
Charger `/login` : la police passe à Inter, le fond reste clair. Aucun écran ne doit être « cassé ». (Les couleurs des écrans existants ne bougent pas encore : les tokens ne sont pas branchés sur les composants en Phase 0.)

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat(ui): tokens de design (direction C) + police Inter via next/font

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Installer shadcn/ui + primitives de base

**Files:**
- Create: `components.json`, `src/lib/utils.ts`, `src/components/ui/*`
- Modify: `package.json` (deps ajoutées par le CLI)

**Interfaces:**
- Produces: `cn()` dans `src/lib/utils.ts` ; primitives `Button`, `Input`, `Select`, `Card`, `Badge`, `Dialog`, `DropdownMenu`, `Table`, `Tabs`, `Skeleton`, `Sonner` (toast) sous `src/components/ui/`.

- [ ] **Step 1: Initialiser shadcn/ui (non-interactif)**

Run (depuis `/Users/alantouati/lead-manager`) — le drapeau `-d` évite toute invite interactive (le shell de ce harness ne supporte pas les prompts) :
```bash
npx shadcn@latest init -d
```
Cela crée `components.json` et `src/lib/utils.ts` (`cn`). La base color choisie par `-d` est **sans importance** : nos couleurs sont gouvernées par les tokens de Task 1 dans `globals.css`.

- [ ] **Step 2: Re-fusionner les tokens si `init` a modifié `globals.css`**

`shadcn init` peut réécrire `src/app/globals.css` (ajout de ses variables et d'un thème). Lire le fichier et s'assurer que **les tokens de Task 1 ET le `body { font-family: var(--font-inter)… }` sont toujours présents**. Si `init` les a retirés/écrasés : garder les variables ajoutées par shadcn (ne pas les supprimer — les primitives en dépendent) ET re-ajouter, dans le `:root`, nos tokens personnalisés de Task 1 (`--color-primary`, `--color-accent`, `--sidebar-from/to`, sémantiques, rayons, ombres) + remettre la règle `body { font-family: var(--font-inter), ui-sans-serif, system-ui, sans-serif; }`. Les deux ensembles de variables coexistent.

- [ ] **Step 3: Ajouter les primitives (non-interactif)**

Run :
```bash
npx shadcn@latest add button input select textarea checkbox card badge dialog dropdown-menu table tabs skeleton sonner tooltip --yes
```

- [ ] **Step 4: Vérifier le type-check**

Run: `npx tsc --noEmit`
Expected: 0 erreur. (Si un composant généré référence un paquet manquant, l'`add` l'installe ; relancer `npm install` au besoin.)

- [ ] **Step 5: Vérifier que rien n'est cassé**

Run: `npm run build` (ou `npm run dev` et charger `/login`) — l'app compile, aucun écran existant n'est modifié (les primitives ne sont pas encore utilisées).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(ui): init shadcn/ui + primitives de base (button, input, card, table, dialog, badge…)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Composants métier StatusBadge + CategoryChip

**Files:**
- Create: `src/components/StatusBadge.tsx`, `src/components/CategoryChip.tsx`

**Interfaces:**
- Consumes: `LeadStatus`, `LeadCategory`, `LEAD_STATUS_LABELS`, `LEAD_CATEGORY_LABELS` de `@/lib/types`.
- Produces: `<StatusBadge status={LeadStatus} />` et `<CategoryChip category={LeadCategory} />`.

- [ ] **Step 1: Créer `src/components/StatusBadge.tsx`**

```tsx
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/types";

const STATUS_BADGE: Record<LeadStatus, string> = {
  nouveau: "bg-slate-100 text-slate-700",
  nrp: "bg-[#fef9c3] text-[#a16207]",
  a_rappeler: "bg-[#ffedd5] text-[#c2410c]",
  en_attente_doc: "bg-[#ede9fe] text-[#6d28d9]",
  documents_recus: "bg-[#e0e7ff] text-[#4338ca]",
  incomplet: "bg-[#fef3c7] text-[#b45309]",
  bloque_mpr: "bg-[#fee2e2] text-[#b91c1c]",
  valide: "bg-[#dcfce7] text-[#15803d]",
  installe: "bg-[#ccfbf1] text-[#0f766e]",
  ancien_documents_recus: "bg-slate-100 text-slate-500",
  annule: "bg-[#fee2e2] text-[#b91c1c]",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      data-testid="status-badge"
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[status]}`}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}
```

- [ ] **Step 2: Créer `src/components/CategoryChip.tsx`**

```tsx
import { LEAD_CATEGORY_LABELS, type LeadCategory } from "@/lib/types";

const CATEGORY_CHIP: Record<LeadCategory, string> = {
  fenetre: "bg-[#e0ecfe] text-[#2563eb]",
  clim_1euro: "bg-slate-100 text-slate-600",
  clim_3990euros: "bg-slate-100 text-slate-600",
};

export function CategoryChip({ category }: { category: LeadCategory }) {
  return (
    <span
      data-testid="category-chip"
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_CHIP[category]}`}
    >
      {LEAD_CATEGORY_LABELS[category]}
    </span>
  );
}
```

- [ ] **Step 3: Vérifier le type-check**

Run: `npx tsc --noEmit`
Expected: 0 erreur. (Le `Record<LeadStatus, …>` force la couverture exhaustive des statuts — si un statut manque, tsc échoue.)

- [ ] **Step 4: Commit**

```bash
git add src/components/StatusBadge.tsx src/components/CategoryChip.tsx
git commit -m "feat(ui): composants StatusBadge et CategoryChip (dérivés de types.ts)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Composants d'habillage PageHeader + StatCard

**Files:**
- Create: `src/components/ui-kit/PageHeader.tsx`, `src/components/ui-kit/StatCard.tsx`

**Interfaces:**
- Produces: `<PageHeader title subtitle? actions? />` et `<StatCard label value hint? />`.

- [ ] **Step 1: Créer `src/components/ui-kit/PageHeader.tsx`**

```tsx
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-[#0b1f3a]">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-[#64748b]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
```

- [ ] **Step 2: Créer `src/components/ui-kit/StatCard.tsx`**

```tsx
export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-[12px] border border-[#e1e8f2] bg-white p-4 shadow-[0_1px_2px_rgba(13,38,76,.06)]">
      <div className="text-xs font-medium text-[#64748b]">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-[#0b1f3a]">{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-[#94a3b8]">{hint}</div> : null}
    </div>
  );
}
```

- [ ] **Step 3: Vérifier le type-check**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui-kit/PageHeader.tsx src/components/ui-kit/StatCard.tsx
git commit -m "feat(ui): composants d'habillage PageHeader et StatCard

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Harness Playwright + authentification par rôle

**Files:**
- Create: `playwright.config.ts`, `e2e/auth.setup.ts`, `e2e/helpers.ts`
- Modify: `package.json` (scripts + devDependency)
- Modify: `.gitignore` (ignorer `e2e/.auth/` et `test-results/`, `playwright-report/`)

**Interfaces:**
- Produces: projets Playwright `setup` (login par rôle → storageState) + `chromium-admin`/`chromium-secretaire`/`chromium-telepro` ; helper `requireE2EEnv()` qui skip si `.env.test.local` absent.

- [ ] **Step 1: Installer Playwright**

Run :
```bash
npm install -D @playwright/test dotenv
npx playwright install chromium
```

- [ ] **Step 2: `playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test.local" });

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL, trace: "on-first-retry" },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "admin", testMatch: /.*\.admin\.spec\.ts/, dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/admin.json" } },
    { name: "telepro", testMatch: /.*\.telepro\.spec\.ts/, dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/telepro.json" } },
    { name: "public", testMatch: /.*\.public\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.E2E_NO_SERVER ? undefined : {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

- [ ] **Step 3: `e2e/helpers.ts`**

```ts
import { test as base } from "@playwright/test";

export const hasAuthEnv =
  !!process.env.E2E_ADMIN_EMAIL && !!process.env.E2E_ADMIN_PASSWORD;

export const test = base;
export { expect } from "@playwright/test";
```

- [ ] **Step 4: `e2e/auth.setup.ts`** (connexion par rôle, sauvegarde storageState)

```ts
import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";

const roles = [
  { file: "e2e/.auth/admin.json", email: process.env.E2E_ADMIN_EMAIL, pwd: process.env.E2E_ADMIN_PASSWORD, expect: /\/admin/ },
  { file: "e2e/.auth/telepro.json", email: process.env.E2E_TELEPRO_EMAIL, pwd: process.env.E2E_TELEPRO_PASSWORD, expect: /\/telepro/ },
];

for (const r of roles) {
  setup(`auth ${r.file}`, async ({ page }) => {
    setup.skip(!r.email || !r.pwd, "identifiants E2E absents (.env.test.local)");
    fs.mkdirSync("e2e/.auth", { recursive: true });
    await page.goto("/login");
    await page.locator("#email").fill(r.email!);
    await page.locator("#password").fill(r.pwd!);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL(r.expect, { timeout: 15_000 });
    await page.context().storageState({ path: r.file });
  });
}
```

- [ ] **Step 5: Scripts `package.json` + `.gitignore`**

Ajouter dans `package.json` → `scripts` :
```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```
Ajouter à `.gitignore` :
```
# playwright
/test-results
/playwright-report
/e2e/.auth
```

- [ ] **Step 6: Vérifier (sans identifiants)**

Run: `npx tsc --noEmit` → 0 erreur.
Run: `npx playwright test --list` → liste les tests sans les exécuter (vérifie que la config compile et découvre les specs). Le projet `setup` skippera proprement si pas d'identifiants.

- [ ] **Step 7: Commit**

```bash
git add playwright.config.ts e2e/ package.json package-lock.json .gitignore
git commit -m "test(e2e): harness Playwright + auth par rôle (storageState), skip si pas d'identifiants

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: data-testid stables sur les éléments critiques

**Files:**
- Modify: `src/app/login/page.tsx`, `src/components/Drawer.tsx`, `src/app/(app)/admin/leads/AdminLeadsFilters.tsx`, `src/app/(app)/admin/leads/AdminLeadsTable.tsx`, `src/app/(app)/admin/leads/new/CreateLeadForm.tsx`

**Interfaces:**
- Produces: attributs `data-testid` lus par les tests des Tasks 7-9. Convention : kebab-case, stable, non lié au style.

> Ces ajouts sont **non visuels** (attribut HTML seulement). Lire chaque fichier et ajouter l'attribut sur l'élément indiqué, sans rien changer d'autre.

- [ ] **Step 1: `login/page.tsx`** — sur le `<form>`, ajouter `data-testid="login-form"`. (Les inputs `#email`/`#password` et le bouton « Se connecter » servent déjà de sélecteurs.)

- [ ] **Step 2: `Drawer.tsx`** — sur le `<Link>` principal de l'item à sous-menu (« Tous les leads » / « Mes leads »), ajouter `data-testid="nav-leads"`. Sur le bouton flèche de niveau 0, `data-testid="nav-leads-toggle"`. Sur le `<Link>` d'une catégorie, `data-testid={`nav-category-${cat}`}`. Sur le `<Link>` d'un statut sous catégorie, `data-testid={`nav-status-${cat}-${s}`}`.

- [ ] **Step 3: `AdminLeadsFilters.tsx`** — `data-testid="filter-search"` sur l'input de recherche, `data-testid="filter-category"` sur le `<select>` Catégorie, `data-testid="filter-status"` sur le `<select>` Statut.

- [ ] **Step 4: `AdminLeadsTable.tsx`** — lire le fichier ; sur l'élément qui représente une ligne de lead, ajouter `data-testid="lead-row"` (et si un identifiant est disponible, `data-lead-id={lead.id}`).

- [ ] **Step 5: `CreateLeadForm.tsx` (admin/new)** — `data-testid="lead-create-form"` sur le `<form>`, et `data-testid="lead-category-select"` sur le `<select>` Catégorie ajouté en feature précédente.

- [ ] **Step 6: Vérifier**

Run: `npx tsc --noEmit` → 0 erreur. `npm run dev` + charger `/admin/leads` et `/login` : aucun changement visuel.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test(e2e): data-testid stables (login, menu, filtres, table, formulaire lead)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: E2E — connexion, redirection par rôle, déconnexion

**Files:**
- Create: `e2e/auth.public.spec.ts`, `e2e/redirect.admin.spec.ts`, `e2e/redirect.telepro.spec.ts`

**Interfaces:**
- Consumes: storageState (Task 5), `data-testid="login-form"` (Task 6).

- [ ] **Step 1: `e2e/auth.public.spec.ts`** (sans auth — rendu + erreur d'identifiants)

```ts
import { test, expect } from "@playwright/test";

test("la page de login s'affiche", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByTestId("login-form")).toBeVisible();
  await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
});

test("mauvais identifiants → message d'erreur, reste sur /login", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill("inexistant@example.com");
  await page.locator("#password").fill("mauvaismotdepasse");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/login/);
});
```

- [ ] **Step 2: `e2e/redirect.admin.spec.ts`** (projet admin, déjà connecté)

```ts
import { test, expect } from "@playwright/test";

test("admin connecté atterrit dans l'espace admin", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByTestId("nav-leads")).toBeVisible();
});

test("admin peut se déconnecter", async ({ page }) => {
  await page.goto("/admin");
  await page.getByRole("button", { name: "Déconnexion" }).click();
  await expect(page).toHaveURL(/\/login/);
});
```

- [ ] **Step 3: `e2e/redirect.telepro.spec.ts`** (projet telepro)

```ts
import { test, expect } from "@playwright/test";

test("télépro connecté atterrit dans l'espace télépro", async ({ page }) => {
  await page.goto("/telepro");
  await expect(page).toHaveURL(/\/telepro/);
  await expect(page.getByTestId("nav-leads")).toBeVisible();
});

test("télépro n'accède pas à l'espace admin (redirigé)", async ({ page }) => {
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/telepro/);
});
```

- [ ] **Step 4: Vérifier**

Run: `npx tsc --noEmit` → 0 erreur. `npx playwright test --list` → les 3 specs apparaissent. Si `.env.test.local` est fourni : `npm run test:e2e` → vert (sinon `auth.public.spec.ts` tourne seul, les projets admin/telepro skippent faute de storageState).

- [ ] **Step 5: Commit**

```bash
git add e2e/auth.public.spec.ts e2e/redirect.admin.spec.ts e2e/redirect.telepro.spec.ts
git commit -m "test(e2e): connexion, redirection par rôle, déconnexion

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: E2E — filtres leads (statut / catégorie / recherche) + menu imbriqué

**Files:**
- Create: `e2e/leads-filters.admin.spec.ts`, `e2e/nested-menu.admin.spec.ts`

**Interfaces:**
- Consumes: `data-testid` de Task 6 (`filter-*`, `nav-*`, `lead-row`).

- [ ] **Step 1: `e2e/leads-filters.admin.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("filtre catégorie met à jour l'URL", async ({ page }) => {
  await page.goto("/admin/leads");
  await page.getByTestId("filter-category").selectOption("fenetre");
  await expect(page).toHaveURL(/category=fenetre/);
});

test("filtre statut met à jour l'URL", async ({ page }) => {
  await page.goto("/admin/leads");
  await page.getByTestId("filter-status").selectOption("nouveau");
  await expect(page).toHaveURL(/status=nouveau/);
});

test("recherche met à jour l'URL (param q)", async ({ page }) => {
  await page.goto("/admin/leads");
  await page.getByTestId("filter-search").fill("Dupont");
  await expect(page).toHaveURL(/q=Dupont/, { timeout: 5000 });
});
```

- [ ] **Step 2: `e2e/nested-menu.admin.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("le menu déploie catégories puis statuts et navigue avec les bons params", async ({ page }) => {
  await page.goto("/admin");
  await page.getByTestId("nav-leads-toggle").click();
  const fenetre = page.getByTestId("nav-category-fenetre");
  await expect(fenetre).toBeVisible();
  await fenetre.click();
  await expect(page).toHaveURL(/\/admin\/leads\?.*category=fenetre/);
});
```

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit` → 0 erreur. `npx playwright test --list`. Avec identifiants : `npm run test:e2e` → vert.

- [ ] **Step 4: Commit**

```bash
git add e2e/leads-filters.admin.spec.ts e2e/nested-menu.admin.spec.ts
git commit -m "test(e2e): filtres leads (statut/catégorie/recherche) + menu imbriqué

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: E2E — création + édition de lead (auto-semant)

**Files:**
- Create: `e2e/lead-create.admin.spec.ts`

**Interfaces:**
- Consumes: `data-testid="lead-create-form"`, `data-testid="lead-category-select"` (Task 6).

- [ ] **Step 1: `e2e/lead-create.admin.spec.ts`** (crée un lead avec catégorie, puis vérifie qu'il est filtrable)

```ts
import { test, expect } from "@playwright/test";

test("création d'un lead avec catégorie Clim 1 €, puis filtrable", async ({ page }) => {
  const stamp = Date.now().toString().slice(-6);
  const nom = `E2E${stamp}`;

  await page.goto("/admin/leads/new");
  await expect(page.getByTestId("lead-create-form")).toBeVisible();

  // Champs requis (prénom, nom, téléphone) + catégorie. Sélecteurs robustes par label.
  await page.getByLabel("Prénom").fill("Test");
  await page.getByLabel("Nom").fill(nom);
  await page.getByLabel("Téléphone").fill(`06${stamp}0000`.slice(0, 10));
  await page.getByTestId("lead-category-select").selectOption("clim_1euro");

  // Le formulaire impose un télépro assigné côté admin : sélectionner le premier disponible.
  const assign = page.getByLabel("Télépro");
  if (await assign.count()) {
    await assign.selectOption({ index: 1 });
  }

  await page.getByRole("button", { name: /Créer|Ajouter|Enregistrer/ }).click();

  // Retour liste, puis filtrer par catégorie + recherche → le lead doit apparaître.
  await page.goto("/admin/leads?category=clim_1euro");
  await page.getByTestId("filter-search").fill(nom);
  await expect(page.getByText(nom)).toBeVisible({ timeout: 8000 });
});
```

> Note implémenteur : si les `getByLabel(...)` ne correspondent pas exactement aux libellés du formulaire actuel, lire `src/app/(app)/admin/leads/new/CreateLeadForm.tsx` et ajuster les libellés/sélecteurs aux champs réels (le test reste valable, seuls les sélecteurs s'adaptent). Ne pas modifier le formulaire pour le test au-delà des `data-testid` de Task 6.

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit` → 0 erreur. `npx playwright test --list`. Avec identifiants : `npm run test:e2e e2e/lead-create.admin.spec.ts` → vert.

- [ ] **Step 3: Commit**

```bash
git add e2e/lead-create.admin.spec.ts
git commit -m "test(e2e): création de lead avec catégorie (auto-semant) + filtrage

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Hors périmètre Phase 0 (phases suivantes)

- Brancher réellement tokens/composants sur les écrans (= Phases 1-4, le restyle visuel).
- Tests E2E import CSV et upload document : ajoutés en Phase 2 (espace admin) avec un fichier d'exemple, quand ces écrans sont refondus — listés ici pour mémoire, pas implémentés en Phase 0.
- Toute modification visuelle d'un écran existant.

## Récapitulatif de couverture (spec Phase 0)

- Tokens + Inter → Task 1.
- shadcn/ui + primitives → Task 2.
- Composants métier (StatusBadge, CategoryChip, PageHeader, StatCard) → Tasks 3-4. (`FilterBar`/`DataTable` sont créés en Phase 1-2 au moment où ils sont branchés, pour éviter du code mort en Phase 0 — YAGNI.)
- Harness Playwright + auth par rôle → Task 5.
- data-testid → Task 6.
- Parcours critiques 1-5 (login/rôles, filtres, menu, création) → Tasks 7-9. Parcours 6-7 (import CSV, upload doc) → Phase 2.
```

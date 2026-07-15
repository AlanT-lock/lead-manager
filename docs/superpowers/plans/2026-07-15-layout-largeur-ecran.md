# Adapter les pages de leads à la largeur de l'écran — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supprimer le scroll horizontal de page sur les pages de leads en petit écran, pour que filtres, bouton d'ajout et pagination restent toujours dans la largeur du viewport.

**Architecture:** Une seule classe CSS. `<main>` du layout `(app)` est un enfant flex sans `min-w-0` : sa `min-width: auto` implicite l'empêche de rétrécir sous la largeur intrinsèque de son contenu, donc le tableau large gonfle la page entière au lieu de scroller dans son propre conteneur `overflow-x-auto`. Ajouter `min-w-0` rend le scroll au tableau et laisse tous les autres composants — déjà responsives — tenir dans l'écran.

**Tech Stack:** Next.js 15 (App Router), Tailwind CSS 4, Playwright.

**Spec:** `docs/superpowers/specs/2026-07-15-layout-largeur-ecran-design.md`

## Global Constraints

- Ne modifier ni les filtres, ni `PageHeader`, ni `LeadsPagination`, ni les tableaux : la spec les a vérifiés comme déjà corrects. Les toucher soignerait un symptôme.
- Le scroll horizontal **du tableau, dans son propre cadre**, est un résultat attendu — pas un défaut à corriger.
- Le test e2e doit être **constaté en échec avant** le correctif. Un test qui passe des deux côtés ne prouve rien et rend le plan inutile.
- Les specs `.admin.spec.ts` se skippent sans `.env.test.local` (`hasAuthEnv` dans `e2e/helpers.ts`) : suivre ce motif existant.
- Le lint du repo est cassé indépendamment (`eslint.config.mjs` en flat config avec ESLint 8) : utiliser `npx tsc --noEmit`, pas `npm run lint`.

---

### Task 1: Le layout ne déborde plus en 13 pouces

**Files:**
- Create: `e2e/layout-largeur.admin.spec.ts`
- Modify: `src/app/(app)/layout.tsx:96`

**Interfaces:**
- Consumes: `hasAuthEnv` depuis `e2e/helpers.ts` (booléen : identifiants E2E présents).
- Produces: rien que d'autres tâches consomment.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `e2e/layout-largeur.admin.spec.ts` :

```ts
import { test, expect } from "@playwright/test";
import { hasAuthEnv } from "./helpers";

test.skip(!hasAuthEnv, "identifiants E2E absents (.env.test.local)");

// 1280x800 : un écran 13 pouces, la taille où la gêne a été signalée.
test.use({ viewport: { width: 1280, height: 800 } });

test("/admin/leads ne scrolle pas horizontalement en 13 pouces", async ({ page }) => {
  await page.goto("/admin/leads");

  // Prouve d'abord que la page a chargé : sans ça, un échec de rendu
  // donnerait une page vide qui ne déborde pas, et le test passerait pour
  // la mauvaise raison.
  await expect(page.getByTestId("filter-search")).toBeVisible();

  const overflow = await page.evaluate(() => {
    const el = document.documentElement;
    return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
  });

  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
});

test("le tableau garde son propre scroll horizontal", async ({ page }) => {
  await page.goto("/admin/leads");
  await expect(page.getByTestId("filter-search")).toBeVisible();

  // Le débordement doit vivre dans le conteneur du tableau, pas dans la page.
  const container = page.locator('[data-slot="table-container"]').first();
  await expect(container).toBeVisible();

  const scrollable = await container.evaluate(
    (el) => el.scrollWidth > el.clientWidth
  );
  expect(scrollable).toBe(true);
});
```

- [ ] **Step 2: Lancer le test et constater qu'il échoue**

Ce test exige un vrai navigateur authentifié. Si `.env.test.local` est absent, le créer d'abord :

```
E2E_ADMIN_EMAIL=<email admin de test>
E2E_ADMIN_PASSWORD=<mot de passe>
E2E_TELEPRO_EMAIL=<email télépro de test>
E2E_TELEPRO_PASSWORD=<mot de passe>
```

Run: `npx playwright test layout-largeur.admin.spec.ts --project=admin`

Expected: le premier test **FAIL**, avec un `scrollWidth` strictement supérieur au `clientWidth` (par ex. `expect(1680).toBeLessThanOrEqual(1280)`).

**Si le test passe du premier coup, arrêter.** Cela invaliderait le diagnostic de la spec — élaboré par lecture du CSS, jamais observé dans un navigateur. Ne pas appliquer le correctif : reprendre l'investigation et comprendre pourquoi le débordement ne se produit pas. Causes possibles : jeu de données de test trop petit pour élargir le tableau (ajouter des leads), ou colonnes moins larges qu'en production.

Si le test se skippe faute d'identifiants, le correctif ne peut pas être prouvé. Le signaler explicitement plutôt que de le présenter comme vérifié.

- [ ] **Step 3: Appliquer le correctif**

Dans `src/app/(app)/layout.tsx`, ligne 96, ajouter `min-w-0` :

```tsx
        <main className="flex-1 min-w-0 lg:ml-64 min-h-screen pt-4 pb-8 px-4 lg:px-8 bg-[#f4f7fb]">
```

- [ ] **Step 4: Relancer le test et constater qu'il passe**

Run: `npx playwright test layout-largeur.admin.spec.ts --project=admin`

Expected: les deux tests **PASS**. La page ne déborde plus, et le débordement est bien passé dans le conteneur du tableau.

- [ ] **Step 5: Vérifier qu'aucune autre page n'a régressé**

Le layout est partagé par tout l'espace `(app)` : un changement de largeur y touche chaque page.

Run: `npx playwright test --project=admin --project=telepro`

Expected: PASS (ou skip sans identifiants).

Puis :

Run: `npx tsc --noEmit`

Expected: aucune sortie.

- [ ] **Step 6: Vérifier à l'œil**

Ouvrir `/admin/leads` dans une fenêtre de 1280 px de large et confirmer :
- aucune barre de scroll horizontale sur la page ;
- filtres, bouton « Ajouter un lead » et pagination entièrement visibles sans scroller ;
- le tableau scrolle horizontalement dans son cadre.

- [ ] **Step 7: Commit**

```bash
git add e2e/layout-largeur.admin.spec.ts "src/app/(app)/layout.tsx"
git commit -m "$(cat <<'EOF'
fix(layout): les pages de leads tiennent dans la largeur de l'écran

<main> est un enfant flex : sa min-width: auto implicite l'empêchait de rétrécir
sous la largeur de son contenu. Le tableau large gonflait donc la page entière au
lieu de scroller dans son conteneur overflow-x-auto, emportant filtres, bouton
d'ajout et pagination — tous déjà responsives — hors de l'écran.

Invisible sur grand écran, où le tableau tient dans la largeur disponible.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

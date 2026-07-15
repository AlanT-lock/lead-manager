# Pagination des listes de leads (admin + secrétaire) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Paginer côté serveur les deux listes de leads servies aux rôles admin et secrétaire
(`/admin/leads` et `/admin/documents-recus`) — 25/50/100/200 par page, navigation numérotée, taille
mémorisée par cookie — sans toucher à la liste télépro.

**Architecture:** Les pages sont des Server Components dont tous les filtres transitent déjà par
`searchParams`. On ajoute `page`/`per`/`sort`/`dir` au même contrat d'URL, on remplace le `select()`
complet par `select(..., { count: "exact" }) + .range()`, et on rend un composant client
`LeadsPagination` sous chaque tableau. Le tri `status_changed_at`, aujourd'hui local à la table,
passe dans l'URL pour rester juste sur l'ensemble du résultat. La taille de page est mémorisée dans
un cookie lisible côté serveur, afin que la page se rende directement à la bonne taille.

**Tech Stack:** Next.js 15 (App Router, Server Components, `cookies()` de `next/headers`),
Supabase JS (`@supabase/supabase-js`, service-role client), React 18, Tailwind, lucide-react.
Tests : Vitest (unitaire, nouveau) + Playwright (e2e, existant).

## Global Constraints

- **Périmètre strict** : seules `/admin/leads` et `/admin/documents-recus` sont paginées.
  `/telepro/leads` ne doit **subir aucune modification**. `/admin/redistribute` n'est **pas paginée**
  (elle est seulement mise à jour pour le tri, en Task 8).
- **Aucun garde-fou de rôle à écrire** : ces routes sont déjà réservées à admin + secrétaire par
  `src/lib/supabase/middleware.ts:76-81` et `src/app/(app)/admin/layout.tsx:36`.
- **Tailles autorisées** : `25, 50, 100, 200`. **Défaut : `50`**.
- **Cookie** : nom `leads_per_page`, `path=/`, `max-age=31536000` (1 an), `samesite=lax`.
  L'URL prime toujours sur le cookie.
- **Toute requête paginée finit par `.order("id", { ascending: false })`** — sans ordre total, un lead
  peut apparaître deux fois ou être sauté entre deux pages.
- **Tout changement de filtre ou de taille ramène en page 1** ; `per`, `sort` et `dir` sont préservés.
- **Style** : `<select>` HTML natif stylé à la main, comme les filtres existants. Ne **pas** importer
  `src/components/ui/select.tsx` (présent mais inutilisé dans tout le repo).
- **Langue** : tout le texte visible est en français.
- Après chaque tâche : `npx tsc --noEmit` doit renvoyer 0 erreur.
- Spec de référence : `docs/superpowers/specs/2026-07-14-pagination-leads-design.md`.

## Structure des fichiers

**Créés :**
| Fichier | Responsabilité |
|---|---|
| `vitest.config.ts` | Config du runner unitaire (Node, alias `@`, limité à `src/`) |
| `src/lib/pagination.ts` | Calcul pur : constantes, validation des params, séquence de numéros |
| `src/lib/pagination.test.ts` | Tests unitaires du module ci-dessus |
| `src/components/ui-kit/LeadsPagination.tsx` | Barre de pagination (client, présentationnel) |
| `e2e/leads-pagination.admin.spec.ts` | Tests e2e du contrat d'URL |

**Modifiés :**
| Fichier | Changement |
|---|---|
| `package.json` | devDep `vitest` + script `test` |
| `src/app/(app)/admin/leads/page.tsx` | `count`/`range`/tri/clamp + rendu de la barre |
| `src/app/(app)/admin/leads/AdminLeadsFilters.tsx` | `buildParams` préserve `per`/`sort`/`dir`, omet `page` |
| `src/app/(app)/admin/documents-recus/page.tsx` | idem page leads (tri `updated_at`) |
| `src/app/(app)/admin/documents-recus/DocumentsRecusFilters.tsx` | idem filtres leads |
| `src/app/(app)/admin/leads/AdminLeadsTable.tsx` | tri `status_changed_at` : état local → URL |
| `src/app/(app)/admin/redistribute/page.tsx` | applique le tri (réparation, pas de pagination) |

**Inchangés (vérifié) :** `DocumentsRecusTable.tsx` (ni sélection ni tri de colonne), et **toute** la
branche `/telepro`.

---

### Task 1: Vitest + validation des paramètres

Met en place le runner unitaire et les règles de validation. Sans lui, `?per=37` ou `?page=abc`
casserait la requête Supabase.

**Files:**
- Create: `vitest.config.ts`
- Create: `src/lib/pagination.ts`
- Create: `src/lib/pagination.test.ts`
- Modify: `package.json` (devDependencies + scripts)

**Interfaces:**
- Consumes: rien (premier task).
- Produces:
  - `PER_PAGE_OPTIONS: readonly [25, 50, 100, 200]`
  - `DEFAULT_PER_PAGE: 50`
  - `PER_PAGE_COOKIE: "leads_per_page"`
  - `parsePerPage(value: string | undefined | null): number`
  - `parsePage(value: string | undefined | null): number`
  - `pageCount(total: number, per: number): number`
  - `clampPage(page: number, count: number): number`

- [ ] **Step 1: Installer Vitest**

```bash
npm install -D vitest@^3
```

- [ ] **Step 2: Créer la config Vitest**

`include` limité à `src/` : `e2e/` appartient à Playwright (`testDir: "./e2e"`), et Vitest tenterait
sinon d'exécuter des specs Playwright.

```ts
// vitest.config.ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

- [ ] **Step 3: Ajouter le script npm**

Dans `package.json`, ajouter `"test": "vitest run"` et `"test:watch": "vitest"` au bloc `"scripts"`
(garder `test:e2e` tel quel) :

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  },
```

- [ ] **Step 4: Écrire les tests qui échouent**

```ts
// src/lib/pagination.test.ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PER_PAGE,
  PER_PAGE_OPTIONS,
  clampPage,
  pageCount,
  parsePage,
  parsePerPage,
} from "@/lib/pagination";

describe("parsePerPage", () => {
  it("accepte les tailles autorisées", () => {
    for (const option of PER_PAGE_OPTIONS) {
      expect(parsePerPage(String(option))).toBe(option);
    }
  });

  it("retombe sur le défaut si absent", () => {
    expect(parsePerPage(undefined)).toBe(DEFAULT_PER_PAGE);
    expect(parsePerPage(null)).toBe(DEFAULT_PER_PAGE);
    expect(parsePerPage("")).toBe(DEFAULT_PER_PAGE);
  });

  it("rejette une taille hors liste ou absurde", () => {
    expect(parsePerPage("37")).toBe(DEFAULT_PER_PAGE);
    expect(parsePerPage("0")).toBe(DEFAULT_PER_PAGE);
    expect(parsePerPage("-50")).toBe(DEFAULT_PER_PAGE);
    expect(parsePerPage("abc")).toBe(DEFAULT_PER_PAGE);
    expect(parsePerPage("1000000")).toBe(DEFAULT_PER_PAGE);
  });
});

describe("parsePage", () => {
  it("lit un numéro de page valide", () => {
    expect(parsePage("1")).toBe(1);
    expect(parsePage("7")).toBe(7);
  });

  it("retombe sur 1 pour tout le reste", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-5")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("1.5")).toBe(1);
  });
});

describe("pageCount", () => {
  it("arrondit au supérieur", () => {
    expect(pageCount(100, 50)).toBe(2);
    expect(pageCount(101, 50)).toBe(3);
  });

  it("renvoie toujours au moins 1 page", () => {
    expect(pageCount(0, 50)).toBe(1);
    expect(pageCount(10, 50)).toBe(1);
  });
});

describe("clampPage", () => {
  it("ramène dans les bornes", () => {
    expect(clampPage(8, 3)).toBe(3);
    expect(clampPage(0, 3)).toBe(1);
    expect(clampPage(2, 3)).toBe(2);
  });
});
```

- [ ] **Step 5: Lancer les tests pour vérifier qu'ils échouent**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "@/lib/pagination"` (le module n'existe pas encore).

- [ ] **Step 6: Écrire l'implémentation minimale**

```ts
// src/lib/pagination.ts

/** Tailles de page proposées dans les listes de leads (admin + secrétaire). */
export const PER_PAGE_OPTIONS = [25, 50, 100, 200] as const;

export const DEFAULT_PER_PAGE = 50;

/** Mémorise la taille choisie. Lu côté serveur : la page se rend directement à la bonne taille. */
export const PER_PAGE_COOKIE = "leads_per_page";

export function parsePerPage(value: string | undefined | null): number {
  const parsed = Number(value);
  return (PER_PAGE_OPTIONS as readonly number[]).includes(parsed) ? parsed : DEFAULT_PER_PAGE;
}

export function parsePage(value: string | undefined | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export function pageCount(total: number, per: number): number {
  return Math.max(1, Math.ceil(total / per));
}

export function clampPage(page: number, count: number): number {
  return Math.min(Math.max(page, 1), count);
}
```

> `Number("")` vaut `0` et `Number(null)` vaut `0` : les deux échouent au test d'appartenance et
> retombent sur le défaut, comme voulu.

- [ ] **Step 7: Lancer les tests pour vérifier qu'ils passent**

Run: `npm test`
Expected: PASS — 4 suites, 10 tests.

- [ ] **Step 8: Vérifier les types**

Run: `npx tsc --noEmit`
Expected: aucune sortie.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/pagination.ts src/lib/pagination.test.ts
git commit -m "test: ajoute Vitest + validation des paramètres de pagination"
```

---

### Task 2: Séquence de numéros de page (ellipses)

La logique la plus piégeuse du lot : bornes, doublons, et un « … » qui ne doit jamais masquer une
seule page (il prendrait autant de place que le numéro lui-même).

**Files:**
- Modify: `src/lib/pagination.ts`
- Modify: `src/lib/pagination.test.ts`

**Interfaces:**
- Consumes: rien de Task 1 (fonction indépendante, même module).
- Produces: `pageNumbers(current: number, total: number): (number | "ellipsis")[]`

**Règle :** ≤ 8 pages ⇒ tous les numéros. Au-delà ⇒ toujours la première et la dernière, plus les
deux voisines de part et d'autre de la page courante ; les trous deviennent `"ellipsis"`, sauf un trou
d'exactement une page qui est comblé par son numéro.

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à la fin de `src/lib/pagination.test.ts` (et compléter l'import existant en tête de fichier
pour y inclure `pageNumbers`) :

```ts
describe("pageNumbers", () => {
  it("affiche tous les numéros jusqu'à 8 pages", () => {
    expect(pageNumbers(1, 1)).toEqual([1]);
    expect(pageNumbers(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageNumbers(4, 8)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("condense autour de la page courante au-delà de 8 pages", () => {
    expect(pageNumbers(6, 25)).toEqual([1, "ellipsis", 4, 5, 6, 7, 8, "ellipsis", 25]);
  });

  it("ne coupe pas au début", () => {
    expect(pageNumbers(1, 25)).toEqual([1, 2, 3, "ellipsis", 25]);
    expect(pageNumbers(2, 25)).toEqual([1, 2, 3, 4, "ellipsis", 25]);
  });

  it("ne coupe pas à la fin", () => {
    expect(pageNumbers(25, 25)).toEqual([1, "ellipsis", 23, 24, 25]);
    expect(pageNumbers(24, 25)).toEqual([1, "ellipsis", 22, 23, 24, 25]);
  });

  it("comble un trou d'une seule page au lieu d'une ellipse", () => {
    // 1 … 3 masquerait la seule page 2 : on l'affiche.
    expect(pageNumbers(5, 25)).toEqual([1, 2, 3, 4, 5, 6, 7, "ellipsis", 25]);
    expect(pageNumbers(21, 25)).toEqual([1, "ellipsis", 19, 20, 21, 22, 23, 24, 25]);
  });

  it("ne renvoie jamais de doublon ni de numéro hors bornes", () => {
    for (let total = 1; total <= 30; total++) {
      for (let current = 1; current <= total; current++) {
        const result = pageNumbers(current, total);
        const numbers = result.filter((entry): entry is number => entry !== "ellipsis");
        expect(new Set(numbers).size).toBe(numbers.length);
        expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
        expect(Math.min(...numbers)).toBeGreaterThanOrEqual(1);
        expect(Math.max(...numbers)).toBeLessThanOrEqual(total);
        expect(numbers).toContain(current);
      }
    }
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npm test`
Expected: FAIL — `pageNumbers is not a function` / erreur d'import.

- [ ] **Step 3: Écrire l'implémentation**

Ajouter à la fin de `src/lib/pagination.ts` :

```ts
/** Nombre de pages en deçà duquel on affiche tous les numéros, sans ellipse. */
const FULL_LIST_MAX_PAGES = 8;

/** Nombre de voisines affichées de part et d'autre de la page courante. */
const NEIGHBOURS = 2;

/**
 * Séquence de numéros à afficher, avec ellipses.
 * Exemple : pageNumbers(6, 25) -> [1, "ellipsis", 4, 5, 6, 7, 8, "ellipsis", 25]
 */
export function pageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= FULL_LIST_MAX_PAGES) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const shown = new Set<number>([1, total]);
  for (let page = current - NEIGHBOURS; page <= current + NEIGHBOURS; page++) {
    if (page >= 1 && page <= total) shown.add(page);
  }

  const sorted = [...shown].sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];

  for (const [index, page] of sorted.entries()) {
    if (index > 0) {
      const gap = page - sorted[index - 1];
      // Un trou d'une seule page : l'ellipse ne ferait rien gagner, on affiche le numéro.
      if (gap === 2) result.push(page - 1);
      else if (gap > 2) result.push("ellipsis");
    }
    result.push(page);
  }

  return result;
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npm test`
Expected: PASS — 5 suites, 16 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pagination.ts src/lib/pagination.test.ts
git commit -m "feat(pagination): séquence de numéros de page avec ellipses"
```

---

### Task 3: Composant `LeadsPagination`

Barre affichée sous chaque tableau. Purement présentationnel : il reçoit sa position, réécrit l'URL,
et n'a aucune connaissance des filtres qu'il préserve.

**Files:**
- Create: `src/components/ui-kit/LeadsPagination.tsx`

**Interfaces:**
- Consumes (de Tasks 1-2) : `PER_PAGE_OPTIONS`, `PER_PAGE_COOKIE`, `pageCount`, `pageNumbers`.
- Produces: `<LeadsPagination page={number} per={number} total={number} />`

- [ ] **Step 1: Écrire le composant**

```tsx
// src/components/ui-kit/LeadsPagination.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PER_PAGE_COOKIE, PER_PAGE_OPTIONS, pageCount, pageNumbers } from "@/lib/pagination";
import { cn } from "@/lib/utils";

type LeadsPaginationProps = {
  /** Page courante, 1-indexée et déjà clampée par la page serveur. */
  page: number;
  per: number;
  /** Nombre total de leads pour le filtre courant. */
  total: number;
};

export function LeadsPagination({ page, per, total }: LeadsPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const count = pageCount(total, per);

  const pushWith = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const goToPage = (target: number) => {
    pushWith((params) => {
      if (target <= 1) params.delete("page");
      else params.set("page", String(target));
    });
  };

  const changePerPage = (value: string) => {
    // Cookie lisible côté serveur : la prochaine visite se rend directement à la bonne taille.
    document.cookie = `${PER_PAGE_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
    pushWith((params) => {
      params.set("per", value);
      params.delete("page");
    });
  };

  // Une seule page : la barre n'apporterait rien.
  if (count <= 1) return null;

  const first = (page - 1) * per + 1;
  const last = Math.min(page * per, total);

  return (
    <div
      data-testid="pagination"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-[#64748b]">
        {first}–{last} sur {total} lead{total > 1 ? "s" : ""}
      </p>

      <div className="flex items-center gap-3">
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <button
            type="button"
            data-testid="pagination-prev"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            aria-label="Page précédente"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e2e8f0] text-[#0b1f3a] disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-[#f1f5f9]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {pageNumbers(page, count).map((entry, index) =>
            entry === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                aria-hidden="true"
                className="px-1 text-sm text-[#94a3b8]"
              >
                …
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                data-testid={`pagination-page-${entry}`}
                onClick={() => goToPage(entry)}
                disabled={entry === page}
                aria-label={`Page ${entry}`}
                aria-current={entry === page ? "page" : undefined}
                className={cn(
                  "h-8 min-w-8 rounded-md border px-2 text-sm",
                  entry === page
                    ? "cursor-default border-[#2563eb] bg-[#2563eb] font-semibold text-white"
                    : "border-[#e2e8f0] text-[#0b1f3a] hover:bg-[#f1f5f9]"
                )}
              >
                {entry}
              </button>
            )
          )}

          <button
            type="button"
            data-testid="pagination-next"
            onClick={() => goToPage(page + 1)}
            disabled={page >= count}
            aria-label="Page suivante"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e2e8f0] text-[#0b1f3a] disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-[#f1f5f9]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>

        <label className="flex items-center gap-2 text-sm text-[#64748b]">
          Par page
          <select
            data-testid="pagination-per"
            value={per}
            onChange={(event) => changePerPage(event.target.value)}
            className="h-8 rounded-md border border-[#e2e8f0] bg-white px-2 text-sm text-[#0b1f3a]"
          >
            {PER_PAGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Vérifier les types**

Run: `npx tsc --noEmit`
Expected: aucune sortie.

- [ ] **Step 3: Vérifier le lint**

Run: `npm run lint`
Expected: aucune erreur sur le nouveau fichier.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui-kit/LeadsPagination.tsx
git commit -m "feat(pagination): composant LeadsPagination"
```

---

### Task 4: Paginer `/admin/leads`

**Files:**
- Modify: `src/app/(app)/admin/leads/page.tsx`

**Interfaces:**
- Consumes (Tasks 1-3) : `PER_PAGE_COOKIE`, `parsePage`, `parsePerPage`, `pageCount`, `clampPage`,
  `LeadsPagination`.
- Produces: le contrat d'URL `?page&per` sur `/admin/leads`. Task 5 s'appuie dessus.

> Le tri `?sort=status_changed_at` arrive en Task 8 : ici, l'ordre reste `created_at` desc.

- [ ] **Step 1: Ajouter les imports**

En tête de `src/app/(app)/admin/leads/page.tsx`, ajouter :

```ts
import { cookies } from "next/headers";
import { LeadsPagination } from "@/components/ui-kit/LeadsPagination";
import { PER_PAGE_COOKIE, clampPage, pageCount, parsePage, parsePerPage } from "@/lib/pagination";
```

- [ ] **Step 2: Étendre le type de `searchParams`**

Remplacer la signature du composant :

```ts
export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; telepro?: string; from?: string; to?: string; chantier?: string; delegataire?: string; installation_type?: string; category?: string }>;
}) {
```

par :

```ts
export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; telepro?: string; from?: string; to?: string; chantier?: string; delegataire?: string; installation_type?: string; category?: string; page?: string; per?: string }>;
}) {
```

- [ ] **Step 3: Résoudre la taille de page (URL puis cookie)**

Juste après la ligne `const category = params.category as LeadCategory | undefined;`, ajouter :

```ts
  // L'URL prime sur le cookie ; le cookie prime sur le défaut.
  const cookieStore = await cookies();
  const per = params.per
    ? parsePerPage(params.per)
    : parsePerPage(cookieStore.get(PER_PAGE_COOKIE)?.value);
  const requestedPage = parsePage(params.page);
```

- [ ] **Step 4: Transformer la requête en fabrique réutilisable**

Le clamp hors bornes peut exiger une seconde requête : la construction des filtres doit être
rejouable. Remplacer le bloc allant de `let query = adminClient` (l. ~35) jusqu'à la fin du bloc de
recherche `q` (la ligne `);` qui ferme `query = query.or(...)`, l. ~81) par une fonction qui applique
les mêmes filtres, dans le même ordre, à une requête neuve :

```ts
  const buildQuery = () => {
    let query = adminClient
      .from("leads")
      .select(
        `
      *,
      profile:profiles!assigned_to(full_name, email)
    `,
        { count: "exact" }
      );

    if (fromDate) query = query.gte("created_at", fromDate.toISOString());
    if (toDate) query = query.lte("created_at", toDate.toISOString());

    if (chantier && (CHANTIER_FIELDS as readonly string[]).includes(chantier)) {
      query = query.eq("status", status ?? "documents_recus").eq(chantier, true);
    } else if (status) {
      query = query.eq("status", status);
    }

    if (installationType) {
      if (installationType === "non_renseigne") {
        query = query.is("installation_type", null);
      } else {
        query = query.eq("installation_type", installationType);
      }
    }

    if (category && LEAD_CATEGORIES.includes(category)) {
      query = query.eq("category", category);
    }

    if (assignedTo) {
      query = query.eq("assigned_to", assignedTo);
    }

    if (delegataire) {
      if (delegataire === "__non_assigne__") {
        query = query.is("delegataire_group", null);
      } else {
        query = query.eq("delegataire_group", delegataire);
      }
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(
        `first_name.ilike.${term},last_name.ilike.${term},phone.ilike.${term},email.ilike.${term}`
      );
    }

    // `.order("id")` garantit un ordre total : sans lui, deux leads de même created_at
    // peuvent changer de place entre deux requêtes et donc apparaître deux fois ou être sautés.
    return query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
  };

  const fetchPage = (target: number) =>
    buildQuery().range((target - 1) * per, target * per - 1);
```

- [ ] **Step 5: Exécuter la requête paginée avec clamp**

Remplacer le bloc `Promise.all` existant (`const [{ data: leads }, { data: allTelepros }, { data: activeTelepros }] = await Promise.all([query, ...])`) par :

```ts
  const [leadsResult, { data: allTelepros }, { data: activeTelepros }] = await Promise.all([
    fetchPage(requestedPage),
    adminClient
      .from("profiles")
      .select("id, full_name, email, deleted_at")
      .eq("role", "telepro")
      .order("full_name"),
    adminClient
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "telepro")
      .is("deleted_at", null)
      .order("full_name"),
  ]);

  let leads = leadsResult.data;
  const total = leadsResult.count ?? 0;

  // Page hors bornes (URL manipulée, filtre resserré, leads supprimés) : afficher la dernière
  // page réelle plutôt qu'un tableau vide. Le nombre de pages n'est connu qu'après le count.
  const page = clampPage(requestedPage, pageCount(total, per));
  if (page !== requestedPage) {
    leads = (await fetchPage(page)).data;
  }
```

- [ ] **Step 6: Rendre la barre sous les deux tableaux**

Remplacer le bloc final :

```tsx
      {status === "documents_recus" ? (
        <DocumentsRecusTable leads={leads || []} />
      ) : (
        <AdminLeadsTable leads={leads || []} telepros={activeTelepros || []} />
      )}
```

par :

```tsx
      {status === "documents_recus" ? (
        <DocumentsRecusTable leads={leads || []} />
      ) : (
        <AdminLeadsTable leads={leads || []} telepros={activeTelepros || []} />
      )}

      <LeadsPagination page={page} per={per} total={total} />
```

- [ ] **Step 7: Vérifier les types**

Run: `npx tsc --noEmit`
Expected: aucune sortie.

- [ ] **Step 8: Vérifier manuellement**

Run: `npm run dev` puis ouvrir `http://localhost:3000/admin/leads` en tant qu'admin.
Expected:
- 50 leads affichés, les plus récents en premier, barre de pagination sous le tableau.
- Le clic sur « 2 » met `?page=2` dans l'URL et affiche des leads **différents** de la page 1.
- Le sélecteur « Par page » → 100 met `?per=100` dans l'URL, revient en page 1, et le choix survit à
  un rechargement (cookie).
- `?page=9999` affiche la dernière page réelle, pas un tableau vide.
- `?per=37` retombe sur 50 sans erreur.

- [ ] **Step 9: Commit**

```bash
git add "src/app/(app)/admin/leads/page.tsx"
git commit -m "feat(leads): pagination serveur sur /admin/leads"
```

---

### Task 5: Filtres de `/admin/leads` — préserver `per`, revenir en page 1

Sans ce task, changer un filtre perd la taille choisie et laisse un `page=8` orphelin sur un résultat
de 12 leads (tableau vide).

**Files:**
- Modify: `src/app/(app)/admin/leads/AdminLeadsFilters.tsx:51-70`

**Interfaces:**
- Consumes: le contrat d'URL de Task 4.
- Produces: rien de nouveau.

- [ ] **Step 1: Préserver `per`/`sort`/`dir` et omettre `page` dans `buildParams`**

`buildParams` construit une `URLSearchParams` **neuve** : tout ce qui n'y est pas remis est perdu.
C'est exactement l'effet voulu pour `page` (retour page 1) et exactement l'inverse pour `per`.

Dans `buildParams`, juste avant `return params;`, ajouter :

```ts
    // Préservés à travers les changements de filtre.
    const per = searchParams.get("per");
    if (per) params.set("per", per);
    const sort = searchParams.get("sort");
    if (sort) params.set("sort", sort);
    const dir = searchParams.get("dir");
    if (dir) params.set("dir", dir);
    // `page` est volontairement omis : changer un filtre ramène en page 1.
```

- [ ] **Step 2: Ajouter `searchParams` aux dépendances du `useCallback`**

`buildParams` lit désormais `searchParams`. Remplacer sa liste de dépendances :

```ts
  }, [currentStatus, currentTelepro, currentChantier, currentDelegataire, search, from, to, currentCategory]);
```

par :

```ts
  }, [currentStatus, currentTelepro, currentChantier, currentDelegataire, search, from, to, currentCategory, searchParams]);
```

- [ ] **Step 3: Vérifier les types et le lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: aucune sortie / aucune erreur (notamment aucun avertissement `react-hooks/exhaustive-deps`).

- [ ] **Step 4: Vérifier manuellement**

Run: `npm run dev` puis, sur `/admin/leads` : passer à 100 par page, aller page 3, puis changer le
filtre de statut.
Expected: l'URL conserve `per=100`, ne contient plus `page`, et le tableau repart de la page 1.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/admin/leads/AdminLeadsFilters.tsx"
git commit -m "fix(leads): les filtres préservent la taille de page et reviennent en page 1"
```

---

### Task 6: Paginer `/admin/documents-recus`

Même traitement que Task 4, avec les spécificités de cette page : tri `updated_at` desc, filtre
`delegataire` **multi-valeurs**, recherche **sans email**.

**Files:**
- Modify: `src/app/(app)/admin/documents-recus/page.tsx`

**Interfaces:**
- Consumes (Tasks 1-3) : mêmes que Task 4.
- Produces: le contrat d'URL `?page&per` sur `/admin/documents-recus`, cookie partagé avec Task 4.

- [ ] **Step 1: Ajouter les imports**

```ts
import { cookies } from "next/headers";
import { LeadsPagination } from "@/components/ui-kit/LeadsPagination";
import { PER_PAGE_COOKIE, clampPage, pageCount, parsePage, parsePerPage } from "@/lib/pagination";
```

- [ ] **Step 2: Étendre le type de `searchParams`**

```ts
export default async function AdminDocumentsRecusPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; delegataire?: string | string[]; from?: string; to?: string; chantier?: string; page?: string; per?: string }>;
}) {
```

- [ ] **Step 3: Résoudre la taille de page**

Après `const chantier = params.chantier;`, ajouter :

```ts
  const cookieStore = await cookies();
  const per = params.per
    ? parsePerPage(params.per)
    : parsePerPage(cookieStore.get(PER_PAGE_COOKIE)?.value);
  const requestedPage = parsePage(params.page);
```

- [ ] **Step 4: Transformer la requête en fabrique**

Remplacer le bloc allant de `let query = adminClient` (l. ~32) jusqu'à la fin du filtre `chantier`
(`if (chantier && ...) { query = query.eq(chantier, true); }`) par :

```ts
  const buildQuery = () => {
    let query = adminClient
      .from("leads")
      .select(
        `
      *,
      profile:profiles!assigned_to(full_name, email)
    `,
        { count: "exact" }
      )
      .eq("status", "documents_recus");

    if (fromDate) query = query.gte("updated_at", fromDate.toISOString());
    if (toDate) query = query.lte("updated_at", toDate.toISOString());

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(
        `first_name.ilike.${term},last_name.ilike.${term},phone.ilike.${term}`
      );
    }

    if (selectedDelegataires.length > 0) {
      const orParts = selectedDelegataires.map((d) =>
        d === "__non_assigne__" ? "delegataire_group.is.null" : `delegataire_group.eq.${d}`
      );
      query = query.or(orParts.join(","));
    }

    if (chantier && (CHANTIER_FIELDS as readonly string[]).includes(chantier)) {
      query = query.eq(chantier, true);
    }

    // `.order("id")` garantit un ordre total (cf. Task 4).
    return query
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false });
  };

  const fetchPage = (target: number) =>
    buildQuery().range((target - 1) * per, target * per - 1);

  const leadsResult = await fetchPage(requestedPage);
  let leads = leadsResult.data;
  const total = leadsResult.count ?? 0;

  const page = clampPage(requestedPage, pageCount(total, per));
  if (page !== requestedPage) {
    leads = (await fetchPage(page)).data;
  }
```

> Vérifier ensuite qu'il ne reste plus aucun `await query` ni `const { data: leads } = await query;`
> plus bas dans le fichier — l'ancienne exécution de la requête doit disparaître.

- [ ] **Step 5: Rendre la barre sous le tableau**

Sous `<DocumentsRecusTable leads={leads || []} />`, ajouter :

```tsx
      <LeadsPagination page={page} per={per} total={total} />
```

- [ ] **Step 6: Préserver `per` dans les filtres de la page**

Dans `src/app/(app)/admin/documents-recus/DocumentsRecusFilters.tsx`, dans `buildParams` (l. ~20-33),
juste avant `return params;` :

```ts
    // Préservés à travers les changements de filtre ; `page` volontairement omis (retour page 1).
    const per = searchParams.get("per");
    if (per) params.set("per", per);
```

> `buildParams` n'est pas un `useCallback` ici : aucune liste de dépendances à mettre à jour.

- [ ] **Step 7: Vérifier les types**

Run: `npx tsc --noEmit`
Expected: aucune sortie.

- [ ] **Step 8: Vérifier manuellement**

Run: `npm run dev` puis `/admin/documents-recus` en tant que secrétaire.
Expected: pagination fonctionnelle, tri par date de modification décroissante, filtre délégataire
multi-valeurs toujours opérant, et la taille choisie sur `/admin/leads` est déjà appliquée ici
(cookie partagé).

- [ ] **Step 9: Commit**

```bash
git add "src/app/(app)/admin/documents-recus/page.tsx" "src/app/(app)/admin/documents-recus/DocumentsRecusFilters.tsx"
git commit -m "feat(documents-recus): pagination serveur"
```

---

### Task 7: Tri `status_changed_at` — de l'état local à l'URL

Le tri est aujourd'hui un `useState` appliqué au tableau reçu en props. Depuis Task 4, ce tableau ne
contient plus que 50 leads : le tri ne trierait donc que la page affichée tout en se présentant comme
un tri global. Il doit passer côté serveur.

**Files:**
- Modify: `src/app/(app)/admin/leads/AdminLeadsTable.tsx:3,71-90,386,393`
- Modify: `src/app/(app)/admin/leads/page.tsx`
- Modify: `src/app/(app)/admin/redistribute/page.tsx`

**Interfaces:**
- Consumes: le contrat d'URL de Task 4.
- Produces: `AdminLeadsTable` gagne une prop **obligatoire** `statusSort: StatusSortDirection`
  (`"none" | "asc" | "desc"`), fournie par ses **deux** pages appelantes.

- [ ] **Step 1: Retirer l'état de tri de la table**

Dans `src/app/(app)/admin/leads/AdminLeadsTable.tsx` :

Retirer `useMemo` de l'import React (l. 3) — il n'aura plus d'usage :

```ts
import { useState, useCallback } from "react";
```

Ajouter `usePathname`/`useSearchParams` à l'import de navigation (l. 4) :

```ts
import { useRouter, usePathname, useSearchParams } from "next/navigation";
```

Exporter le type de tri (l. 39) — les deux pages appelantes en fournissent désormais la valeur :

```ts
export type StatusSortDirection = "none" | "desc" | "asc";
```

Ajouter la prop au type `AdminLeadsTableProps` (à côté de `excludeTeleproId?: string;`) :

```ts
  statusSort: StatusSortDirection;
```

Mettre à jour la signature :

```ts
export function AdminLeadsTable({ leads, telepros, excludeTeleproId, statusSort }: AdminLeadsTableProps) {
```

Supprimer la ligne `const [statusSort, setStatusSort] = useState<StatusSortDirection>("none");` (l. 71)
et le bloc `const sortedLeads = useMemo(...)` (l. 74-81).

- [ ] **Step 2: Faire pousser le tri dans l'URL**

Ajouter les hooks sous `const router = useRouter();` :

```ts
  const pathname = usePathname();
  const searchParams = useSearchParams();
```

Remplacer `toggleStatusSort` (l. 83-89) par :

```ts
  // Cycle inchangé pour l'utilisateur (aucun → décroissant → croissant), mais l'ordre est
  // désormais appliqué par le serveur sur l'ensemble du résultat, pas sur la seule page affichée.
  const toggleStatusSort = () => {
    const next: StatusSortDirection =
      statusSort === "none" ? "desc" : statusSort === "desc" ? "asc" : "none";

    const params = new URLSearchParams(searchParams.toString());
    if (next === "none") {
      params.delete("sort");
      params.delete("dir");
    } else {
      params.set("sort", "status_changed_at");
      params.set("dir", next);
    }
    // Changer l'ordre invalide la position courante.
    params.delete("page");

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };
```

- [ ] **Step 3: Itérer `leads` au lieu de `sortedLeads`**

Aux lignes ~386 et ~393, remplacer `sortedLeads.length` par `leads.length` et `sortedLeads.map(`
par `leads.map(`. Les trois usages de `statusSort` pour les icônes (l. 366-368) restent inchangés :
la prop porte le même type que l'ancien état.

Run: `grep -n "sortedLeads" "src/app/(app)/admin/leads/AdminLeadsTable.tsx"`
Expected: aucune sortie.

- [ ] **Step 4: Appliquer le tri côté serveur sur `/admin/leads`**

Dans `src/app/(app)/admin/leads/page.tsx`, étendre le type de `searchParams` avec `sort?: string; dir?: string;`,
puis ajouter après la résolution de `requestedPage` :

```ts
  const statusSort = params.sort === "status_changed_at" && (params.dir === "asc" || params.dir === "desc")
    ? params.dir
    : "none";
```

Dans `buildQuery`, remplacer le `return query.order(...)` final par :

```ts
    if (statusSort !== "none") {
      return query
        .order("status_changed_at", { ascending: statusSort === "asc", nullsFirst: false })
        .order("id", { ascending: false });
    }

    return query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
```

> `nullsFirst: false` : les leads jamais modifiés (`status_changed_at` nul) vont en fin de liste dans
> les deux sens, plutôt que d'occuper la première page en tri croissant.

Passer la prop à la table :

```tsx
        <AdminLeadsTable leads={leads || []} telepros={activeTelepros || []} statusSort={statusSort} />
```

- [ ] **Step 5: Réparer le tri sur `/admin/redistribute`**

`AdminLeadsTable` y est réutilisée : sans ce changement, son bouton de tri pousserait une URL que la
page ignore, et le clic n'aurait aucun effet visible. Cette page **reste non paginée**.

Dans `src/app/(app)/admin/redistribute/page.tsx` (l. 8-12), étendre le type de `searchParams` :

```ts
export default async function AdminRedistributePage({
  searchParams,
}: {
  searchParams: Promise<{ telepro?: string; sort?: string; dir?: string }>;
}) {
```

Après `const teleproId = params.telepro;` (l. 14), résoudre le tri à l'identique de `/admin/leads` :

```ts
  const statusSort = params.sort === "status_changed_at" && (params.dir === "asc" || params.dir === "desc")
    ? params.dir
    : "none";
```

Remplacer la requête des leads (l. 32-39) :

```ts
  const { data: leads } = await adminClient
    .from("leads")
    .select(`
      *,
      profile:profiles!assigned_to(full_name, email)
    `)
    .eq("assigned_to", teleproId)
    .order("created_at", { ascending: false });
```

par une requête au tri conditionnel :

```ts
  const leadsQuery = adminClient
    .from("leads")
    .select(`
      *,
      profile:profiles!assigned_to(full_name, email)
    `)
    .eq("assigned_to", teleproId);

  const { data: leads } = await (statusSort !== "none"
    ? leadsQuery.order("status_changed_at", { ascending: statusSort === "asc", nullsFirst: false })
    : leadsQuery.order("created_at", { ascending: false }));
```

Passer la prop à la table (l. 71-75) :

```tsx
      <AdminLeadsTable
        leads={leads || []}
        telepros={activeTelepros || []}
        excludeTeleproId={teleproId}
        statusSort={statusSort}
      />
```

- [ ] **Step 6: Vérifier les types**

Run: `npx tsc --noEmit`
Expected: aucune sortie. (`statusSort` étant une prop obligatoire, tsc signalerait tout appelant
oublié — c'est le filet de sécurité de ce task.)

- [ ] **Step 7: Vérifier manuellement**

Run: `npm run dev`
Expected:
- Sur `/admin/leads`, cliquer l'en-tête « Statut modifié le » : l'URL gagne `sort=status_changed_at&dir=desc`,
  puis `dir=asc`, puis les deux disparaissent — l'icône suit le même cycle qu'avant.
- **Le tri est global** : le 1er lead de la page 2 vient bien après le dernier de la page 1.
- Trier en étant page 3 ramène en page 1.
- Sur `/admin/redistribute?telepro=<id>`, le bouton de tri réordonne bien la liste.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(app)/admin/leads/AdminLeadsTable.tsx" "src/app/(app)/admin/leads/page.tsx" "src/app/(app)/admin/redistribute/page.tsx"
git commit -m "fix(leads): tri « statut modifié le » appliqué côté serveur"
```

---

### Task 8: Tests e2e du contrat d'URL

**Files:**
- Create: `e2e/leads-pagination.admin.spec.ts`

**Interfaces:**
- Consumes: les `data-testid` de Task 3 (`pagination-per`, `pagination-next`) et les `filter-*`
  existants (`e2e/leads-filters.admin.spec.ts`).
- Produces: rien.

> Ces tests portent sur le **contrat d'URL**, pas sur le volume : la base de test n'a aucun volume de
> données garanti. Une assertion du type « le tableau contient exactement 50 lignes » serait
> instable — elle est couverte par la vérification manuelle de Task 4.

- [ ] **Step 1: Écrire les tests**

```ts
// e2e/leads-pagination.admin.spec.ts
import { test, expect } from "@playwright/test";
import { hasAuthEnv } from "./helpers";

test.skip(!hasAuthEnv, "identifiants E2E absents (.env.test.local)");

test("le sélecteur de taille met à jour l'URL", async ({ page }) => {
  await page.goto("/admin/leads?per=25");
  await page.getByTestId("pagination-per").selectOption("100");
  await expect(page).toHaveURL(/per=100/);
});

test("changer de taille ramène en page 1", async ({ page }) => {
  await page.goto("/admin/leads?per=25&page=2");
  await page.getByTestId("pagination-per").selectOption("100");
  await expect(page).toHaveURL(/per=100/);
  await expect(page).not.toHaveURL(/page=/);
});

test("changer un filtre préserve la taille et ramène en page 1", async ({ page }) => {
  await page.goto("/admin/leads?per=100&page=3");
  await page.getByTestId("filter-category").selectOption("fenetre");
  await expect(page).toHaveURL(/category=fenetre/);
  await expect(page).toHaveURL(/per=100/);
  await expect(page).not.toHaveURL(/page=/);
});

test("la barre de pagination est absente quand il n'y a qu'une page", async ({ page }) => {
  // Un filtre très restrictif : au plus quelques leads, donc une seule page de 200.
  await page.goto("/admin/leads?per=200&q=zzzzzzzzzzzz");
  await expect(page.getByTestId("pagination")).toHaveCount(0);
});
```

> Le test « le bouton suivant met `page=2` dans l'URL » n'est pas inclus : il exigerait plus de 25
> leads en base de test, ce qui n'est pas garanti. Il est couvert manuellement (Task 4, Step 8).

- [ ] **Step 2: Lancer les tests e2e**

Run: `npm run test:e2e -- leads-pagination`
Expected: 4 tests PASS — ou tous « skipped » si `.env.test.local` est absent (comportement normal,
identique aux specs existantes).

- [ ] **Step 3: Lancer toute la suite de non-régression**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run test:e2e`
Expected: unitaires PASS, aucune erreur de type, aucune erreur de lint, e2e PASS (ou skipped).

- [ ] **Step 4: Commit**

```bash
git add e2e/leads-pagination.admin.spec.ts
git commit -m "test(e2e): contrat d'URL de la pagination des leads"
```

---

## Vérification finale

- [ ] **`/telepro/leads` est strictement inchangée**

Run: `git diff main --stat -- "src/app/(app)/telepro"`
Expected: aucune sortie. C'est l'exigence centrale du périmètre — la pagination ne concerne que les
rôles admin et secrétaire.

- [ ] **Aucune régression sur les critères de la spec**

En tant qu'admin puis en tant que secrétaire, sur `/admin/leads` et `/admin/documents-recus` :
1. 50 leads par défaut, les plus récents en premier, barre numérotée sous le tableau.
2. Le sélecteur 25/50/100/200 fonctionne ; le choix survit à un rechargement **et** au passage d'une
   page admin à l'autre.
3. Numéros, précédent et suivant naviguent en conservant filtres, recherche et tri.
4. Tout changement de filtre ramène en page 1.
5. Un filtre dépassant 1000 leads est entièrement parcourable (le plafond PostgREST silencieux est
   corrigé sur ces deux pages).
6. La sélection multiple ne porte que sur la page affichée et se vide en changeant de page.
7. Le tri « statut modifié le » ordonne l'ensemble du résultat.

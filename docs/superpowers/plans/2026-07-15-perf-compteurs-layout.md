# Accélérer le chargement des pages — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supprimer les ~769 ms que chaque navigation passe à télécharger les 8744 leads pour calculer les compteurs du menu latéral, en agrégeant côté base.

**Architecture:** Une fonction Postgres `lead_status_counts(p_assigned_to uuid)` fait le `GROUP BY category, status` et renvoie ≤42 lignes en un aller-retour. Le layout `(app)` remplace sa boucle de 9 allers-retours par un `.rpc()`, et lance ses requêtes indépendantes en parallèle. Une fonction pure `buildStatusCounts` reconstruit la structure attendue par le Drawer, ce qui rend la transformation testable sans base.

**Tech Stack:** Next.js 15 (App Router, React Server Components), Supabase (PostgREST + Postgres), vitest.

**Spec:** `docs/superpowers/specs/2026-07-15-perf-compteurs-layout-design.md`

## Global Constraints

- **Les casts `::text` sont obligatoires** dans la fonction SQL : `category` et `status` sont des enums (`lead_category` dans `034_lead_category.sql:2`, `lead_status` dans `001_initial_schema.sql:36`). Sans cast, la fonction est rejetée au déploiement.
- **Le projet n'est PAS lié au CLI Supabase** (pas de `supabase/config.toml`). Les migrations s'appliquent à la main dans le SQL Editor du dashboard — c'est une action de l'utilisateur, pas de l'agent. Ne jamais prétendre avoir appliqué une migration.
- **Le risque est la justesse, pas la vitesse.** Des compteurs rapides mais faux sont un échec total. Les compteurs après doivent être identiques à ceux d'avant, catégorie par catégorie et statut par statut.
- `p_assigned_to is null` → admin et secrétaire (tous les leads). `p_assigned_to` renseigné → un télépro (ses leads). C'est exactement la condition de la boucle actuelle (`layout.tsx:68-70`).
- Ne pas ajouter de cache : écarté par la spec (mauvais échange une fois l'agrégat en place).
- Ne pas toucher au middleware ni au double `getUser`/profil : hors périmètre, décision de l'utilisateur.
- Lint cassé indépendamment (`eslint.config.mjs` flat config + ESLint 8) : utiliser `npx tsc --noEmit`, jamais `npm run lint`.
- Toute mesure ou vérification contre la base de production se fait **en lecture seule** (SELECT / RPC `stable` uniquement).

---

### Task 1: La fonction SQL, prouvée identique à la boucle

**Files:**
- Create: `supabase/migrations/038_lead_status_counts.sql`
- Create: `scripts/verify-status-counts.mjs`

**Interfaces:**
- Produces: la fonction Postgres `lead_status_counts(p_assigned_to uuid default null)` qui renvoie `(category text, status text, count bigint)`. La Task 2 l'appelle via `adminClient.rpc("lead_status_counts", { p_assigned_to: <uuid | null> })`.

- [ ] **Step 1: Écrire le script de vérification**

Ce script est la preuve de justesse : il compare la boucle actuelle à la fonction SQL, sur les vraies données, pour les deux rôles.

Créer `scripts/verify-status-counts.mjs` :

```js
// Lecture seule : SELECT + RPC stable uniquement.
// Prouve que lead_status_counts() renvoie exactement les mêmes compteurs que la
// boucle de src/app/(app)/layout.tsx, pour l'admin comme pour un télépro.
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ms = (t) => Math.round(performance.now() - t);

// Reproduction fidèle de la boucle actuelle (layout.tsx:62-79).
async function loopCounts(assignedTo) {
  const counts = {};
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    let q = db.from("leads").select("status, category").range(from, from + PAGE - 1);
    if (assignedTo) q = q.eq("assigned_to", assignedTo);
    const { data: rows, error } = await q;
    if (error) throw error;
    if (!rows || rows.length === 0) break;
    for (const r of rows) {
      counts[r.category] ??= {};
      counts[r.category][r.status] = (counts[r.category][r.status] ?? 0) + 1;
    }
    if (rows.length < PAGE) break;
  }
  return counts;
}

async function rpcCounts(assignedTo) {
  const { data, error } = await db.rpc("lead_status_counts", {
    p_assigned_to: assignedTo ?? null,
  });
  if (error) throw error;
  const counts = {};
  for (const r of data) {
    counts[r.category] ??= {};
    counts[r.category][r.status] = Number(r.count);
  }
  return counts;
}

// Compare uniquement les compteurs non nuls : la boucle n'émet pas de zéros.
function diff(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const problems = [];
  for (const cat of keys) {
    const statuses = new Set([
      ...Object.keys(a[cat] ?? {}),
      ...Object.keys(b[cat] ?? {}),
    ]);
    for (const s of statuses) {
      const x = a[cat]?.[s] ?? 0;
      const y = b[cat]?.[s] ?? 0;
      if (x !== y) problems.push(`${cat}/${s}: boucle=${x} rpc=${y}`);
    }
  }
  return problems;
}

async function check(label, assignedTo) {
  let t = performance.now();
  const loop = await loopCounts(assignedTo);
  const loopMs = ms(t);

  t = performance.now();
  const rpc = await rpcCounts(assignedTo);
  const rpcMs = ms(t);

  const problems = diff(loop, rpc);
  const total = Object.values(loop).flatMap((c) => Object.values(c)).reduce((s, n) => s + n, 0);

  console.log(`\n=== ${label} ===`);
  console.log(`  leads comptés : ${total}`);
  console.log(`  boucle : ${loopMs}ms   rpc : ${rpcMs}ms`);
  if (problems.length) {
    console.log(`  ECHEC — ${problems.length} compteur(s) divergent(s) :`);
    for (const p of problems) console.log(`    ${p}`);
    return false;
  }
  console.log(`  OK — compteurs identiques`);
  return true;
}

// Un télépro réel, pour exercer la branche p_assigned_to renseigné.
const { data: telepro } = await db
  .from("profiles")
  .select("id, email")
  .eq("role", "telepro")
  .is("deleted_at", null)
  .limit(1)
  .single();

const okAdmin = await check("ADMIN / SECRETAIRE (p_assigned_to = null)", null);
const okTelepro = telepro
  ? await check(`TELEPRO ${telepro.email} (p_assigned_to = ${telepro.id})`, telepro.id)
  : (console.log("\nAucun télépro actif : branche p_assigned_to non vérifiée"), false);

console.log("");
if (okAdmin && okTelepro) {
  console.log(">>> SUCCES : les deux chemins donnent des compteurs identiques.");
} else {
  console.log(">>> ECHEC : ne pas déployer, les compteurs divergent.");
  process.exit(1);
}
```

- [ ] **Step 2: Lancer le script et constater qu'il échoue**

Run: `node scripts/verify-status-counts.mjs`

Expected: **FAIL**. La fonction n'existe pas encore en base, donc le script s'arrête sur une erreur PostgREST du type :

```
Could not find the function public.lead_status_counts(p_assigned_to) in the schema cache
```

C'est le test qui échoue avant le correctif. S'il ne plante pas ici, c'est qu'une fonction du même nom existe déjà — arrêter et investiguer plutôt que d'écraser quelque chose.

- [ ] **Step 3: Écrire la migration**

Créer `supabase/migrations/038_lead_status_counts.sql` :

```sql
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
```

- [ ] **Step 4: ACTION DE L'UTILISATEUR — appliquer la migration**

Le projet n'est pas lié au CLI Supabase : l'agent ne peut PAS appliquer cette migration.

S'arrêter ici et demander à l'utilisateur de :
1. ouvrir son dashboard Supabase → SQL Editor ;
2. coller le contenu intégral de `supabase/migrations/038_lead_status_counts.sql` ;
3. l'exécuter et confirmer que ça passe sans erreur.

Ne pas continuer avant sa confirmation. Ne jamais prétendre avoir appliqué la migration.

- [ ] **Step 5: Relancer le script et constater qu'il passe**

Run: `node scripts/verify-status-counts.mjs`

Expected: **PASS**, avec une sortie de la forme :

```
=== ADMIN / SECRETAIRE (p_assigned_to = null) ===
  leads comptés : 8744
  boucle : 769ms   rpc : 62ms
  OK — compteurs identiques

=== TELEPRO ... ===
  OK — compteurs identiques

>>> SUCCES : les deux chemins donnent des compteurs identiques.
```

Les deux « OK — compteurs identiques » sont ce qui compte. Le gain de temps est un bonus ; c'est la justesse qui autorise le déploiement. Si un seul compteur diverge, ne pas continuer : la fonction SQL est fausse.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/038_lead_status_counts.sql scripts/verify-status-counts.mjs
git commit -m "$(cat <<'EOF'
perf(db): fonction lead_status_counts — compteurs agrégés côté base

Le layout téléchargeait les 8744 leads en 9 allers-retours séquentiels (~769ms) à
chaque navigation pour compter en JavaScript. Un GROUP BY renvoie au plus 42 lignes
en un aller-retour, et le coût cesse de croître avec la base.

scripts/verify-status-counts.mjs prouve, sur les vraies données et pour les deux
rôles, que les compteurs sont identiques à ceux de la boucle.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Le layout utilise la fonction et parallélise

**Files:**
- Create: `src/lib/status-counts.ts`
- Create: `src/lib/status-counts.test.ts`
- Modify: `src/app/(app)/layout.tsx:45-83`

**Interfaces:**
- Consumes: la fonction Postgres `lead_status_counts(p_assigned_to uuid default null)` de la Task 1, appelée via `adminClient.rpc("lead_status_counts", { p_assigned_to: <uuid | null> })`, qui renvoie des lignes `{ category: string; status: string; count: number }`.
- Produces: `buildStatusCounts(rows: StatusCountRow[]): Record<string, Record<string, number>>` dans `src/lib/status-counts.ts`.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/lib/status-counts.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { buildStatusCounts } from "@/lib/status-counts";
import { LEAD_CATEGORIES, LEAD_STATUSES_ADMIN } from "@/lib/types";

describe("buildStatusCounts", () => {
  it("remplit les compteurs à partir des lignes agrégées", () => {
    const counts = buildStatusCounts([
      { category: "fenetre", status: "nouveau", count: 12 },
      { category: "fenetre", status: "valide", count: 3 },
      { category: "clim_1euro", status: "nouveau", count: 7 },
    ]);

    expect(counts.fenetre.nouveau).toBe(12);
    expect(counts.fenetre.valide).toBe(3);
    expect(counts.clim_1euro.nouveau).toBe(7);
  });

  it("initialise à zéro toutes les combinaisons absentes du résultat SQL", () => {
    // Le GROUP BY n'émet aucune ligne pour un couple sans lead. Le Drawer attend
    // pourtant un nombre : sans cette initialisation, il afficherait « undefined ».
    const counts = buildStatusCounts([]);

    for (const cat of LEAD_CATEGORIES) {
      for (const s of LEAD_STATUSES_ADMIN) {
        expect(counts[cat][s]).toBe(0);
      }
    }
  });

  it("ignore les couples inconnus au lieu de les inventer", () => {
    // Un statut retiré du code mais encore en base ne doit pas créer de clé fantôme.
    const counts = buildStatusCounts([
      { category: "fenetre", status: "statut_supprime", count: 5 },
      { category: "categorie_inconnue", status: "nouveau", count: 9 },
    ]);

    expect(counts.fenetre).not.toHaveProperty("statut_supprime");
    expect(counts).not.toHaveProperty("categorie_inconnue");
  });

  it("accepte les count renvoyés en chaîne par PostgREST", () => {
    // bigint peut arriver en string selon la sérialisation : le Drawer additionne
    // ces valeurs, donc « 12 » + « 3 » donnerait « 123 » au lieu de 15.
    const counts = buildStatusCounts([
      { category: "fenetre", status: "nouveau", count: "12" as unknown as number },
    ]);

    expect(counts.fenetre.nouveau).toBe(12);
  });
});
```

- [ ] **Step 2: Lancer le test et constater qu'il échoue**

Run: `npx vitest run src/lib/status-counts.test.ts`

Expected: **FAIL** — `Failed to resolve import "@/lib/status-counts"`, le module n'existe pas.

- [ ] **Step 3: Écrire la fonction pure**

Créer `src/lib/status-counts.ts` :

```ts
import { LEAD_CATEGORIES, LEAD_STATUSES_ADMIN } from "@/lib/types";

export type StatusCountRow = {
  category: string;
  status: string;
  count: number;
};

/**
 * Reconstruit la structure attendue par le Drawer à partir des lignes agrégées
 * par `lead_status_counts`.
 *
 * Le GROUP BY n'émet pas de ligne pour les couples sans lead : toutes les
 * combinaisons sont donc initialisées à zéro, sinon le Drawer afficherait
 * « undefined » là où la boucle affichait 0.
 */
export function buildStatusCounts(rows: StatusCountRow[]): Record<string, Record<string, number>> {
  const counts: Record<string, Record<string, number>> = {};
  for (const cat of LEAD_CATEGORIES) {
    counts[cat] = {};
    for (const s of LEAD_STATUSES_ADMIN) counts[cat][s] = 0;
  }

  for (const row of rows) {
    // Un couple inconnu du code (statut retiré, catégorie ajoutée en base) est ignoré
    // plutôt que d'introduire une clé que le Drawer n'attend pas.
    if (row.category in counts && row.status in counts[row.category]) {
      counts[row.category][row.status] = Number(row.count);
    }
  }

  return counts;
}
```

- [ ] **Step 4: Lancer le test et constater qu'il passe**

Run: `npx vitest run src/lib/status-counts.test.ts`

Expected: **PASS**, 4 tests.

- [ ] **Step 5: Câbler le layout**

Dans `src/app/(app)/layout.tsx`, ajouter l'import en haut du fichier, à côté des autres imports :

```tsx
import { buildStatusCounts } from "@/lib/status-counts";
```

Puis remplacer intégralement le bloc des lignes 45 à 83 (du `const { count } = await supabase` jusqu'au `}` fermant le `catch`) par :

```tsx
  const adminClient = createAdminClient();
  const isAdminOrSecretaire = role === "admin" || role === "secretaire";

  // Ces deux requêtes ne dépendent que de user.id / role : les enchaîner coûtait
  // un aller-retour pour rien.
  const [notifRes, countsRes] = await Promise.all([
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false),
    adminClient.rpc("lead_status_counts", {
      p_assigned_to: isAdminOrSecretaire ? null : user.id,
    }),
  ]);

  const count = notifRes.count;
  // Compteurs vides plutôt qu'une page en erreur : le menu perd ses badges, le
  // reste de l'app fonctionne. C'est le comportement du try/catch d'origine.
  const statusCounts = countsRes.error
    ? {}
    : buildStatusCounts(countsRes.data ?? []);
```

Note sur `adminClient` : le fichier en déclare déjà un aux lignes 20-22, mais **à l'intérieur du `try`** du profil, donc dans une portée distincte. Il n'y a aucun conflit : la déclaration ci-dessus remplace simplement celle de la ligne 51, dans la portée externe. Ne pas supprimer celle du `try`.

Écart assumé avec la spec : elle décrit `Promise.all([profil, notifications])` puis les compteurs. Ce plan fait profil, puis `Promise.all([notifications, compteurs])`. Les deux valent ~164 ms (3 étapes dans les deux cas, les compteurs ayant besoin du rôle donc du profil), mais cette version ne touche pas au `try/catch` de repli du profil — moins de surface de régression pour le même gain. Validé par l'utilisateur.

- [ ] **Step 6: Vérifier la compilation**

Run: `npx tsc --noEmit`

Expected: aucune sortie.

- [ ] **Step 7: Vérifier que la suite complète passe**

Run: `npx vitest run`

Expected: PASS — les tests existants (`src/lib/pagination.test.ts`, `src/lib/auth-paths.test.ts`) plus les 4 nouveaux.

- [ ] **Step 8: Vérifier que les compteurs affichés n'ont pas changé**

Relancer la preuve de justesse de la Task 1, qui compare toujours la boucle de référence à la fonction :

Run: `node scripts/verify-status-counts.mjs`

Expected: `>>> SUCCES : les deux chemins donnent des compteurs identiques.`

- [ ] **Step 9: ACTION DE L'UTILISATEUR — vérification visuelle**

Demander à l'utilisateur d'ouvrir l'app après déploiement et de confirmer que les compteurs du menu latéral affichent les mêmes nombres qu'avant, et que les pages chargent plus vite. Ne pas simuler cette étape ni prétendre l'avoir faite.

- [ ] **Step 10: Commit**

```bash
git add src/lib/status-counts.ts src/lib/status-counts.test.ts "src/app/(app)/layout.tsx"
git commit -m "$(cat <<'EOF'
perf(layout): compteurs du menu via agrégat SQL au lieu de 8744 lignes

Le layout s'exécute sur chaque page de l'espace (app) : il téléchargeait toute la
table leads en 9 allers-retours séquentiels (~769ms) pour compter en JavaScript,
soit douze fois le coût du contenu réellement demandé.

Un appel à lead_status_counts() ramène ça à ~60ms et un aller-retour, et le
compteur de notifications part désormais en parallèle plutôt qu'à la suite.

Estimé : ~1150ms -> ~390ms de latence avant rendu.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

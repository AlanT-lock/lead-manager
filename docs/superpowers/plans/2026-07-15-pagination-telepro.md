# Paginer /telepro/leads — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre visibles les ~3800 leads que 3 télépros ne peuvent pas ouvrir aujourd'hui, en paginant `/telepro/leads` comme `/admin/leads`.

**Architecture:** La page charge ses leads sans `.range()` ni `.limit()`, or PostgREST plafonne à 1000 lignes sans erreur. On reproduit le motif de pagination serveur déjà en place sur `/admin/leads`, en réutilisant `fetchPaginatedLeads` et `LeadsPagination`. Le tri « statut modifié le », aujourd'hui côté client, passe côté serveur — sinon il ne trierait que la page affichée.

**Tech Stack:** Next.js 15 (App Router, React Server Components), Supabase (PostgREST), vitest.

**Spec:** `docs/superpowers/specs/2026-07-15-pagination-telepro-design.md`

## Global Constraints

- **L'ordre total est obligatoire.** `.order("created_at")` seul ne suffit pas : deux leads de même `created_at` peuvent changer de place entre deux requêtes et donc apparaître deux fois ou être sautés. Il faut `.order("id", { ascending: false })` en second critère, comme `/admin/leads` (`src/app/(app)/admin/leads/page.tsx:100-110`). Sans ça, on remplace un bug de troncature par un bug de doublons.
- **Ne PAS toucher à `/admin/redistribute`** : dette explicite, traitée dans un lot séparé (décision de l'utilisateur).
- **Ne PAS ajouter de `key` de réinitialisation** sur `TeleproLeadsTable` : contrairement à `AdminLeadsTable`, elle n'a aucune sélection multiple. Ce garde-fou serait inutile.
- Réutiliser l'existant (`src/lib/pagination.ts`, `src/components/ui-kit/LeadsPagination.tsx`) : ne rien réécrire.
- Lint cassé indépendamment (`eslint.config.mjs` flat config + ESLint 8) : utiliser `npx tsc --noEmit`, jamais `npm run lint`.
- Toute requête vers la base est en **lecture seule** (SELECT). L'utilisateur a explicitement autorisé ces lectures de production pour ce travail.

## Note de méthode : le script de preuve n'est pas un test TDD

Le script du Step 1 interroge la base directement. Il passerait dès son écriture, quoi que fasse
`page.tsx` — ce n'est donc **pas** un test du code de la page, et il ne faut pas le présenter comme tel.

Son rôle réel : **valider la stratégie avant de l'implémenter**, sur les vraies données. Il démontre
le bug actuel (la requête telle qu'écrite aujourd'hui rend 1000 lignes sur 2747) et prouve que la
stratégie visée (range + ordre total) rend bien 2747 identifiants distincts, sans doublon ni
manquant. C'est le point réellement risqué, et c'est ce qu'il couvre.

La page est ensuite écrite pour utiliser **exactement** la requête validée. La vérification que la
page l'applique bien revient à la relecture et à la vérification visuelle de l'utilisateur (Step 8).
Aucun test e2e n'est ajouté : `.env.test.local` est absent (les specs `.admin.spec.ts` se skippent
toutes), et le compte télépro de test n'a pas les volumes nécessaires pour exercer le plafond.

---

### Task 1: Paginer /telepro/leads

**Files:**
- Create: `scripts/verify-telepro-pagination.mjs`
- Modify: `src/app/(app)/telepro/leads/page.tsx` (réécriture complète)
- Modify: `src/app/(app)/telepro/leads/TeleproLeadsTable.tsx:1-80,130-170`
- Modify: `src/app/(app)/telepro/leads/LeadsFilters.tsx:35-46`

**Interfaces:**
- Consumes : `fetchPaginatedLeads(fetchPage, requestedPage, per)`, `parsePage(value)`, `parsePerPage(value)`, `PER_PAGE_COOKIE` (`src/lib/pagination.ts`) ; `<LeadsPagination page={number} per={number} total={number} />` (`src/components/ui-kit/LeadsPagination.tsx`).
- Produces : `TeleproLeadsTable` accepte désormais une prop `statusSort: StatusSortDirection`, et le type `StatusSortDirection = "none" | "desc" | "asc"` est exporté depuis `TeleproLeadsTable.tsx`.

- [ ] **Step 1: Écrire le script de validation de la stratégie**

Créer `scripts/verify-telepro-pagination.mjs` :

```js
// Lecture seule. Valide la stratégie de pagination AVANT de l'implémenter dans la page.
//
// Ce n'est pas un test du code de page.tsx : il interroge la base directement. Son rôle est
// de démontrer le bug actuel et de prouver que la stratégie visée (range + ordre total) rend
// bien tous les leads, sans doublon ni manquant.
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Le télépro au plus gros volume : c'est lui qui exerce le plafond PostgREST.
const { data: telepro } = await db
  .from("profiles")
  .select("id, full_name")
  .eq("full_name", "Lefebvre Sandra")
  .single();

if (!telepro) {
  console.log("Télépro « Lefebvre Sandra » introuvable — impossible de valider la stratégie.");
  process.exit(1);
}

const { count: reel } = await db
  .from("leads")
  .select("*", { count: "exact", head: true })
  .eq("assigned_to", telepro.id);

console.log(`Télépro : ${telepro.full_name}`);
console.log(`  leads réellement en base : ${reel}`);
console.log("");

// --- 1. Le bug actuel : la requête telle qu'écrite dans page.tsx:33-37, sans range ni limit.
const { data: actuel } = await db
  .from("leads")
  .select("*")
  .eq("assigned_to", telepro.id)
  .order("created_at", { ascending: false });

console.log("--- Requête actuelle (sans pagination) ---");
console.log(`  lignes rendues : ${actuel?.length}`);
const tronque = (actuel?.length ?? 0) < reel;
console.log(tronque
  ? `  BUG : ${reel - actuel.length} leads invisibles (${Math.round((1 - actuel.length / reel) * 100)}%)`
  : `  pas de troncature`);
console.log("");

// --- 2. La stratégie visée : range + ordre total, exactement ce que la page va faire.
const PER = 50;
const vus = [];
let pages = 0;
let total = null;

for (let page = 1; ; page++) {
  const { data, count } = await db
    .from("leads")
    .select("*", { count: "exact" })
    .eq("assigned_to", telepro.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * PER, page * PER - 1);

  if (total === null) total = count;
  if (!data || data.length === 0) break;
  vus.push(...data.map((l) => l.id));
  pages++;
  if (vus.length >= total) break;
}

const distincts = new Set(vus);
const doublons = vus.length - distincts.size;

console.log("--- Stratégie visée (range + ordre total) ---");
console.log(`  total annoncé      : ${total}`);
console.log(`  pages parcourues   : ${pages}`);
console.log(`  ids collectés      : ${vus.length}`);
console.log(`  ids distincts      : ${distincts.size}`);
console.log(`  doublons           : ${doublons}`);
console.log("");

const problemes = [];
if (total !== reel) problemes.push(`total annoncé ${total} != ${reel} réels`);
if (distincts.size !== reel) problemes.push(`${distincts.size} ids distincts != ${reel} réels (${reel - distincts.size} manquants)`);
if (doublons > 0) problemes.push(`${doublons} doublon(s) : l'ordre n'est pas total`);

if (problemes.length) {
  console.log(">>> ECHEC : la stratégie ne rend pas tous les leads.");
  for (const p of problemes) console.log(`    ${p}`);
  process.exit(1);
}

console.log(`>>> SUCCES : les ${reel} leads sont tous atteignables, sans doublon ni manquant.`);
console.log(`    (contre ${actuel?.length} avec la requête actuelle)`);
```

- [ ] **Step 2: Lancer le script**

Run: `node scripts/verify-telepro-pagination.mjs`

Expected : la partie 1 démontre le bug (`BUG : 1747 leads invisibles (64%)`), la partie 2 valide la stratégie (`SUCCES : les 2747 leads sont tous atteignables, sans doublon ni manquant`).

Si la partie 2 signale des doublons, **arrêter** : l'ordre total ne fonctionne pas comme prévu et il faut comprendre pourquoi avant d'écrire la page.

Si la partie 1 ne montre aucune troncature, **arrêter** : le diagnostic de la spec serait faux.

- [ ] **Step 3: Paginer la page**

Remplacer intégralement le contenu de `src/app/(app)/telepro/leads/page.tsx` par :

```tsx
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Plus } from "lucide-react";
import { cookies } from "next/headers";
import { LEAD_CATEGORIES, type LeadCategory } from "@/lib/types";
import { LeadsFilters } from "./LeadsFilters";
import { TeleproLeadsTable, type StatusSortDirection } from "./TeleproLeadsTable";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LeadsPagination } from "@/components/ui-kit/LeadsPagination";
import { PER_PAGE_COOKIE, fetchPaginatedLeads, parsePage, parsePerPage } from "@/lib/pagination";

export default async function TeleproLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; from?: string; to?: string; category?: string; page?: string; per?: string; sort?: string; dir?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminClient = createAdminClient();

  const params = await searchParams;
  const status = params.status as string | undefined;
  const search = params.q;
  const from = params.from;
  const to = params.to;
  const category = params.category as LeadCategory | undefined;

  // L'URL prime sur le cookie ; le cookie prime sur le défaut.
  const cookieStore = await cookies();
  const per = params.per
    ? parsePerPage(params.per)
    : parsePerPage(cookieStore.get(PER_PAGE_COOKIE)?.value);
  const requestedPage = parsePage(params.page);

  const statusSort: StatusSortDirection =
    params.sort === "status_changed_at" && (params.dir === "asc" || params.dir === "desc")
      ? params.dir
      : "none";

  const fromDate = from ? new Date(`${from}T00:00:00`) : null;
  const toDate = to ? new Date(`${to}T23:59:59.999`) : null;

  const buildQuery = () => {
    let query = adminClient
      .from("leads")
      .select("*", { count: "exact" })
      .eq("assigned_to", user.id);

    if (fromDate) query = query.gte("created_at", fromDate.toISOString());
    if (toDate) query = query.lte("created_at", toDate.toISOString());

    if (status) {
      query = query.eq("status", status);
    }

    if (category && LEAD_CATEGORIES.includes(category)) {
      query = query.eq("category", category);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(
        `first_name.ilike.${term},last_name.ilike.${term},phone.ilike.${term},email.ilike.${term}`
      );
    }

    // `.order("id")` garantit un ordre total : sans lui, deux leads de même created_at
    // peuvent changer de place entre deux requêtes et donc apparaître deux fois ou être sautés.
    if (statusSort !== "none") {
      return query
        .order("status_changed_at", { ascending: statusSort === "asc", nullsFirst: false })
        .order("id", { ascending: false });
    }

    return query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
  };

  const fetchPage = (target: number) =>
    buildQuery().range((target - 1) * per, target * per - 1);

  const { leads, page, total } = await fetchPaginatedLeads(fetchPage, requestedPage, per);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes leads"
        subtitle="Liste de tous vos leads assignés"
        actions={
          <Link
            href="/telepro/leads/new"
            className={cn(buttonVariants(), "gap-2")}
          >
            <Plus className="w-4 h-4" />
            Ajouter un lead
          </Link>
        }
      />

      <LeadsFilters />

      <TeleproLeadsTable leads={leads} statusSort={statusSort} />

      <LeadsPagination page={page} per={per} total={total} />
    </div>
  );
}
```

- [ ] **Step 4: Passer le tri du tableau côté serveur**

Dans `src/app/(app)/telepro/leads/TeleproLeadsTable.tsx` :

a) Ligne 3, retirer `useMemo` de l'import (il ne sert plus) :

```tsx
import { useState, useCallback } from "react";
```

b) Ligne 4, ajouter `usePathname` et `useSearchParams` :

```tsx
import { useRouter, usePathname, useSearchParams } from "next/navigation";
```

c) Ligne 37, exporter le type (la page en a besoin) :

```tsx
export type StatusSortDirection = "none" | "desc" | "asc";
```

d) Dans `interface TeleproLeadsTableProps`, ajouter la prop :

```tsx
interface TeleproLeadsTableProps {
  leads: Lead[];
  statusSort: StatusSortDirection;
}
```

e) Remplacer la signature et l'état de tri. L'ancienne ligne 62 (`const [statusSort, setStatusSort] = useState<StatusSortDirection>("none");`) disparaît :

```tsx
export function TeleproLeadsTable({ leads, statusSort }: TeleproLeadsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
```

f) Supprimer intégralement le bloc `sortedLeads` (lignes 64-71) :

```tsx
  const sortedLeads = useMemo(() => {
    if (statusSort === "none") return leads;
    return [...leads].sort((a, b) => {
      const dateA = a.status_changed_at ? new Date(a.status_changed_at).getTime() : 0;
      const dateB = b.status_changed_at ? new Date(b.status_changed_at).getTime() : 0;
      return statusSort === "desc" ? dateB - dateA : dateA - dateB;
    });
  }, [leads, statusSort]);
```

g) Remplacer `toggleStatusSort` (lignes 73-79) par la version qui écrit dans l'URL :

```tsx
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

h) Aux lignes 157 et 164, remplacer les deux usages de `sortedLeads` par `leads` :

```tsx
          {leads.length === 0 ? (
```

```tsx
            leads.map((lead) => (
```

Le balisage de l'en-tête (lignes 133-144) ne change pas : `statusSort` y est désormais une prop au lieu d'un état, et les trois icônes conditionnelles fonctionnent à l'identique.

- [ ] **Step 5: Préserver les paramètres dans les filtres**

Dans `src/app/(app)/telepro/leads/LeadsFilters.tsx`, à la fin de `buildParams` (juste avant le `return params;` de la ligne ~47), ajouter :

```tsx
    // Préservés à travers les changements de filtre : sans eux, changer un filtre
    // ramènerait la taille de page au défaut et perdrait l'ordre choisi.
    const per = searchParams.get("per");
    if (per) params.set("per", per);
    const sort = searchParams.get("sort");
    if (sort) params.set("sort", sort);
    const dir = searchParams.get("dir");
    if (dir) params.set("dir", dir);
    // `page` est volontairement omis : changer un filtre ramène en page 1.
```

Le `useCallback` de `buildParams` se termine aujourd'hui par `}, [currentStatus, search, from, to, currentCategory]);` — `searchParams` n'y figure pas, alors que le code ci-dessus l'utilise. Il faut l'ajouter :

```tsx
  }, [currentStatus, search, from, to, currentCategory, searchParams]);
```

Sans lui, `buildParams` capturerait un `searchParams` périmé et perdrait la taille de page dès le second changement de filtre. Le lint étant cassé sur ce dépôt, aucune règle de hooks ne le signalera — c'est à vérifier à l'œil.

- [ ] **Step 6: Vérifier la compilation**

Run: `npx tsc --noEmit`

Expected: aucune sortie.

- [ ] **Step 7: Vérifier que la suite existante passe**

Run: `npx vitest run`

Expected: PASS (29 tests — `pagination.test.ts`, `auth-paths.test.ts`, `status-counts.test.ts`).

- [ ] **Step 8: ACTION DE L'UTILISATEUR — vérification visuelle**

Demander à l'utilisateur de se connecter avec un compte télépro à gros volume (Lefebvre Sandra, 2747 leads) après déploiement, et de confirmer :
- la barre de pagination apparaît et annonce bien « 1–50 sur 2747 » (et non 1000) ;
- le sélecteur « Par page » fonctionne ;
- le clic sur l'en-tête « Statut » trie, et le tri porte sur l'ensemble des leads (le premier lead de la page 1 change) ;
- changer un filtre conserve la taille de page choisie et ramène en page 1.

Ne pas simuler cette étape ni prétendre l'avoir faite.

- [ ] **Step 9: Commit**

```bash
git add scripts/verify-telepro-pagination.mjs "src/app/(app)/telepro/leads/page.tsx" "src/app/(app)/telepro/leads/TeleproLeadsTable.tsx" "src/app/(app)/telepro/leads/LeadsFilters.tsx"
git commit -m "$(cat <<'EOF'
fix(telepro): paginer /telepro/leads — 3 télépros ne voyaient pas leurs leads

La page chargeait les leads sans .range() ni .limit(). PostgREST plafonne à 1000 lignes
sans erreur ni message : Sandra voyait 1000 de ses 2747 leads, Nathalie 1000 sur 2424,
Marie 1000 sur 1678. ~3800 leads étaient attribués à quelqu'un qui ne pouvait pas les
ouvrir — et jamais appelés.

Même motif de pagination serveur que /admin/leads, avec l'ordre total (.order("id")) qui
évite de remplacer la troncature par des doublons. Le tri « statut modifié le » passe
côté serveur : côté client, il n'aurait trié que la page affichée.

scripts/verify-telepro-pagination.mjs valide la stratégie sur les vraies données : les
2747 leads de Sandra sont atteignables, sans doublon ni manquant.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

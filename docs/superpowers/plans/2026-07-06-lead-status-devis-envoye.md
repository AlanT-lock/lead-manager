# Statut « Devis envoyé » — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter le statut de lead `devis_envoye` (« Devis envoyé »), admin/secrétaire seulement, positionné après `documents_recus`, sans changer le comportement des autres statuts.

**Architecture:** Une migration ENUM + les définitions dans `types.ts` (les maps `Record<LeadStatus>` rendent l'exhaustivité vérifiable par tsc) + la couleur du badge/selects, et une exclusion ciblée de `devis_envoye` des 3 sélecteurs télépro via une liste dérivée.

**Tech Stack:** Next.js 15 · TypeScript strict · Tailwind v4 · Supabase (Postgres ENUM).

## Global Constraints
- Clé `devis_envoye` · libellé **« Devis envoyé »** · position **après `documents_recus`** · couleur **fuchsia** (chart `#db2777` ; badge/select `bg-[#fce7f3] text-[#be185d]`, bordure select `#f9a8d4`).
- **Admin/secrétaire seulement** : exclu des sélecteurs télépro (mais affiché si posé). Aucun changement de route API, de logique métier, ou de comportement des autres statuts.
- Vérif : `npx tsc --noEmit` = 0 erreur (+ `npx playwright test --list` = 13 tests). Pas de framework de test à ajouter.
- Migration `ALTER TYPE … ADD VALUE` : fichier dédié, à exécuter seul dans le SQL Editor Supabase (non transactionnel).
- Commit final : `feat(leads): statut « Devis envoyé » …` + `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Ajouter le statut `devis_envoye`

**Files:**
- Create: `supabase/migrations/035_devis_envoye.sql`
- Modify: `src/lib/types.ts`, `src/components/StatusBadge.tsx`, `src/app/(app)/admin/leads/AdminLeadsTable.tsx`, `src/app/(app)/telepro/leads/TeleproLeadsTable.tsx`, `src/app/(app)/telepro/leads/TeleproLeadForm.tsx`, `src/app/(app)/telepro/teleprospection/TeleprospectionStatusBar.tsx`

- [ ] **Step 1: Migration**

Créer `supabase/migrations/035_devis_envoye.sql` :
```sql
-- Nouveau statut de lead : « Devis envoyé » (admin/secrétaire), après « Documents reçus »
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'devis_envoye' AFTER 'documents_recus';
```
> À exécuter seul dans le SQL Editor Supabase (ADD VALUE ne peut pas être dans une transaction multi-requêtes).

- [ ] **Step 2: `types.ts` — type + listes + libellé + couleur chart + liste dérivée**

Dans `src/lib/types.ts` :

1. Type `LeadStatus` (lignes 3-14) : ajouter `| 'devis_envoye'` juste après `| 'documents_recus'` :
```ts
  | 'documents_recus'
  | 'devis_envoye'
  | 'incomplet'
```

2. `LEAD_STATUSES_ADMIN` (ligne 22-24) : insérer `'devis_envoye'` après `'documents_recus'` :
```ts
export const LEAD_STATUSES_ADMIN: LeadStatus[] = [
  'nouveau', 'nrp', 'a_rappeler', 'en_attente_doc', 'documents_recus', 'devis_envoye', 'incomplet', 'bloque_mpr', 'valide', 'installe', 'ancien_documents_recus', 'annule',
];
```
(NE PAS toucher `LEAD_STATUSES_TELEPRO`.)

3. Juste après le bloc `LEAD_STATUSES_ADMIN`, ajouter la liste dérivée pour les sélecteurs télépro :
```ts
/** Statuts que les télépros peuvent SÉLECTIONNER dans leurs écrans (tous sauf devis_envoye, admin/secrétaire seulement). */
export const LEAD_STATUSES_TELEPRO_SELECTABLE: LeadStatus[] = LEAD_STATUSES_ADMIN.filter(
  (s) => s !== 'devis_envoye',
);
```

4. `LEAD_STATUS_LABELS` (ligne 70-82) : ajouter, après `documents_recus:` :
```ts
  devis_envoye: 'Devis envoyé',
```

5. `STATUS_CHART_COLORS` (ligne 85-97) : ajouter une entrée :
```ts
  devis_envoye: '#db2777', // fuchsia
```

- [ ] **Step 3: `StatusBadge.tsx` — couleur du badge**

Dans `src/components/StatusBadge.tsx`, dans `STATUS_BADGE` (après `documents_recus:`), ajouter :
```ts
  devis_envoye: "bg-[#fce7f3] text-[#be185d]",
```

- [ ] **Step 4: Maps de couleur des sélecteurs (afficher devis_envoye en fuchsia)**

Dans chacun de ces fichiers, repérer la fonction/objet qui mappe un statut → classes CSS (`getStatusSelectClass` / `getStatusButtonClass` / la map de couleur des boutons de statut) et ajouter le cas `devis_envoye`, **en respectant le format de retour du voisin** avec les valeurs fuchsia (`bg-[#fce7f3]`, `text-[#be185d]`, bordure `border-[#f9a8d4]` si le voisin met une bordure) :
- `src/app/(app)/admin/leads/AdminLeadsTable.tsx` (`getStatusSelectClass`, un `switch` → ajouter `case "devis_envoye": return "…"` avant le `default`).
- `src/app/(app)/telepro/leads/TeleproLeadsTable.tsx` (`getStatusSelectClass`, idem).
- `src/app/(app)/telepro/leads/TeleproLeadForm.tsx` (map de couleur des boutons de statut → ajouter l'entrée `devis_envoye`).
- `src/app/(app)/telepro/teleprospection/TeleprospectionStatusBar.tsx` (`getStatusButtonClass`, `switch` → `case "devis_envoye": return "bg-[#fce7f3] text-[#be185d] border border-[#f9a8d4]"`).

(Ces maps couvrent TOUS les statuts, y compris `devis_envoye`, pour AFFICHER un lead déjà en « Devis envoyé » — même côté télépro.)

- [ ] **Step 5: Exclure `devis_envoye` des SÉLECTEURS télépro**

Dans les 3 fichiers télépro, repérer **la boucle `.map` qui génère les options/boutons de SÉLECTION de statut** (celle qui rend les `<option>`/`<button>` cliquables pour changer le statut — actuellement `LEAD_STATUSES_ADMIN.map(...)`) et la remplacer par `LEAD_STATUSES_TELEPRO_SELECTABLE.map(...)` :
- `src/app/(app)/telepro/leads/TeleproLeadsTable.tsx` (la ligne `{LEAD_STATUSES_ADMIN.map((s) => ( <option … )}` du `<select>` inline — conserver le garde `ancien_documents_recus` existant et tout le reste).
- `src/app/(app)/telepro/leads/TeleproLeadForm.tsx` (la boucle qui rend les boutons de statut).
- `src/app/(app)/telepro/teleprospection/TeleprospectionStatusBar.tsx` (la boucle qui rend les boutons de disposition d'appel).

Importer `LEAD_STATUSES_TELEPRO_SELECTABLE` depuis `@/lib/types` dans chacun ; retirer l'import de `LEAD_STATUSES_ADMIN` s'il n'est plus utilisé ailleurs dans le fichier (sinon le garder). NE PAS toucher `AdminLeadsTable.tsx` (l'admin garde `LEAD_STATUSES_ADMIN`, il DOIT pouvoir sélectionner `devis_envoye`).

- [ ] **Step 6: Vérifier**

Run: `npx tsc --noEmit`
Expected: **0 erreur** (les maps `Record<LeadStatus>` — `LEAD_STATUS_LABELS`, `STATUS_CHART_COLORS`, `STATUS_BADGE` — échoueraient si `devis_envoye` manquait ; leur passage confirme qu'elles sont complètes).
Run: `npx playwright test --list`
Expected: 13 tests découverts (aucun testid touché).

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/035_devis_envoye.sql src/lib/types.ts src/components/StatusBadge.tsx "src/app/(app)/admin/leads/AdminLeadsTable.tsx" "src/app/(app)/telepro/leads/TeleproLeadsTable.tsx" "src/app/(app)/telepro/leads/TeleproLeadForm.tsx" "src/app/(app)/telepro/teleprospection/TeleprospectionStatusBar.tsx"
git commit -m "feat(leads): statut « Devis envoyé » (admin/secrétaire, après Documents reçus)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Déploiement
1. Exécuter `supabase/migrations/035_devis_envoye.sql` seul dans le SQL Editor Supabase (prod).
2. Vérifier : `select unnest(enum_range(NULL::lead_status));` contient `devis_envoye`.

## Récapitulatif de couverture (spec)
- Migration ENUM → Step 1 · type/listes/labels/chart/liste dérivée → Step 2 · badge → Step 3 · maps de couleur selects → Step 4 · exclusion sélecteurs télépro → Step 5 · admin l'inclut (AdminLeadsTable intact) → Step 5. Menu imbriqué + compteurs + filtres = automatiques (itèrent `LEAD_STATUSES_ADMIN`).

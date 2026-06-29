# Refonte CRM — Phase 2 (Espace Admin) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Restyler tous les écrans de l'espace admin (leads liste + détail + création, dashboard, stats, import, utilisateurs, code courrier, documents reçus, et écrans annexes) en direction « Sombre premium » via shadcn/ui + tokens + composants partagés, SANS changer aucune logique, URL, route API, ou comportement.

**Architecture:** On applique le « Restyle Playbook » ci-dessous à chaque écran/cluster : remplacer les classes inline répétées par des composants shadcn (`Button`, `Input`, `Select`, `Card`, `Table`, `Dialog`…) et les composants métier de Phase 0 (`StatusBadge`, `CategoryChip`, `PageHeader`, `StatCard`), avec les tokens direction C. Restyle en place, on ne réécrit pas la logique.

**Tech Stack:** Next.js 15 (App Router) · TypeScript · Tailwind v4 · shadcn/ui (thémé direction C) · lucide-react · recharts.

## Global Constraints

- **RESTYLE VISUEL UNIQUEMENT.** Préserver à 100% : toute la logique React/serveur (états, handlers, effets, requêtes Supabase, auto-save), les routes/URLs et **paramètres d'URL** (`?status=`, `?category=`, `?telepro=`, `?q=`, dates, `?chantier=`, `?delegataire=`, etc.), les routes API appelées, la logique de rôles, et **tous les `data-testid` existants** (notamment `lead-row`, `lead-create-form`, `lead-category-select`, `lead-first-name`/`-last-name`/`-phone`/`-assigned-to`, `filter-search`/`-category`/`-status`).
- **Aucune** modification de schéma DB, migration, route API, requête, ou logique métier.
- **Direction C** : primary `#2563eb`, fond `#f4f7fb`, surface `#ffffff`, bordure `#e1e8f2`, texte `#0b1f3a`/`#64748b`, rayons contrôle 9px / carte 12px. Statuts → `<StatusBadge>` ; catégories → `<CategoryChip>` ; les couleurs de graphiques recharts restent celles de `STATUS_CHART_COLORS`/`INSTALLATION_CHART_COLORS`.
- **Pas de framework de test unitaire** ; ne pas en ajouter. Vérif par tâche : `npx tsc --noEmit` (0) + (pages avec leads) `npx playwright test --list` (13 tests toujours découverts, testids intacts). Le check visuel des écrans **connectés** est reporté au point de contrôle de fin de Phase 2 (nécessite une vraie session).
- **Commits** : français, `refactor(ui)`, terminés par `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

## Restyle Playbook (conventions appliquées à chaque tâche)

L'implémenteur **lit chaque fichier cible en entier** puis applique, en changeant UNIQUEMENT le markup de présentation / les classes :

| Élément existant | Remplacer par |
|---|---|
| `<button className="… bg-blue-600 …">` | shadcn `<Button>` (primary) ; secondaire → `<Button variant="outline">` ; danger → `<Button variant="destructive">` ; lien-bouton → `buttonVariants(...)` + `cn()` sur `<Link>` (PAS `asChild` — base-ui) |
| `<input className="… border-slate-300 …">` / `<select>` / `<textarea>` | shadcn `<Input>` / `<select>` restylé (`border-[#e1e8f2] rounded-[9px]`) / `<Textarea>` ; conserver `id`/`name`/`type`/`value`/`onChange`/`required`/`data-testid` |
| `bg-white rounded-xl shadow-sm border border-slate-200` (cartes) | `rounded-[12px] border border-[#e1e8f2] bg-white shadow-[0_1px_2px_rgba(13,38,76,.06)]` |
| En-tête de page (`<h1>…</h1>` + actions) | `<PageHeader title subtitle? actions? />` (`@/components/ui-kit/PageHeader`) |
| Tuiles de stat | `<StatCard label value hint? />` (`@/components/ui-kit/StatCard`) |
| Tableaux (`<table>`/`<thead>`/`<tbody>`) | shadcn `Table` (`@/components/ui/table`: `Table/TableHeader/TableHead/TableBody/TableRow/TableCell`) — conserver colonnes, données, tri, sélection, `data-testid` |
| Badge de statut de lead | `<StatusBadge status={…} />` (`@/components/StatusBadge`) |
| Chip de catégorie de lead | `<CategoryChip category={…} />` (`@/components/CategoryChip`) |
| Couleurs `slate-*`/`blue-*` de texte/fond | tokens direction C (`#0b1f3a`, `#64748b`, `#2563eb`, `#f4f7fb`, `#e1e8f2`) |
| Modales maison | shadcn `Dialog` si la structure s'y prête sans changer le comportement ; sinon restyler en place |

**Règle d'or :** si un changement risque de toucher la logique (handler, état, requête, condition, `data-testid`), NE PAS le faire — ne changer que l'habillage. En cas de doute, reporter en `DONE_WITH_CONCERNS`.

## File Structure / clusters (chaque tâche = un cluster d'écran(s))

---

### Task 1: Leads — liste (page + table + filtres)
**Files (modify):** `src/app/(app)/admin/leads/page.tsx`, `src/app/(app)/admin/leads/AdminLeadsTable.tsx`, `src/app/(app)/admin/leads/AdminLeadsFilters.tsx`
**Préserver :** la requête Supabase et tous les filtres d'URL ; `data-testid="lead-row"`/`data-lead-id`, `filter-search`/`-category`/`-status` ; la sélection multiple de leads + actions (transfert/suppression) ; le branchement `DocumentsRecusTable` quand `status=documents_recus`.
**Restyle :** `PageHeader` pour l'en-tête + bouton « Ajouter un lead » (Button) ; barre de filtres en `Card` avec `<Input>`/selects restylés ; table via shadcn `Table` ; colonne Statut → `<StatusBadge>`, colonne Catégorie → `<CategoryChip>`.
- [ ] **Step 1:** Restyler les 3 fichiers selon le Playbook, préservation stricte.
- [ ] **Step 2:** `npx tsc --noEmit` → 0 ; `npx playwright test --list` → 13 tests (testids leads intacts).
- [ ] **Step 3:** Commit `refactor(ui): restyle liste des leads admin (table + filtres, direction C)` (+ co-author).

---

### Task 2: Leads — détail (formulaire dense + sections)
**Files (modify):** `src/app/(app)/admin/leads/[id]/page.tsx`, `src/app/(app)/admin/leads/[id]/AdminLeadForm.tsx`, `src/app/(app)/admin/leads/[id]/DocumentsSection.tsx`, `src/app/(app)/admin/leads/[id]/MaterialCostSection.tsx`
**Préserver (CRITIQUE) :** TOUT le comportement d'`AdminLeadForm` — `buildUpdates`, l'auto-save (timers, `leadRef`, `lastSavedRef`, `performSave`, save-on-leave), `updateField`, la version d'en-tête `X-Lead-Form-Version: 2`, tous les champs (`id`/`name`/`value`/`onChange`), le `data-testid="lead-category-select"` ; l'upload/suppression de documents (`DocumentsSection`) et le calcul des coûts matériel (`MaterialCostSection`). Ne changer QUE l'habillage. Regrouper les champs en sections `Card` lisibles (densité « confortable ») sans changer leur ordre logique ni leurs handlers.
- [ ] **Step 1:** Restyler les 4 fichiers (sections en `Card`, champs en shadcn `Input`/`select`/`Textarea`, badges/chips, boutons). Préservation stricte de l'auto-save et des handlers.
- [ ] **Step 2:** `npx tsc --noEmit` → 0. Confirmer dans le diff qu'aucun handler/timer/`buildUpdates`/testid n'a changé.
- [ ] **Step 3:** Commit `refactor(ui): restyle détail lead admin (sections en cartes, auto-save préservé)` (+ co-author).

---

### Task 3: Leads — création (admin/new)
**Files (modify):** `src/app/(app)/admin/leads/new/page.tsx`, `src/app/(app)/admin/leads/new/CreateLeadForm.tsx`
**Préserver :** l'état `form`, `update`, `handleSubmit` (POST `/api/admin/create-lead`, body `{...form}`), `usePostalCodeToCity`, TOUS les `data-testid` (`lead-create-form`, `lead-category-select`, `lead-first-name`, `lead-last-name`, `lead-phone`, `lead-assigned-to`), tous les champs + le select télépro requis.
**Restyle :** `PageHeader` ; formulaire en `Card`(s) ; champs shadcn ; bouton primary.
- [ ] **Step 1:** Restyler les 2 fichiers selon le Playbook, préservation stricte.
- [ ] **Step 2:** `npx tsc --noEmit` → 0 ; `npx playwright test --list` → 13 tests. (Le test E2E de création couvre ces testids.)
- [ ] **Step 3:** Commit `refactor(ui): restyle création de lead admin (direction C)` (+ co-author).

---

### Task 4: Dashboard admin (statistique télépro)
**Files (modify):** `src/app/(app)/admin/page.tsx`, `src/app/(app)/admin/TeleproCardWithCharts.tsx`, `src/app/(app)/admin/StatsTeleproFilters.tsx`
**Préserver :** les requêtes/agrégations, les filtres, les `Link` vers `/admin/stats-telepro/[id]`, les graphiques recharts (couleurs `STATUS_CHART_COLORS`/`INSTALLATION_CHART_COLORS` conservées).
**Restyle :** `PageHeader` ; cartes télépro en `Card` ; tuiles chiffrées en `StatCard` ; conteneurs de graphiques restylés (mais data/colors inchangées).
- [ ] **Step 1:** Restyler. - [ ] **Step 2:** `npx tsc --noEmit` → 0. - [ ] **Step 3:** Commit `refactor(ui): restyle dashboard admin (cartes télépro + graphiques)` (+ co-author).

---

### Task 5: Stats (globales + télépro + secrétaire)
**Files (modify):** `src/app/(app)/admin/stats/page.tsx` + `StatCard.tsx` + `StatsFilters.tsx` + `StatusRow.tsx` + `DelegataireRow.tsx` ; `src/app/(app)/admin/stats-telepro/page.tsx` + `[id]/page.tsx` + `[id]/StatsTeleproDetailFilters.tsx` + `[id]/TeleproStatsClient.tsx` ; `src/app/(app)/admin/stats-secretaire/page.tsx` + `StatsSecretaireFilters.tsx`
**Préserver :** toutes les requêtes/agrégations, filtres d'URL, graphiques (couleurs conservées). Note : le `StatCard.tsx` LOCAL de `stats/` peut être restylé en place OU remplacé par `@/components/ui-kit/StatCard` s'il est compatible — au choix de l'implémenteur, sans changer les données affichées.
**Restyle :** `PageHeader`, cartes/tuiles direction C, tables via shadcn `Table`, badges de statut via `<StatusBadge>`.
- [ ] **Step 1:** Restyler les fichiers du cluster. - [ ] **Step 2:** `npx tsc --noEmit` → 0. - [ ] **Step 3:** Commit `refactor(ui): restyle écrans de statistiques admin` (+ co-author).

---

### Task 6: Import CSV
**Files (modify):** `src/app/(app)/admin/import/page.tsx`, `src/app/(app)/admin/import/CsvImportForm.tsx`
**Préserver :** tout le parsing CSV (papaparse), la détection de colonnes, l'appel `/api/admin/import-csv` (ou la route utilisée), l'affichage des résultats/erreurs, le `<input type="file">`.
**Restyle :** `PageHeader` ; zone d'upload + résultats en `Card` ; boutons shadcn ; états d'erreur en direction C (`#fee2e2`/`#b91c1c`).
- [ ] **Step 1:** Restyler. - [ ] **Step 2:** `npx tsc --noEmit` → 0. - [ ] **Step 3:** Commit `refactor(ui): restyle import CSV admin` (+ co-author).

---

### Task 7: Utilisateurs
**Files (modify):** `src/app/(app)/admin/users/page.tsx`, `UsersTable.tsx`, `CreateUserForm.tsx`, `users/layout.tsx`, `src/app/(app)/admin/users/telepro/[id]/page.tsx`, `TeleproAgentConfigForm.tsx`
**Préserver :** création d'utilisateur (POST `/api/admin/create-user`), suppression télépro, la config agent Vapi/NRP du télépro (tous les champs + uploads audio + appels API), les `Link`.
**Restyle :** `PageHeader`, table utilisateurs via shadcn `Table`, formulaires en `Card` + champs shadcn.
- [ ] **Step 1:** Restyler. - [ ] **Step 2:** `npx tsc --noEmit` → 0. - [ ] **Step 3:** Commit `refactor(ui): restyle gestion utilisateurs + config agent télépro` (+ co-author).

---

### Task 8: Code courrier + Rappels/Notifications
**Files (modify):** `src/app/(app)/admin/code-courrier/page.tsx`, `CodeCourrierClient.tsx`, `CodeCourrierNotifications.tsx`, `src/app/(app)/admin/rappels-notifications/RappelsNotifications.tsx`
**Préserver :** la logique d'assignation/édition des codes courrier (appels `/api/admin/code-courrier*`), les rappels (`/api/admin/rappels*`), les notifications (polling/affichage), les `data-testid` éventuels.
**Restyle :** `PageHeader`, listes/tables shadcn, champs shadcn, badges direction C.
- [ ] **Step 1:** Restyler. - [ ] **Step 2:** `npx tsc --noEmit` → 0. - [ ] **Step 3:** Commit `refactor(ui): restyle code courrier + rappels/notifications` (+ co-author).

---

### Task 9: Documents reçus
**Files (modify):** `src/app/(app)/admin/documents-recus/page.tsx`, `DocumentsRecusTable.tsx`, `DocumentsRecusFilters.tsx`
**Préserver :** la requête + filtres, le téléchargement/visualisation de documents (URLs signées), les actions. Note : `DocumentsRecusTable` est aussi utilisé par la liste de leads (Task 1) quand `status=documents_recus` — vérifier que le restyle reste cohérent dans les deux usages.
**Restyle :** `PageHeader`, filtres en `Card`, table shadcn, `<StatusBadge>`/`<CategoryChip>` si présents.
- [ ] **Step 1:** Restyler. - [ ] **Step 2:** `npx tsc --noEmit` → 0 ; `npx playwright test --list` → 13 tests. - [ ] **Step 3:** Commit `refactor(ui): restyle documents reçus` (+ co-author).

---

### Task 10: Écrans annexes (stockage, agenda courrier, redistribution)
**Files (modify):** `src/app/(app)/admin/stockage/page.tsx` + `StockageClient.tsx` ; `src/app/(app)/admin/agenda-courrier/page.tsx` + `AgendaCourrierClient.tsx` ; `src/app/(app)/admin/redistribute/page.tsx`
**Préserver :** logique produits/stockage (CRUD `/api/admin/products*`/`suppliers*`), agenda (vue calendrier/liste), redistribution de leads (appels API), tous les handlers.
**Restyle :** `PageHeader`, cartes/tables/champs shadcn direction C.
- [ ] **Step 1:** Restyler. - [ ] **Step 2:** `npx tsc --noEmit` → 0. - [ ] **Step 3:** Commit `refactor(ui): restyle stockage + agenda courrier + redistribution` (+ co-author).

---

## Point de contrôle fin de Phase 2
- Avec une vraie session admin (dev server + `.env.local` réel), parcourir tous les écrans admin : sidebar navy, leads (liste/détail/création), stats, import, utilisateurs, code courrier, documents reçus, annexes. Vérifier qu'aucune fonctionnalité n'est cassée et que le rendu direction C est cohérent. Captures.
- Les E2E auth-gated (leads/filtres/menu/création) exécutés avec `.env.test.local` renseigné de vrais identifiants.

## Hors périmètre Phase 2
- Espace télépro (Phase 3), secrétaire/finition (Phase 4).
- Toute modification fonctionnelle.

## Récapitulatif de couverture (spec Phase 2)
- Leads liste/détail/création → Tasks 1-3 · Dashboard → Task 4 · Stats → Task 5 · Import → Task 6 · Utilisateurs → Task 7 · Code courrier → Task 8 · Documents reçus → Task 9 · Annexes (stockage/agenda/redistribution) → Task 10.

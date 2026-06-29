# Refonte CRM — Phase 3 (Espace Télépro) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Restyler tous les écrans de l'espace télépro (dashboard, leads liste/détail/création, téléprospection NRP, agenda) en direction « Sombre premium » via shadcn/ui + tokens + composants partagés, SANS changer aucune logique, URL, route API, ou comportement.

**Tech Stack:** Next.js 15 (App Router) · TypeScript · Tailwind v4 · shadcn/ui (thémé direction C) · lucide-react.

## Global Constraints

- **RESTYLE VISUEL UNIQUEMENT.** Préserver à 100% : logique React/serveur (états, handlers, effets, requêtes, **auto-save**), routes/URLs + paramètres (`?status=`, `?category=`, `?q=`, dates), routes API, logique de rôles, et tous les `data-testid` existants.
- **Aucune** modification de schéma DB, route API, requête, ou logique métier. En particulier : les **appels NRP (Vapi/Twilio)**, le suivi d'appel, les callbacks/notifications — intacts.
- **Direction C** : primary `#2563eb`, fond `#f4f7fb`, surface `#fff`, bordure `#e1e8f2`, texte `#0b1f3a`/`#64748b`, rayons 9px/12px. Statuts read-only → `<StatusBadge>` ; catégories read-only → `<CategoryChip>` ; **contrôles interactifs (selects de statut) restent interactifs**.
- **Pas de framework de test** ; ne pas en ajouter. Vérif : `npx tsc --noEmit` (0) + `npx playwright test --list` (13 tests). Check visuel des écrans connectés reporté (vraie session requise).
- **Commits** : français, `refactor(ui)`, + `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

## Restyle Playbook (identique aux Phases 1-2)
Boutons → shadcn `<Button>` (lien-bouton → `buttonVariants(...)`+`cn()` sur `<Link>`, PAS `asChild`) ; inputs/selects/textarea → shadcn `<Input>`/`<select>` restylé/`<Textarea>` (garder `id`/`value`/`onChange`/`required`/`data-testid`) ; cartes → `rounded-[12px] border border-[#e1e8f2] bg-white shadow-[0_1px_2px_rgba(13,38,76,.06)]` ; en-tête → `<PageHeader>` (`@/components/ui-kit/PageHeader`) ; tuiles chiffrées → `<StatCard>` (`@/components/ui-kit/StatCard`) ; tables → shadcn `Table` (`@/components/ui/table`) ; statut lead read-only → `<StatusBadge>`, catégorie read-only → `<CategoryChip>`. Couleurs slate/blue → tokens direction C. **Règle d'or : ne changer que l'habillage ; jamais un handler/état/requête/`data-testid`. En cas de doute → DONE_WITH_CONCERNS.**

---

### Task 1: Télépro — dashboard + layout
**Files (modify):** `src/app/(app)/telepro/page.tsx`, `src/app/(app)/telepro/NrpCallsButton.tsx`, `src/app/(app)/telepro/layout.tsx`
**Préserver :** le lancement des **appels NRP** (`NrpCallsButton` → Edge Function `nrp-calls-start` / API), les stats du télépro, tous les `<Link>` (vers `/telepro/leads`, `/telepro/teleprospection`, etc.), le role-guard du layout. (Si `telepro/layout.tsx` n'a pas de contenu visuel propre — passthrough — le laisser tel quel.)
**Restyle :** `PageHeader`, tuiles `StatCard`, bouton NRP en `Button`, cartes direction C.
- [ ] Step 1: Restyler. - [ ] Step 2: `npx tsc --noEmit` → 0 ; `npx playwright test --list` → 13. - [ ] Step 3: Commit `refactor(ui): restyle dashboard télépro + bouton NRP` (+ co-author).

---

### Task 2: Télépro — leads liste
**Files (modify):** `src/app/(app)/telepro/leads/page.tsx`, `src/app/(app)/telepro/leads/TeleproLeadsTable.tsx`, `src/app/(app)/telepro/leads/LeadsFilters.tsx`
**Préserver :** la requête (`assigned_to = user.id`), les filtres d'URL (`status`, `category`, `q`, dates) + leurs handlers, la navigation de ligne vers `/telepro/leads/[id]`, tout `data-testid`. Si une colonne statut est un **select interactif**, la garder interactive (restylée).
**Restyle :** `PageHeader`, barre de filtres en `Card`, table shadcn, statut → `<StatusBadge>` (si read-only) / select restylé (si interactif), catégorie → `<CategoryChip>`.
- [ ] Step 1: Restyler. - [ ] Step 2: `npx tsc --noEmit` → 0 ; `--list` → 13. - [ ] Step 3: Commit `refactor(ui): restyle liste leads télépro` (+ co-author).

---

### Task 3: Télépro — leads détail + création
**Files (modify):** `src/app/(app)/telepro/leads/[id]/page.tsx`, `src/app/(app)/telepro/leads/TeleproLeadForm.tsx`, `src/app/(app)/telepro/leads/TeleproDocumentsSection.tsx`, `src/app/(app)/telepro/leads/new/page.tsx`, `src/app/(app)/telepro/leads/new/CreateLeadForm.tsx`
**Préserver (CRITIQUE) :** TOUT le comportement de `TeleproLeadForm` — `pickLeadFields`, l'auto-save (`performSave`, `scheduleAutoSave`, `savingRef`/`pendingSaveRef`/`saveTimeoutRef`/`lastSavedRef`, save-on-leave), `handleFieldChange`, `category: l.category`, le select de **statut interactif** + son `callback_at`, tous les champs. `TeleproDocumentsSection` : upload taxe foncière/avis d'imposition (API `/api/telepro/lead/[id]/documents` + `/api/documents/upload`) — intact. `CreateLeadForm` (new) : état `form`, `update`, `handleSubmit` (POST `/api/telepro/create-lead`), `usePostalCodeToCity`, le select de catégorie.
**Restyle :** sections en `Card`, champs shadcn, badges/chips read-only, boutons. NE PAS toucher l'auto-save ni les handlers.
- [ ] Step 1: Restyler les 5 fichiers. - [ ] Step 2: `npx tsc --noEmit` → 0 ; confirmer dans le diff qu'aucun handler/auto-save/testid n'a changé. - [ ] Step 3: Commit `refactor(ui): restyle détail + création lead télépro (auto-save préservé)` (+ co-author).

---

### Task 4: Télépro — téléprospection (NRP)
**Files (modify):** `src/app/(app)/telepro/teleprospection/page.tsx`, `teleprospection/TeleprospectionClient.tsx`, `teleprospection/TeleprospectionStatusBar.tsx`, `teleprospection/CallbackNotifications.tsx`
**Préserver (CRITIQUE) :** TOUTE la logique d'appel — lancement/suivi des appels NRP (Vapi/Twilio), la status bar (états d'appel en temps réel), le polling, les transitions de statut de lead pendant l'appel, les callbacks (`CallbackNotifications` : polling + dismiss), tous les handlers/états/`data-testid`. C'est l'écran le plus sensible côté métier.
**Restyle :** `PageHeader`, carte d'appel + status bar en direction C, boutons d'action (appeler/raccrocher/statut) en `Button`, notifications restylées. NE changer QUE l'habillage.
- [ ] Step 1: Restyler les 4 fichiers, préservation stricte du flux d'appel. - [ ] Step 2: `npx tsc --noEmit` → 0 ; confirmer aucun handler/polling/appel API changé. - [ ] Step 3: Commit `refactor(ui): restyle écran de téléprospection (flux NRP préservé)` (+ co-author).

---

### Task 5: Télépro — agenda
**Files (modify):** `src/app/(app)/telepro/agenda/page.tsx`, `telepro/agenda/AgendaClient.tsx`
**Préserver :** la vue calendrier/liste, la navigation de dates, les callbacks/rappels affichés, les `<Link>` vers les leads, tous les handlers.
**Restyle :** `PageHeader`, calendrier/liste en `Card` direction C, boutons shadcn.
- [ ] Step 1: Restyler. - [ ] Step 2: `npx tsc --noEmit` → 0 ; `--list` → 13. - [ ] Step 3: Commit `refactor(ui): restyle agenda télépro` (+ co-author).

---

## Point de contrôle fin de Phase 3
- Avec une session télépro réelle : dashboard + NRP, leads liste/détail/création (auto-save), téléprospection (lancer un appel NRP de test), agenda. Vérifier qu'aucune fonctionnalité n'est cassée.

## Hors périmètre Phase 3
- Variante secrétaire + finition (Phase 4). Toute modification fonctionnelle.

## Récapitulatif de couverture
- Dashboard+NRP → Task 1 · Leads liste → Task 2 · Leads détail/création → Task 3 · Téléprospection → Task 4 · Agenda → Task 5.

# Refonte CRM — Phase 4 (Secrétaire & Finition) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Finir la refonte : restyler les dernières surfaces oubliées (LeadLogsSidebar) et passer une finition de cohérence (fond app-wide, accents de checkbox, sous-titres riches, nettoyage des nits différés). L'espace secrétaire partage les écrans admin (déjà restylés Phases 1-2) + la nav secrétaire (restylée P1) ; pas de travail dédié, seulement vérification.

**Tech Stack:** Next.js 15 · TypeScript · Tailwind v4 · shadcn/ui (direction C).

## Global Constraints

- **RESTYLE VISUEL UNIQUEMENT** ; préserver 100% de la logique/URLs/testids/API. Direction C (primary `#2563eb`, fond `#f4f7fb`, surface `#fff`, bordure `#e1e8f2`, texte `#0b1f3a`/`#64748b`, rayons 9px/12px).
- Pas de framework de test ; ne pas en ajouter. Vérif : `npx tsc --noEmit` (0) + `npx playwright test --list` (13 tests).
- Commits français `refactor(ui)`/`fix(ui)` + `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Restyle LeadLogsSidebar (historique du lead)
**Files (modify):** `src/components/LeadLogsSidebar.tsx`
Ce composant (panneau latéral d'historique du lead, affiché sur le détail lead) n'a jamais été restylé.
**Préserver :** le fetch de l'historique (`/api/admin/lead/[id]/logs` ou `/api/telepro/lead/[id]/logs`), l'ouverture/fermeture du panneau, le rendu des entrées (action, ancien/nouveau statut, auteur, date via date-fns), tous les handlers/états/`<Link>`/`data-testid`.
**Restyle :** panneau en surface direction C (`bg-white border-[#e1e8f2]`), titres `#0b1f3a`, texte atténué `#64748b`, badges de statut via `<StatusBadge>` si l'historique montre des statuts (sinon classes direction C), boutons shadcn. Le panneau peut garder son mécanisme d'overlay/slide actuel.
- [ ] Step 1: Restyler (lire le fichier d'abord ; ne changer que l'habillage). - [ ] Step 2: `npx tsc --noEmit` → 0 ; `--list` → 13. - [ ] Step 3: Commit `refactor(ui): restyle LeadLogsSidebar (historique du lead, direction C)` (+ co-author).

---

### Task 2: Finition & cohérence
**Files (modify):** `src/app/layout.tsx` ; `src/app/(app)/admin/stats/StatsFilters.tsx` ; `src/app/(app)/admin/stats-secretaire/StatsSecretaireFilters.tsx` ; `src/components/ui-kit/PageHeader.tsx` ; `src/app/(app)/admin/redistribute/page.tsx` ; `src/app/(app)/telepro/leads/TeleproLeadForm.tsx` ; `src/app/(app)/telepro/agenda/AgendaClient.tsx` ; `src/app/(app)/telepro/NrpCallsButton.tsx`
Corrections de cohérence (visuel/qualité de code uniquement, aucune logique) :
1. **Fond app-wide** — `src/app/layout.tsx` : sur `<body>`, remplacer `bg-slate-50 text-slate-900` par `bg-[#f4f7fb] text-[#0b1f3a]` (aligne le fond global sur la direction C). Garder `${inter.variable} font-sans antialiased`.
2. **Accents de checkbox** — dans `StatsFilters.tsx` et `StatsSecretaireFilters.tsx` : remplacer `border-slate-300 text-blue-600 focus:ring-blue-500` par `border-[#e1e8f2] text-[#2563eb] focus:ring-[#2563eb] accent-[#2563eb]` (mêmes checkboxes, juste les couleurs). Ne pas toucher aux handlers `onChange`.
3. **Sous-titre riche** — `PageHeader.tsx` : élargir le type de `subtitle` de `string` à `string | React.ReactNode` (et rendre `{subtitle}` tel quel). Puis dans `redistribute/page.tsx`, restaurer l'emphase du nom du télépro : `subtitle={<>Leads de <strong className="text-[#0b1f3a]">{teleproName}</strong> à redistribuer…</>}` (texte identique à l'original, juste le `<strong>` rétabli).
4. **Dead-code** — `TeleproLeadForm.tsx` : retirer les props désormais inutilisées `showBackToLeads`/`showTeleprospectionLink` de l'interface `TeleproLeadFormProps` (et de la déstructuration) — elles ne sont plus passées ni utilisées.
5. **Nits de padding/curseur** — `AgendaClient.tsx` : retirer le `pb-4` redondant du bloc empty-state (garder `py-6`). `NrpCallsButton.tsx` : remettre `disabled:cursor-not-allowed` sur le `<Button>`.
**Préserver :** tous les handlers/états/API/testids — ces changements sont purement cosmétiques/typage.
- [ ] Step 1: Appliquer les 5 corrections. - [ ] Step 2: `npx tsc --noEmit` → 0 ; `--list` → 13. - [ ] Step 3: Commit `fix(ui): finition cohérence direction C (fond app, checkboxes, sous-titre riche, nettoyages)` (+ co-author).

---

## Point de contrôle fin de Phase 4 (avant revue finale)
- Vérifier (vraie session) que toutes les surfaces (admin, télépro, secrétaire) sont cohérentes en direction C, fond uniforme, aucune fonctionnalité cassée.
- Vérifier la variante **secrétaire** : nav réduite (documents reçus, leads, code courrier, agenda, import, stats secrétaire) + redirection par défaut `/admin/documents-recus` — tout en direction C (écrans partagés avec admin, déjà restylés).

## Récapitulatif de couverture
- Surface oubliée (LeadLogsSidebar) → Task 1 · Finition/cohérence (fond, checkboxes, sous-titre, dead-code, nits) → Task 2 · Secrétaire → déjà couvert (Phases 1-2), vérification au checkpoint.

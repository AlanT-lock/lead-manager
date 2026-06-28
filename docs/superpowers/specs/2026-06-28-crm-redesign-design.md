# Refonte UI/UX du CRM — Design

- **Date** : 2026-06-28
- **Projet** : Lead Manager (CRM téléprospection, Next.js 15 App Router + Supabase + Tailwind v4)
- **Statut** : validé, prêt pour le plan d'implémentation

## Contexte

Le CRM est très fonctionnel mais l'habillage est générique et daté : Tailwind « utilitaire »
écrit en classes inline répétées dans ~71 composants, aucune librairie de composants, `globals.css`
quasi vide (Inter déclarée mais le `body` retombe sur Arial), couleurs en dur éparpillées, thème
clair uniquement.

## Objectif

Refonte visuelle **complète et moderne** de tout le CRM, **sans régression fonctionnelle**. Comme
une refonte d'habillage peut casser des fonctionnalités, **chaque écran refondu doit être prouvé
non cassé par des tests** avant d'avancer.

## Décisions verrouillées (validées avec l'utilisateur)

1. **Direction visuelle : « Sombre premium » (C)** — sidebar navy profond, accent bleu vif, contenu
   clair, cartes à ombres douces. Garde l'ADN bleu de la marque, nettement modernisé.
2. **Socle de composants : shadcn/ui** (compatible Tailwind v4, composants copiés dans le repo).
3. **Stratégie de test : Playwright E2E** sur les parcours critiques.
4. **Profondeur : restyle profond, architecture/flux/URLs INCHANGÉS.**
5. **Défauts** : pas de bascule dark globale (sidebar sombre + contenu clair) ; densité confortable
   (détail lead réorganisé en cartes/sections) ; responsive desktop-first pour l'admin,
   mobile-friendly pour le télépro (comportement mobile de la sidebar conservé).

## Invariants (NE PAS casser)

- **Routes/URLs identiques**, même arborescence de pages, mêmes paramètres d'URL (`?status=`,
  `?category=`, `?q=`, `?telepro=`, dates, etc.).
- **Logique de rôles inchangée** (admin / secrétaire / télépro) : middleware, redirections,
  garde-fous des routes API.
- **Données et appels inchangés** : aucune modification du schéma Supabase, des migrations, des
  routes API, des requêtes, ou de la logique métier (statuts, catégories, NRP/Vapi, import CSV,
  documents, stats…).
- **Le menu latéral imbriqué catégorie→statuts** (récemment livré) est préservé à l'identique
  fonctionnellement ; seul son habillage change.
- **Auto-save** des formulaires d'édition (admin et télépro) préservé.

## 1. Design tokens

Centralisés dans `src/app/globals.css` via `@theme` (Tailwind v4) + variables CSS. Référence
(direction C) :

| Rôle | Valeur |
|------|--------|
| Sidebar (dégradé) | `#0b1f3a` → `#13294b` |
| Primary (boutons/actions) | `#2563eb` (hover `#1d4ed8`) |
| Accent / surbrillance | `#3b82f6` |
| Fond de page | `#f4f7fb` |
| Surface (cartes) | `#ffffff` |
| Bordures | `#e1e8f2` / `#e8eef6` |
| Texte fort / titres | `#0b1f3a` |
| Texte courant | `#1e293b` / `#334155` |
| Texte atténué | `#64748b` / `#94a3b8` |
| Succès | `#22c55e` (badge `#dcfce7` / `#15803d`) |
| Attention | `#eab308` (badge `#fef9c3` / `#a16207`) |
| Erreur | `#ef4444` (badge `#fee2e2` / `#b91c1c`) |
| Info | `#4338ca` (badge `#e0e7ff`) |
| Chip catégorie Fenêtre | `#e0ecfe` / `#2563eb` |
| Chip catégorie neutre | `#f1f5f9` / `#64748b` |
| Rayons | inputs/boutons `9px`, cartes `12px` |
| Ombres | douce `0 1px 2px rgba(13,38,76,.06)` ; élevée `0 10px 30px rgba(11,31,58,.18)` |
| Police | **Inter** (chargée via `next/font`, corriger le `body` Arial) |

Les couleurs sémantiques de statut existantes (`STATUS_CHART_COLORS` dans `src/lib/types.ts`) sont
réutilisées comme source de vérité pour dériver les variantes « badge doux ». Les graphiques
(recharts) gardent leurs couleurs actuelles.

## 2. Socle de composants

Installer shadcn/ui (init Tailwind v4) et construire les primitives sous `src/components/ui/` :
`Button`, `Input`, `Select`, `Textarea`, `Checkbox`, `Card`, `Table`, `Badge`, `Dialog` (modale),
`DropdownMenu`, `Tabs`, `Toast`/sonner, `Tooltip`, `Skeleton`.

Composants métier dérivés (sous `src/components/`), réutilisés partout :
- `StatusBadge` (mappe `LeadStatus` → variante de badge)
- `CategoryChip` (mappe `LeadCategory` → chip)
- `StatCard` (carte de statistique : libellé + valeur + variation éventuelle)
- `PageHeader` (titre + sous-titre + actions)
- `FilterBar` (conteneur de filtres cohérent)
- `DataTable` (table responsive : en-têtes, lignes, sélection, état vide, chargement)

Ces composants remplacent progressivement les classes inline répétées (DRY). Les icônes restent
`lucide-react`.

## 3. Stratégie de test (Playwright)

- Installer Playwright (`@playwright/test`) + script `npm run test:e2e` + config (base URL locale,
  navigateur Chromium). Authentification via un état de session réutilisable par rôle
  (storageState), pointant sur une instance Supabase de test/dev.
- **Écrits en Phase 0, sur l'UI actuelle**, pour figer le comportement attendu AVANT de toucher au
  style. Ils ciblent le **comportement** (rôles, libellés stables, `data-testid`), pas les classes
  CSS, donc ils restent verts pendant la refonte.
- Convention : ajouter des `data-testid` stables aux éléments interactifs clés (champs de
  formulaire, lignes de table, sélecteurs de filtre, entrées de menu, boutons d'action) — ces
  ajouts sont non visuels et font partie de la Phase 0.
- **Parcours critiques couverts** :
  1. Connexion + redirection par rôle (admin → `/admin`, secrétaire → `/admin/documents-recus`,
     télépro → `/telepro`) ; déconnexion.
  2. Liste leads : filtres statut, **catégorie**, recherche, et combinaison ; URL ↔ résultats.
  3. Menu latéral imbriqué : déployer catégorie → statuts, navigation vers `?category=&status=`.
  4. Création d'un lead (admin et télépro) avec catégorie choisie → persistée et visible.
  5. Édition d'un lead : changement de statut + catégorie → persistés (auto-save).
  6. Import CSV (parsing + insertion) sur un petit fichier d'exemple.
  7. Upload d'un document sur un lead.
- **Porte de qualité par écran refondu** : tests E2E concernés **verts** + `npx tsc --noEmit` 0
  erreur + contrôle visuel (capture/agent navigateur).

> Pré-requis test : une instance Supabase de test avec un jeu de comptes (admin/secrétaire/télépro)
> et quelques leads de démonstration. Les identifiants/clé de test vivent dans `.env.test.local`
> (non commité). À défaut, les E2E qui touchent la base sont exécutés manuellement par
> l'utilisateur ; les E2E de navigation/UI pure tournent sans base.

## 4. Déploiement par phases

Chaque phase est un livrable indépendant : se termine par **tests verts + `tsc` 0 erreur + check
visuel**, et un commit.

- **Phase 0 — Fondations & filet de sécurité**
  - Tokens dans `globals.css` + Inter via `next/font`.
  - Init shadcn/ui + primitives de base + composants métier (`StatusBadge`, `CategoryChip`,
    `StatCard`, `PageHeader`, `FilterBar`, `DataTable`).
  - Harness Playwright + `data-testid` + tests des 7 parcours critiques (sur l'UI actuelle).
- **Phase 1 — Coquille & auth** : `AppLayout` + `Drawer` (sidebar navy, menu imbriqué préservé) ;
  pages auth (`/login`, `/forgot-password`, `/reset-password`, `/setup`, page d'accueil `/`).
- **Phase 2 — Espace admin** : `/admin/leads` (liste) + `/admin/leads/[id]` (détail dense
  réorganisé) + `/admin/leads/new` d'abord ; puis `/admin` (dashboard stats télépro), `/admin/stats`,
  `/admin/stats-telepro`, `/admin/stats-secretaire`, `/admin/import`, `/admin/users`
  (+ `telepro/[id]`), `/admin/code-courrier`, `/admin/agenda-courrier`, `/admin/stockage`,
  `/admin/documents-recus`, `/admin/redistribute`.
- **Phase 3 — Espace télépro** : `/telepro` (dashboard), `/telepro/leads` (+ `[id]`, `new`),
  `/telepro/teleprospection`, `/telepro/agenda`.
- **Phase 4 — Secrétaire & finition** : vérifier la variante secrétaire (nav + écrans partagés),
  passe responsive/mobile, polish (états vides, chargement, toasts, focus/accessibilité), nettoyage
  des classes inline résiduelles.

## Hors périmètre (YAGNI)

- Aucune bascule mode sombre global (sidebar sombre + contenu clair seulement).
- Aucune réorganisation de la navigation / de l'information architecture.
- Aucune nouvelle fonctionnalité, ni changement de schéma DB, de migrations, de routes API, ou de
  logique métier.
- Pas de refonte des graphiques recharts au-delà de l'harmonisation des couleurs/conteneurs.
- Pas d'internationalisation (l'app reste en français).

## Critères de réussite

1. Tous les écrans adoptent la direction C de façon cohérente (tokens partagés, composants
   shadcn/métier, plus de couleurs en dur éparpillées).
2. Les 7 parcours critiques Playwright passent **avant et après** chaque phase (aucune régression).
3. `npx tsc --noEmit` reste à 0 erreur à chaque phase.
4. URLs, rôles, données et comportements identiques à l'avant-refonte (vérifié par les E2E).
5. Le menu latéral imbriqué catégorie→statuts et l'auto-save fonctionnent comme avant.
6. Rendu responsive correct (admin desktop, télépro mobile).

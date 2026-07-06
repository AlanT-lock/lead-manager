# Statut de lead « Devis envoyé » — Design

- **Date** : 2026-07-06
- **Projet** : Lead Manager (CRM téléprospection, Next.js 15 + Supabase)
- **Statut** : validé, prêt pour le plan d'implémentation

## Objectif

Ajouter un nouveau statut de lead **« Devis envoyé »** (clé `devis_envoye`), sélectionnable par
**admin et secrétaire uniquement** (pas les télépros), positionné **après « Documents reçus »** dans
le flux, sans changer le comportement des autres statuts.

## Décisions (validées avec l'utilisateur)

1. **Qui le pose** : admin + secrétaire seulement. Les télépros ne peuvent pas le sélectionner (mais
   voient le badge si un admin l'a posé).
2. **Position** : après `documents_recus` dans l'ordre des statuts (menus, filtres, sélecteurs).
3. **Couleur** : rose/fuchsia distinct — chart `#db2777` ; badge/select `bg-[#fce7f3] text-[#be185d]`
   (bordure select `#f9a8d4`).

## Contexte technique important

Les sélecteurs de statut **côté télépro** (`TeleproLeadsTable`, `TeleproLeadForm`,
`TeleprospectionStatusBar`) itèrent aujourd'hui `LEAD_STATUSES_ADMIN` — les télépros peuvent donc
déjà poser tous les statuts. La constante `LEAD_STATUSES_TELEPRO` existe mais n'est **pas utilisée**.
Pour rendre `devis_envoye` admin-only **sans changer la visibilité des statuts existants**, on
**exclut spécifiquement** `devis_envoye` de ces 3 sélecteurs (ils gardent tout le reste). On ne
« répare » pas l'inconsistance `LEAD_STATUSES_TELEPRO` (hors périmètre).

## Changements

### 1. Migration Postgres
`supabase/migrations/035_devis_envoye.sql` :
```sql
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'devis_envoye' AFTER 'documents_recus';
```
> `ALTER TYPE … ADD VALUE` ne peut pas tourner dans un bloc transactionnel avec d'autres requêtes ;
> fichier dédié, exécuté seul dans le SQL Editor Supabase.

### 2. `src/lib/types.ts`
- `LeadStatus` : ajouter `'devis_envoye'`.
- `LEAD_STATUSES_ADMIN` : insérer `'devis_envoye'` **après `'documents_recus'`**.
- `LEAD_STATUSES_TELEPRO` : inchangé.
- `LEAD_STATUS_LABELS` : `devis_envoye: 'Devis envoyé'` (map `Record<LeadStatus, string>` — vérifié
  par tsc).
- `STATUS_CHART_COLORS` : `devis_envoye: '#db2777'` (map `Record<LeadStatus, string>` — vérifié par
  tsc).
- Nouvel export : `export const LEAD_STATUSES_TELEPRO_SELECTABLE: LeadStatus[] = LEAD_STATUSES_ADMIN.filter((s) => s !== 'devis_envoye');`
  (liste utilisée par les 3 sélecteurs télépro pour exclure `devis_envoye`).

### 3. `src/components/StatusBadge.tsx`
- `STATUS_BADGE` (`Record<LeadStatus, string>`, vérifié par tsc) : `devis_envoye: "bg-[#fce7f3] text-[#be185d]"`.

### 4. Maps de couleur des sélecteurs (ajouter un cas couleur `devis_envoye` = fuchsia)
- `src/app/(app)/admin/leads/AdminLeadsTable.tsx` — `getStatusSelectClass`.
- `src/app/(app)/telepro/leads/TeleproLeadsTable.tsx` — `getStatusSelectClass`.
- `src/app/(app)/telepro/leads/TeleproLeadForm.tsx` — map de couleur des boutons de statut.
- `src/app/(app)/telepro/teleprospection/TeleprospectionStatusBar.tsx` — `getStatusButtonClass`.

### 5. Exclusion côté télépro (sélection)
Dans `TeleproLeadsTable.tsx`, `TeleproLeadForm.tsx`, `TeleprospectionStatusBar.tsx` : remplacer
l'itération `LEAD_STATUSES_ADMIN.map(...)` (celle qui génère les **options/boutons de sélection**)
par `LEAD_STATUSES_TELEPRO_SELECTABLE.map(...)`. Ne PAS changer la logique d'affichage/handlers, ni
le garde `ancien_documents_recus` existant. (Les maps de couleur des selects, elles, incluent
`devis_envoye` pour l'affichage d'un lead déjà en « Devis envoyé ».)

## Automatique (sans code dédié)
- Le **menu latéral imbriqué** (catégorie→statuts) et les **compteurs** (`(app)/layout.tsx`) itèrent
  `LEAD_STATUSES_ADMIN` → « Devis envoyé » apparaît et est compté automatiquement.
- Les filtres `?status=devis_envoye` fonctionnent (les pages leads filtrent `.eq("status", …)`).

## Hors périmètre (YAGNI)
- Ne pas corriger l'inconsistance `LEAD_STATUSES_TELEPRO` non utilisée (au-delà de l'exclusion de
  `devis_envoye`).
- Aucun changement de route API, de logique métier, ou de comportement des autres statuts.
- Pas de traitement spécial (contrairement à `documents_recus` qui bascule sur une table dédiée, ou
  `a_rappeler` qui exige `callback_at`).

## Critères de réussite
1. Après migration, un admin/secrétaire peut mettre un lead en « Devis envoyé » (liste, détail, menu,
   filtre) ; le badge s'affiche en fuchsia.
2. Les télépros ne voient PAS « Devis envoyé » dans leurs sélecteurs, mais l'affichent correctement
   si un admin l'a posé.
3. Le menu imbriqué montre « Devis envoyé » (avec compteur) après « Documents reçus ».
4. `npx tsc --noEmit` = 0 erreur (les maps `Record<LeadStatus>` garantissent l'exhaustivité).

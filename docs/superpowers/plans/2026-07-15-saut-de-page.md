# Saut direct vers un numéro de page — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un champ « Aller à » dans la barre de pagination des leads, permettant de saisir un
numéro de page et d'y accéder directement, sans cliquer de page en page.

**Architecture:** Un `<form>` contenant un `<input type="number">` est ajouté à
`LeadsPagination.tsx`, entre la navigation et le sélecteur « Par page ». La soumission (touche Entrée,
native au formulaire) lit la valeur, la ramène dans les bornes via `clampPage` — la fonction déjà
utilisée et testée par le reste de la pagination — puis appelle le `goToPage` existant et vide le champ.

**Tech Stack:** Next.js 15 (App Router, Client Component), React 18, Tailwind.

## Global Constraints

- **Un seul fichier modifié** : `src/components/ui-kit/LeadsPagination.tsx`. Rien d'autre.
- Ce composant n'est rendu que par `/admin/leads` et `/admin/documents-recus` : le champ n'apparaît
  donc que là, et **aucune condition de rôle n'est à écrire**.
- **Réutiliser `clampPage` et `goToPage`** : ne pas réécrire de règle de bornage ni de navigation.
- Hors bornes ⇒ **ramener à la page la plus proche**, sans message d'erreur (9999 ⇒ dernière page,
  0 ou négatif ⇒ page 1).
- Saisie vide ou non numérique ⇒ **aucune navigation**, aucun état d'erreur.
- **Vider le champ après le saut** (`setValue("")`) — voir Task 1, Step 2 pour le pourquoi.
- Pas de bouton « Aller ». Pas de test automatisé nouveau.
- Français : libellés, `aria-label`, commentaires, message de commit.
- `npx tsc --noEmit` = 0 erreur. **Ne PAS lancer `npm run lint`** : il est cassé dans ce repo
  indépendamment de ce plan (ESLint 8.57.1 installé vs `eslint.config.mjs` important `eslint/config`,
  qui exige ESLint 9 ; échoue à l'identique sur des fichiers non touchés).
- Spec de référence : `docs/superpowers/specs/2026-07-15-saut-de-page-design.md`.

## Structure des fichiers

| Fichier | Changement |
|---|---|
| `src/components/ui-kit/LeadsPagination.tsx` | + import `useState` et `clampPage` ; + état `gotoValue` ; + handler `handleGoto` ; + `<form>` dans la barre |

**Inchangés** : `src/lib/pagination.ts` (`clampPage` est réutilisée telle quelle), les deux pages
paginées, toute la branche `/telepro`.

---

### Task 1: Champ « Aller à » dans la barre de pagination

**Files:**
- Modify: `src/components/ui-kit/LeadsPagination.tsx`

**Interfaces:**
- Consumes : `clampPage(page: number, count: number): number` depuis `@/lib/pagination` (existe déjà,
  couvert par `src/lib/pagination.test.ts`) ; `goToPage(target: number)` et `count`, déjà définis dans
  le composant.
- Produces : rien (tâche terminale, aucun autre fichier ne dépend de ce changement).

- [ ] **Step 1: Ajouter les imports**

Dans `src/components/ui-kit/LeadsPagination.tsx`, remplacer les lignes 3 et 5 :

```ts
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PER_PAGE_COOKIE, PER_PAGE_OPTIONS, pageCount, pageNumbers } from "@/lib/pagination";
```

par :

```ts
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PER_PAGE_COOKIE, PER_PAGE_OPTIONS, clampPage, pageCount, pageNumbers } from "@/lib/pagination";
```

- [ ] **Step 2: Ajouter l'état et le handler de saut**

Dans le corps du composant, ajouter l'état juste après `const searchParams = useSearchParams();` (l. 19) :

```ts
  const [gotoValue, setGotoValue] = useState("");
```

Puis ajouter le handler juste après la fonction `changePerPage` (donc après la l. 44), avant le
`if (count <= 1) return null;` :

```ts
  const handleGoto = (event: React.FormEvent) => {
    event.preventDefault();

    const target = Number(gotoValue);
    // Saisie vide ou non numérique : l'intention est ambiguë, on s'abstient plutôt que de deviner.
    // `Number("")` vaut 0 et passerait `Number.isInteger` — d'où le test sur la chaîne elle-même,
    // sans lequel un champ vide validé par inadvertance enverrait sur la page 1.
    if (!gotoValue.trim() || !Number.isInteger(target)) return;

    // Même règle de bornage que le serveur : 9999 mène à la dernière page, 0 à la première.
    goToPage(clampPage(target, count));

    // Next.js ne remonte PAS les Client Components quand seuls les search params changent (il patche
    // l'arbre RSC). Sans ce reset, le champ garderait « 6 » après le saut, puis continuerait de
    // l'afficher après un clic sur le numéro 3 — un chiffre qui ne veut plus rien dire.
    setGotoValue("");
  };
```

- [ ] **Step 3: Ajouter le formulaire dans la barre**

Entre la fermeture du `</nav>` (l. 114) et le `<label>` du sélecteur « Par page » (l. 116), insérer :

```tsx
        <form
          data-testid="pagination-goto-form"
          onSubmit={handleGoto}
          className="flex items-center gap-2 text-sm text-[#64748b]"
        >
          <label htmlFor="pagination-goto">Aller à</label>
          <input
            id="pagination-goto"
            data-testid="pagination-goto"
            type="number"
            min={1}
            max={count}
            value={gotoValue}
            onChange={(event) => setGotoValue(event.target.value)}
            aria-label="Aller à la page"
            className="h-8 w-16 rounded-md border border-[#e2e8f0] bg-white px-2 text-sm text-[#0b1f3a]"
          />
        </form>
```

> `min`/`max` ouvrent le clavier numérique sur mobile et documentent l'intervalle, mais n'empêchent
> **pas** la saisie hors bornes : c'est `clampPage` à la soumission qui fait foi.

- [ ] **Step 4: Vérifier les types**

Run: `npx tsc --noEmit`
Expected: aucune sortie.

- [ ] **Step 5: Vérifier que rien n'est cassé**

Run: `npm test`
Expected: PASS — 25 tests (aucun ne couvre ce composant ; on vérifie l'absence de régression sur
`src/lib/pagination.test.ts` et `src/lib/auth-paths.test.ts`).

- [ ] **Step 6: Relire le diff**

Run: `git diff src/components/ui-kit/LeadsPagination.tsx`
Vérifier à l'œil :
- `setGotoValue("")` est bien présent dans `handleGoto` (c'est le point le plus facile à oublier, et
  le plus difficile à voir sans navigateur) ;
- le `<form>` est bien **entre** `</nav>` et le `<label>` « Par page » ;
- aucune autre partie du composant n'a bougé ;
- `useState` est appelé **avant** le `if (count <= 1) return null;` (règle des hooks).

- [ ] **Step 7: Commit**

```bash
git add src/components/ui-kit/LeadsPagination.tsx
git commit -m "feat(pagination): champ « Aller à » pour sauter directement à une page"
```

---

## Vérification manuelle (par l'utilisateur, qui a un accès admin)

Cette fonctionnalité n'a **pas de couverture automatisée** — c'est un choix assumé de la spec (la
logique de bornage est déjà testée via `clampPage` ; un test e2e serait toujours « skipped » sans
`.env.test.local` et dépendrait du volume de la base ; il n'y a pas de runner de tests de composants
React dans le repo). Ces vérifications sont donc le vrai filet :

- [ ] Sur `/admin/leads` avec plus d'une page, le champ « Aller à » est visible dans la barre.
- [ ] Saisir `3` + Entrée ⇒ page 3, filtres/recherche/tri conservés.
- [ ] Saisir un numéro trop grand ⇒ dernière page. Saisir `0` ⇒ page 1.
- [ ] Saisir `1` + Entrée ⇒ page 1, et l'URL ne contient **pas** `page=1`.
- [ ] Champ vide + Entrée ⇒ rien ne se passe.
- [ ] Après un saut, le champ est vide — **et le reste après un clic sur un numéro de page**.
- [ ] Idem sur `/admin/documents-recus`, et une fois en tant que secrétaire.
- [ ] `/telepro/leads` : toujours aucune barre, aucun champ.

# Saut direct vers un numéro de page — Design

- **Date** : 2026-07-15
- **Projet** : Lead Manager (CRM téléprospection, Next.js 15 + Supabase)
- **Statut** : validé, prêt pour le plan d'implémentation
- **Prolonge** : [`2026-07-14-pagination-leads-design.md`](2026-07-14-pagination-leads-design.md)

## Objectif

Ajouter à la barre de pagination un champ permettant de saisir un numéro de page et d'y accéder
directement, sans cliquer de page en page. Uniquement là où la pagination existe : `/admin/leads` et
`/admin/documents-recus` (rôles admin et secrétaire).

## Périmètre

**Un seul fichier modifié** : `src/components/ui-kit/LeadsPagination.tsx`.

Ce composant est rendu par les deux pages paginées et par elles seules. Le champ y apparaît donc
automatiquement aux deux endroits, et **nulle part ailleurs** — la liste télépro n'a pas de barre de
pagination du tout. **Aucune condition de rôle à écrire**, exactement comme pour la pagination elle-même.

## Décisions (validées avec l'utilisateur)

1. **Visibilité** : le champ est visible dès que la barre l'est, c'est-à-dire dès qu'il y a plus d'une
   page. Pas de seuil supplémentaire — l'interface ne doit pas bouger selon le nombre de pages.
2. **Hors bornes** : la saisie est **ramenée à la page la plus proche** (9999 ⇒ dernière page, 0 ou
   valeur négative ⇒ page 1). Pas de message d'erreur.
3. **Validation par la touche Entrée**, via un vrai `<form>` — pas de gestionnaire de touche à la main.
4. **Pas de bouton « Aller »** : la barre est déjà chargée (compteur, flèches, numéros, sélecteur de
   taille).
5. **Pas de test e2e supplémentaire** (voir « Tests »).

## Architecture

### Le champ

Un `<form>` contenant un `<input>`, placé dans la barre **entre la navigation (`<nav>`) et le
sélecteur « Par page »**. Libellé « Aller à ».

`<form>` plutôt qu'un `onKeyDown` sur l'input : la soumission par Entrée est alors native, gratuite
et accessible. `onSubmit` fait `event.preventDefault()` puis navigue.

L'input est `type="number"` avec `min={1}` et `max={count}` : cela ouvre le clavier numérique sur
mobile et documente l'intervalle attendu.

**Le `<form>` porte `noValidate`, et ce n'est pas cosmétique.** Sans lui, la validation HTML5 native
bloque l'événement `submit` dès que la valeur sort de `[min, max]` : `handleGoto` — donc `clampPage` —
ne s'exécuterait jamais, et taper `9999` puis Entrée n'afficherait qu'une bulle d'erreur du navigateur
sans mener nulle part. Ce serait la négation du critère de réussite n°3. Avec `noValidate`, `min`/`max`
deviennent purement indicatifs et **c'est le clamp à la soumission qui fait foi**, ce qui est bien
l'intention.

> Cette subtilité a été trouvée en revue, après qu'une première version de la spec ait affirmé
> l'inverse. Ne pas retirer `noValidate` en le croyant superflu.

### Le comportement à la soumission

```
valeur saisie -> Number()
  -> si ce n'est pas un entier >= 1  : ne rien faire (pas de navigation, champ conservé)
  -> sinon : clampPage(valeur, count) -> goToPage(...) -> vider le champ
```

- **`clampPage(value, count)` existe déjà** dans `src/lib/pagination.ts` (Task 1 de la pagination) et
  est couvert par ses tests. On la réutilise : aucune seconde règle de bornage à écrire, aucun risque
  de divergence avec le clamp serveur.
- **`goToPage(target)` existe déjà** dans le composant : il préserve tous les autres paramètres d'URL
  (filtres, recherche, tri) et retire `page` quand la cible est la page 1 (URL propre). Rien à ajouter.
- **Une saisie vide ou non numérique ne fait rien** : pas de navigation, pas de message, pas d'état
  d'erreur à gérer. L'intention est ambiguë, on s'abstient.

### Vider le champ après le saut

C'est le point non évident. Le champ a besoin d'un `useState` (input contrôlé) — le premier état local
de ce composant. Or **Next.js ne remonte pas les Client Components quand seuls les search params
changent** : il patche l'arbre RSC, et React réconcilie le composant (même type, même position). Un
état de saisie **survivrait donc à la navigation**.

Sans précaution, le champ afficherait encore « 6 » après être arrivé page 6, puis continuerait
d'afficher « 6 » si l'utilisateur clique ensuite sur le numéro 3 — un chiffre qui ne veut plus rien
dire. On appelle donc `setValue("")` à la soumission, juste après `goToPage`.

> C'est exactement le mécanisme qui a produit le bug critique de sélection multiple corrigé le
> 2026-07-15 (commit `2ad3e09`) : la sélection survivait au changement de page. Même cause, même
> vigilance. Ne pas « simplifier » en retirant le `setValue("")`.

**Pourquoi pas un `key` comme pour `AdminLeadsTable`** : la barre doit rester montée (elle porte la
navigation en cours). Vider explicitement l'état à la soumission est plus direct et plus local qu'un
remontage forcé.

## Accessibilité

- `<label>` associé au champ, texte « Aller à » visible (cohérent avec « Par page » juste à côté).
- `aria-label` explicite sur l'input : `Aller à la page`.
- `data-testid` : `pagination-goto` sur l'input, `pagination-goto-form` sur le formulaire.

## Tests

**Aucun test automatisé nouveau.** Justification, en toute franchise :

- La **logique de bornage est déjà testée** : `clampPage` est couverte par `src/lib/pagination.test.ts`
  (cas hors bornes haut, bas, et dans l'intervalle). Le champ ne fait que l'appeler.
- Un **test e2e *de l'application* serait fragile et muet** : la revue finale de la pagination a établi
  que les tests e2e touchant la barre dépendent du volume de la base de test (le champ, comme la
  barre, n'existe que s'il y a plus d'une page). Ils sont par ailleurs **toujours « skipped »** faute
  de `.env.test.local`. Ajouter un test qui ne s'exécute jamais donnerait une fausse impression de
  couverture.

> **Nuance apprise en revue.** Le bug `noValidate` ci-dessus a été trouvé au navigateur **sans session
> admin ni base de test** : il suffisait d'isoler le `<form>`/`<input>` dans une page HTML statique et
> de la piloter avec Playwright. « Pas de session authentifiée » n'est donc pas une excuse valable
> pour ne rien vérifier au navigateur — le comportement natif d'un formulaire se teste hors de
> l'application. À garder en tête pour toute prochaine fonctionnalité reposant sur des mécanismes
> natifs du navigateur.
- Il n'y a **pas de runner de test de composants React** dans ce repo (Vitest y est configuré en
  `environment: "node"`, sans jsdom ni Testing Library). En introduire un pour un champ de 15 lignes
  serait disproportionné.

**Vérification** : `npx tsc --noEmit` = 0 erreur, plus une vérification manuelle (ci-dessous).

> `npm run lint` est cassé dans ce repo indépendamment de ce travail (ESLint 8 installé vs
> `eslint.config.mjs` exigeant ESLint 9) : ne pas l'inclure dans les étapes de vérification.

## Hors périmètre (YAGNI)

- Pas de bouton « Aller » (décision 4).
- Pas de message d'erreur ni d'état invalide (décision 2 : on clampe, on ne refuse pas).
- Pas de saut sur `/telepro/leads` (aucune pagination) ni `/admin/redistribute` (non paginée).
- Pas de modification du contrat d'URL : le champ réutilise `?page=` tel quel.
- Pas de changement du serveur, des requêtes, ou du clamp existant.

## Critères de réussite

1. Sur `/admin/leads` et `/admin/documents-recus`, dès qu'il y a plus d'une page, un champ « Aller à »
   est visible dans la barre.
2. Saisir `3` puis Entrée mène à la page 3, en conservant filtres, recherche et tri.
3. Saisir un numéro trop grand mène à la dernière page ; `0` ou un négatif mène à la première.
4. Saisir `1` mène à la page 1 et l'URL ne contient pas `page=1` (cohérent avec les boutons existants).
5. Une saisie vide ou non numérique + Entrée ne provoque aucune navigation.
6. Après un saut, le champ est vide — et le reste après un clic sur un numéro de page.
7. `/telepro/leads` reste sans barre et sans champ.
8. `npx tsc --noEmit` = 0 erreur.

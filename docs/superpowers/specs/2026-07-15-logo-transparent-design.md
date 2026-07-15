# Logo sans fond + réduction de taille — Design

- **Date** : 2026-07-15
- **Projet** : Lead Manager (CRM téléprospection, Next.js 15 + Supabase)
- **Statut** : validé, prêt pour le plan d'implémentation

## Objectif

Remplacer le logo RS ÉCOLOGIE par sa version à fond transparent, et réduire un peu son encombrement
sur les deux écrans où il apparaît.

## Constats (vérifiés, pas supposés)

### Le logo n'apparaît qu'à deux endroits

| Fichier | Écran | Taille actuelle |
|---|---|---|
| `src/components/Drawer.tsx:113-120` | Menu latéral (fond bleu marine `#0b1f3a`→`#13294b`) | `h-28` = 112 px |
| `src/components/auth/AuthShell.tsx:19` | Écran de connexion (fond clair `#f4f7fb`) | `h-16` = 64 px |

Aucune autre référence dans le repo : ni favicon, ni métadonnées, ni génération de PDF (vérifié par
`grep` sur tout le dépôt hors `node_modules`/`.next`). Remplacer le fichier **sous le même nom**
suffit donc — aucune référence à modifier.

### Le fichier source est réellement transparent

`~/Downloads/Untitled Project-4.png` (le plus récent, 2026-07-15 13:07) :
- 1024×1024, PNG, **coins à alpha 0** — transparence réelle, vérifiée pixel par pixel, pas déduite du
  drapeau `hasAlpha` (qui indique seulement la présence d'un canal alpha, pas son contenu).
- Le dessin n'occupe que la boîte `(157, 186)`→`(876, 828)`, soit **719×642 px** : il y a une marge
  transparente importante autour (le dessin fait ~63 % de la hauteur de la toile).
- 338 Ko.

L'actuel `public/logo.png` : 1024×1024, **alpha minimum 255** — fond blanc totalement opaque. 1 Mo.

### Un défaut préexistant : les dimensions déclarées sont fausses

Les deux composants déclarent `width={320} height={114}` (rapport 2,8:1) pour un fichier **carré**
(1:1). Next.js utilise ces valeurs pour réserver l'espace de mise en page : avec `h-28 w-auto`, il
réserve une boîte d'environ **314 px de large** pour un dessin de 112 px — dans un menu latéral qui
fait 256 px de large. `object-contain` sauve le rendu (l'image carrée est ajustée dans la boîte), mais
l'espace mort reste.

C'est corrigé ici parce que c'est le code même que l'on modifie.

## Le problème découvert en cours de route : le texte devient illisible

**Mesuré, pas supposé.** Le texte « RS ÉCOLOGIE » du logo est en vert très foncé (`rgb(9,59,35)`).
Rapports de contraste :

| Contexte | Contraste | Verdict |
|---|---|---|
| Texte sur le carré blanc **actuel** | **12,64:1** | lisible |
| Texte sur l'écran de connexion (fond clair) | **11,76:1** | lisible |
| Texte sur le menu latéral, une fois transparent | **1,31:1** | **invisible** |

Seuil WCAG AA pour du texte : 4,5:1. Le carré blanc rendait donc un service que personne n'avait
identifié : il donnait au texte son contraste sur le fond bleu marine. Le supprimer transforme le nom
de la marque en tache sombre.

Le symbole (feuille, soleil, arc) reste lui parfaitement lisible sur le bleu — c'est uniquement le
texte qui pose problème.

## Décisions (validées avec l'utilisateur)

1. **Fichier** : `Untitled Project-4.png` remplace `public/logo.png`, **même nom** (logo complet,
   transparent). Utilisé tel quel sur l'écran de connexion, où le contraste est bon.
2. **Menu latéral : symbole seul.** Nouveau `public/logo-symbole.png` (509×498), obtenu en découpant
   le logo complet aux lignes 186→683 — le texte commence à la ligne 725, après une bande vide de
   41 px, la coupe est donc franche et ne rogne rien. Le menu affiche déjà « Espace administrateur »
   juste en dessous : l'identification reste claire sans le texte du logo.
3. **Dimensions déclarées** : `width={320} height={114}` ⇒ les vraies dimensions de chaque fichier
   (1024×1024 pour le logo complet, 509×498 pour le symbole). **Le rendu ne change pas**
   (`object-contain` ajustait déjà l'image) ; seul l'espace mort disparaît.
4. **Tailles** : menu latéral `h-28` ⇒ `h-14` (112 ⇒ 56 px) ; connexion `h-16` ⇒ `h-14` (64 ⇒ 56 px).
   Dans le menu, le symbole apparaissait déjà à ~54 px (noyé dans le carré blanc de 112 px) : il garde
   donc sa taille visible, tandis que l'encombrement du logo est **divisé par deux**.

## Hors périmètre (YAGNI)

- Ne pas produire de version claire du logo pour fonds sombres (elle réglerait le problème de
  contraste proprement, mais elle n'existe pas — le symbole seul répond au besoin sans nouvel asset).
- Ne pas introduire de variantes SVG, de multiples tailles, ni de mode sombre.
- Ne pas toucher au reste du menu latéral ni de l'écran de connexion.
- Ne pas ajouter de favicon (il n'y en a pas aujourd'hui ; ce n'est pas la demande).

## Tests

**Aucun test automatisé.** Il n'y a rien à tester programmatiquement : un remplacement d'asset et deux
valeurs CSS ne se vérifient qu'à l'œil. `npx tsc --noEmit` reste lancé (les props `width`/`height` de
`next/image` sont typées).

> `npm run lint` est cassé dans ce repo indépendamment de ce travail (ESLint 8 installé vs
> `eslint.config.mjs` exigeant ESLint 9) : ne pas l'inclure dans les vérifications.

**Vérification au navigateur** — et cette fois elle est possible et obligatoire. Une leçon récente de
ce projet : « pas de session admin authentifiée » n'est pas une excuse pour ne rien vérifier
visuellement. L'écran de connexion (`/login`) est **public** : il affiche le logo sans authentification.
Le rendu du fichier transparent y est donc vérifiable directement.

## Critères de réussite

1. `public/logo.png` a un fond transparent (coins à alpha 0) et pèse ~331 Ko au lieu de ~1 Mo.
2. Sur `/login`, le logo **complet** (texte inclus) apparaît sans carré blanc sur le fond clair,
   à 56 px de haut.
3. Dans le menu latéral, le **symbole seul** apparaît sans carré blanc sur le fond bleu marine,
   à 56 px de haut, sans trace du texte illisible.
4. Aucun espace mort horizontal autour du logo (dimensions déclarées cohérentes avec chaque fichier).
5. Ni logo ni symbole n'est déformé (rapports respectifs préservés).
6. `npx tsc --noEmit` = 0 erreur.

## Vérification effectuée

- **`/login`, au navigateur** (route publique, aucune authentification requise) : fichier `logo.png`
  servi, rendu **56×56 px**, coin à alpha 0 après passage par l'optimiseur d'images de Next
  (la transparence survit), ~30 000 pixels opaques aux couleurs de la marque — l'image n'est pas vide.
- **Menu latéral** : inatteignable sans session. Vérifié par composition du fichier réel sur le vrai
  dégradé `#0b1f3a`→`#13294b` aux dimensions exactes — le symbole ressort nettement aux trois tailles
  testées (64/56/48 px).
- Contrastes calculés selon la formule WCAG (voir tableau ci-dessus).

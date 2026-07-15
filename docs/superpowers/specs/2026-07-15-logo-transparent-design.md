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

## Décisions (validées avec l'utilisateur)

1. **Fichier** : `Untitled Project-4.png` remplace `public/logo.png`, **même nom**.
2. **Dimensions déclarées** : `width={320} height={114}` ⇒ `width={1024} height={1024}` dans les deux
   composants. **Le rendu ne change pas** (`object-contain` ajustait déjà l'image carrée) ; seul
   l'espace mort disparaît.
3. **Réduction** : menu latéral `h-28` ⇒ `h-24` (112 ⇒ 96 px) ; connexion `h-16` ⇒ `h-14` (64 ⇒ 56 px).
   Environ 13 % de moins de chaque côté.

## Ce qui va changer visuellement, et pourquoi

Deux effets se cumulent, et il faut les distinguer pour ne pas être surpris :

- **La réduction des boîtes (−13 %)** diminue l'encombrement réel, c'est-à-dire la place prise dans la
  mise en page. C'est ce que demandait l'utilisateur.
- **La transparence diminue en plus la taille *apparente***, indépendamment de toute valeur CSS.
  Aujourd'hui, le pourtour blanc est opaque : c'est le carré entier de 112 px qui « fait » le logo à
  l'œil. Une fois transparent, seul le dessin reste visible — environ 63 % de la boîte, soit ~60 px
  dans le menu latéral après réduction.

Cumulé, le logo occupera visuellement à peu près **moitié moins** qu'aujourd'hui. C'est assumé. Si le
résultat est trop discret, remonter `h-24` d'un cran suffit (une ligne).

## Hors périmètre (YAGNI)

- Ne pas recadrer le fichier pour supprimer sa marge transparente : elle fait partie de l'asset fourni,
  et la recadrer rendrait la taille du dessin dépendante d'un traitement maison.
- Ne pas renommer le fichier, ni introduire de variantes (SVG, plusieurs tailles, mode sombre).
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

1. `public/logo.png` a un fond transparent (coins à alpha 0) et pèse ~338 Ko au lieu de ~1 Mo.
2. Sur `/login`, le logo apparaît **sans carré blanc** sur le fond clair, à 56 px de haut.
3. Dans le menu latéral, le logo apparaît **sans carré blanc** sur le fond bleu marine, à 96 px de haut.
4. Aucun espace mort horizontal autour du logo (dimensions déclarées cohérentes avec le fichier).
5. Le logo n'est ni déformé ni rogné (rapport 1:1 préservé).
6. `npx tsc --noEmit` = 0 erreur.

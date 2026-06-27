# Analyse des invocations de fonctions Vercel (CRM Lead Manager)

**Contexte :** ~800M d’invocations de fonctions sur une journée → coût et risque très élevés.  
**Objectif :** Identifier les causes possibles **sans** modifier le code (analyse uniquement).

---

## Cause racine identifiée et corrigée (17/03/2026)

Les métriques Vercel ont montré que **deux routes** concentraient presque tout le trafic :

- **`/api/admin/lead/[id]`** : ~155K–157K requêtes / 12 h  
- **`/api/admin/leads/[id]/materials`** : ~156K requêtes / 12 h, avec **~33,6 % d’erreurs 5XX** (surcharge).

**Cause :** Une **boucle infinie** dans `AdminLeadForm` (`src/app/(app)/admin/leads/[id]/AdminLeadForm.tsx`).

Après chaque enregistrement réussi (PATCH lead + PUT materials), le code vérifiait « s’il y a eu des modifications pendant l’enregistrement » en comparant `buildUpdates(leadRef.current)` à `lastSavedRef.current`. Or `buildUpdates()` inclut **`updated_at: new Date().toISOString()`** : à chaque appel on obtient un timestamp différent. La comparaison était donc **toujours différente** → rappel de `performSave()` → nouveau PATCH + nouveau PUT → boucle sans fin.

**Effet :** Dès qu’un admin avait un dossier lead ouvert (avec formulaire + section matériaux), le client enchaînait des PATCH et PUT en continu, d’où les centaines de milliers d’invocations et la surcharge côté `/api/admin/leads/[id]/materials` (erreurs 5XX).

**Correction appliquée :** Suppression du bloc qui rappelait `performSave()` après l’enregistrement. L’auto-save (debounce 1,5 s sur les champs) continue de gérer les modifications utilisateur après la fin du save.

---

## 1. Ce qui compte comme « invocation » sur Vercel

- **Chaque requête** vers une Serverless Function ou une Edge Function compte comme **1 invocation** (succès ou échec).
- En pratique dans ton projet :
  - **Middleware** (Edge) : 1 invocation par requête qui matche le matcher.
  - **Route handlers** (`/api/*`) : 1 invocation par requête entrante.
  - **Rendu serveur** (pages/layouts en Server Components) : le rendu RSC d’une page/layout compte dans l’exécution serveur (souvent facturé avec les fonctions ou le « serverless » selon le plan).

Donc une seule action utilisateur peut générer **plusieurs invocations** (middleware + API + éventuellement rendu).

---

## 2. Middleware : exécuté sur presque toutes les requêtes

**Fichier :** `src/middleware.ts`  
**Matcher :** tout sauf `_next/static`, `_next/image`, `favicon.ico`, et fichiers image (svg, png, jpg, etc.).

Conséquences :

- **Chaque chargement de page** → 1 exécution du middleware.
- **Chaque `fetch("/api/...")` côté client** → 1 exécution du middleware **et** 1 exécution de la route API.

Donc **1 appel API client = au moins 2 invocations** (middleware + route).

Dans le middleware tu fais notamment :

- `supabase.auth.getUser()`
- Jusqu’à **2** requêtes Supabase `profiles` (selon chemin et rôle)

Si le tableau de bord Vercel inclut les **Edge / Middleware** dans les « function invocations », alors **tout le trafic** (pages + API) contribue déjà énormément au total.

---

## 3. Layout racine `(app)` : lourd à chaque page

**Fichier :** `src/app/(app)/layout.tsx`

Ce layout est un **Server Component async** qui tourne à **chaque** requête de page sous `/admin` ou `/telepro` :

- `createClient()` + `supabase.auth.getUser()`
- Lecture **profiles** (adminClient ou supabase)
- Comptage **notifications** (unread)
- Pour admin/secrétaire : **une requête de comptage par statut** (`LEAD_STATUSES_ADMIN.map(...)`) → plusieurs appels DB
- Pour télépro : **une requête** `leads` (assigned_to + status)

Donc **une seule page vue** = travail serveur important (auth + profil + notifications + agrégations). Si Vercel compte le rendu RSC comme des invocations ou du temps de fonction, ce layout multiplie le coût de chaque navigation.

En plus, les layouts **admin** et **telepro** refont chacun `getUser()` et une lecture `profiles`. Donc **doublon** d’auth/profil à chaque requête de page.

---

## 4. Polling et intervalles côté client

| Composant / flux | Route API | Fréquence |
|------------------|-----------|-----------|
| `CallbackNotifications` (télépro) | `GET /api/telepro/callback-due` | Toutes les **60 s** |
| `RappelsNotifications` (admin/secrétaire) | `GET /api/admin/rappels-due` | Toutes les **60 s** |
| `CodeCourrierNotifications` (admin/secrétaire) | `GET /api/admin/code-courrier-due` | Toutes les **60 s** |
| `NrpCallsButton` (après « Lancer les appels NRP ») | `GET /api/telepro/pending-lead` | Toutes les **1,5 s** pendant max 2 min |

Pour un utilisateur donné, au pire : 3 × (1 req / 60 s) + pendant 2 min 1 req / 1,5 s. Ça reste de l’ordre de quelques dizaines de requêtes par minute par utilisateur, donc **insuffisant à lui seul pour expliquer 800M/jour**, sauf si ces composants étaient montés en boucle ou en très grand nombre (voir plus bas).

---

## 5. Autres sources d’appels API

- **Geocode** (`usePostalCodeToCity`) : appel à `/api/geocode/postal-code` dès qu’un code postal à 5 chiffres est saisi (avec garde `lastFetchedRef` pour éviter doublon pour le même code). Pas de debounce explicite ; `cache: "no-store"` → pas de cache navigateur.
- **Teleprospection** : à l’affichage d’un lead, `TeleprospectionClient` fait **3 appels** en parallèle (lead, logs, documents) puis preload du lead suivant. Comportement normal par lead affiché.
- **MaterialCostSection** : au montage, **2 appels** (products + materials). Une fois par lead ouvert.
- **router.refresh()** : utilisé après de nombreuses mutations (sauvegarde, suppression, etc.). Chaque `router.refresh()` déclenche un nouveau rendu serveur de la route courante → **au moins 1 invocation** (middleware + rendu). Pas de `router.refresh()` trouvé dans un `setInterval` ou un `useEffect` sans garde, donc pas de boucle évidente identifiée.

Une boucle infinie a été identifiée et corrigée dans `AdminLeadForm` (voir section « Cause racine identifiée » en tête de document).

---

## 6. Pas de N+1 côté listes

- `AdminLeadsTable` et `TeleproLeadsTable` reçoivent les leads en **props** (données déjà chargées par la page serveur). Pas de `fetch` par ligne.
- Les notifications (rappels, code courrier, callback) sont **un composant par zone** (layout admin vs télépro), pas un composant par ligne. Donc pas de multiplication des intervalles par ligne.

---

## 7. Synthèse : pourquoi 800M est plausible

1. **Middleware sur tout le trafic**  
   Si chaque requête (pages + API) compte comme invocation Edge, alors **tout** trafic (utilisateurs, bots, prefetch, scripts) contribue. 800M requêtes/jour ≈ ~9 250 req/s en moyenne ; un trafic élevé ou des pics (bots, monitoring mal configuré, prefetch agressif) peuvent expliquer un tel ordre de grandeur.

2. **Double comptage possible**  
   Une même action (ex. un `fetch("/api/...")`) peut être comptée à la fois comme :
   - 1 invocation middleware,
   - 1 invocation de la route API.  
   Donc **2 invocations par appel API client**.

3. **Coût serveur par page**  
   Chaque chargement de page = middleware + layout(s) + page. Les layouts font beaucoup d’auth et de requêtes DB. Si Vercel facture ou compte le rendu RSC comme des invocations / durée de fonction, chaque navigation est coûteuse.

4. **Trafic anormal non exclu**  
   - Bots / crawlers qui envoient des milliers de requêtes.
   - Outils de monitoring ou health checks qui appellent une URL trop souvent.
   - Un script ou une extension qui recharge ou appelle des APIs en boucle.

5. **Pas de boucle infinie évidente dans le code**  
   Les `router.refresh()`, `useEffect` et intervalles vus sont soit liés à des actions utilisateur, soit à des intervalles fixes (60 s / 1,5 s). Rien qui expliquerait à lui seul des centaines de millions d’invocations sans un trafic déjà énorme ou une source externe.

---

## 8. Recommandations pour identifier la cause exacte (sans implémentation)

1. **Vercel Observability (prioritaire)**  
   - Onglet **Observability** du projet → trier par **Invocations** (et éventuellement **Duration**).
   - Identifier les **routes/fonctions** qui représentent la majorité des invocations (ex. middleware, une route API précise, une page).
   - Vérifier la **répartition dans le temps** (pics, constant, uniquement certaines plages).  
   Cela dira si le problème vient du middleware, d’une API en particulier, ou du rendu de pages.

2. **Vérifier le trafic**  
   - Dans Vercel : logs, analytics, ou « Usage » pour voir le volume de requêtes par type (pages vs API).
   - Si possible : regarder les **referrers / User-Agent** pour détecter bots ou scripts.

3. **Cibler les routes les plus appelées**  
   Une fois Observability consulté, on pourra cibler :
   - une réduction du périmètre du middleware (ex. exclure certaines routes),
   - une limitation du polling (intervalles plus longs ou arrêt quand l’onglet est en arrière-plan),
   - une mise en cache (ex. geocode, ou certaines réponses API),
   - ou la mise en place de rate limiting / protection contre les abus.

---

## 9. Résumé des points à risque dans le code (pour plus tard)

| Élément | Risque | Commentaire |
|--------|--------|-------------|
| Middleware avec matcher large | Élevé | Toute requête (hors static) = 1 invocation Edge. |
| Layout `(app)` + layouts admin/telepro | Élevé | Beaucoup de requêtes DB et auth à chaque page. |
| Polling 60 s (×3) + 1,5 s (NRP) | Modéré | Peut monter si beaucoup d’utilisateurs ou d’onglets. |
| Geocode sans cache (no-store) | Faible à modéré | Chaque saisie code postal = 1 appel. |
| router.refresh() après mutations | Faible | 1 rendu serveur par action, pas de boucle détectée. |

**Prochaine étape recommandée :** Ouvrir **Vercel → projet → Observability**, trier par invocations, et noter les 5–10 routes/fonctions qui totalisent la majorité des invocations. Avec ça, on pourra proposer des changements ciblés (sans tout refactorer).

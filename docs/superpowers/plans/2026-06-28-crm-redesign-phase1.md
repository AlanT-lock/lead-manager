# Refonte CRM — Phase 1 (Coquille & Auth) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyler la coquille de l'app (AppLayout + sidebar navy) et tous les écrans d'authentification (login, mot de passe oublié, réinitialisation, setup, accueil) en direction « Sombre premium », via shadcn/ui + les tokens, SANS changer aucune logique, URL, ou comportement.

**Architecture:** On mappe d'abord les variables de thème shadcn sur la direction C (pour que `<Button>`/`<Input>`/etc. soient on-brand automatiquement), on crée un composant partagé `AuthShell` (carte d'auth de marque) qui DRY-fie les 5 surfaces d'auth, puis on restyle chaque surface et enfin la sidebar.

**Tech Stack:** Next.js 15 (App Router) · TypeScript · Tailwind v4 · shadcn/ui (déjà installé) · lucide-react.

## Global Constraints

- **Direction C** (verbatim) : primary `#2563eb` (hover `#1d4ed8`), accent/ring `#3b82f6`, sidebar dégradé `#0b1f3a`→`#13294b`, fond `#f4f7fb`, surface `#ffffff`, bordure `#e1e8f2`, texte fort `#0b1f3a`, atténué `#64748b`, erreur `#ef4444`. Rayons : contrôle `9px`, carte `12px`.
- **Préserver à 100% le comportement** : toute la logique React (handlers, états, effets, validations), les routes/URLs, les redirections par rôle, les `data-testid` existants, les `id`/`name`/`type` des champs (`#email`, `#password`, etc.), les libellés de boutons utilisés par les tests (« Se connecter », « Déconnexion »), et le comportement mobile de la sidebar (drawer + overlay).
- **Aucune modification** de schéma DB, routes API, requêtes, ou logique métier.
- **shadcn on-brand** : après Task 1, les composants shadcn (`Button`, `Input`, etc.) utilisent la direction C via leurs variables de thème — préférer `<Button>`/`<Input>` aux classes inline répétées (DRY).
- **Vérification par tâche** : `npx tsc --noEmit` (0 erreur) + préservation structurelle (testids/logique intacts) + **capture d'écran Playwright** de la page restylée (pour les écrans rendus sans auth) que l'implémenteur **lit** (outil Read) pour confirmer : pas de casse de mise en page, rendu conforme direction C. Les écrans nécessitant une auth (Drawer/app) : check visuel reporté au point de contrôle de fin de phase.
- **Pas de framework de test unitaire** : ne pas en ajouter. Les E2E Playwright existants (Phase 0) doivent rester verts (au moins `--project=public` + `tsc`/`--list`).
- **Commits** : français, `feat(ui)`/`refactor(ui)`, terminés par `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

## File Structure (Phase 1)

- `src/app/globals.css` — mapper variables shadcn → direction C (modifié)
- `src/components/auth/AuthShell.tsx` — carte d'auth partagée (créé)
- `src/app/login/page.tsx`, `src/app/forgot-password/page.tsx`, `src/app/reset-password/page.tsx`, `src/app/setup/page.tsx`, `src/app/page.tsx` — restylés
- `src/app/(app)/layout.tsx`, `src/components/Drawer.tsx` — restylés (coquille + sidebar)

---

### Task 1: Mapper le thème shadcn sur la direction C

**Files:** Modify `src/app/globals.css`

**Interfaces:**
- Produces: les variables de thème shadcn (`--primary`, `--ring`, `--destructive`, `--border`, `--input`, `--radius`, etc.) pointent sur la direction C. Toutes les tâches suivantes utilisent les composants shadcn qui en héritent.

- [ ] **Step 1: Repérer le bloc `:root` de shadcn**

Lire `src/app/globals.css`. shadcn a écrit (Phase 0) un bloc `:root { … }` avec ses variables en oklch (`--background`, `--foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`, `--card`, `--popover`, …) et un bloc `.dark { … }`.

- [ ] **Step 2: Remapper les variables shadcn clés sur la direction C**

Dans le `:root` de shadcn, remplacer les valeurs des variables suivantes par les valeurs direction C (garder les autres variables shadcn telles quelles) :

```css
  --background: #f4f7fb;
  --foreground: #0b1f3a;
  --card: #ffffff;
  --card-foreground: #0b1f3a;
  --popover: #ffffff;
  --popover-foreground: #0b1f3a;
  --primary: #2563eb;
  --primary-foreground: #ffffff;
  --secondary: #f1f5f9;
  --secondary-foreground: #0b1f3a;
  --muted: #f1f5f9;
  --muted-foreground: #64748b;
  --accent: #e0ecfe;
  --accent-foreground: #2563eb;
  --destructive: #ef4444;
  --border: #e1e8f2;
  --input: #e1e8f2;
  --ring: #3b82f6;
  --radius: 0.5625rem; /* 9px */
```

Ne PAS toucher au `.dark { … }` (mode sombre non utilisé) ni aux tokens custom `--color-*`/`--sidebar-*` de Phase 0.

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit` → 0 erreur. `npm run build` → vert. Les écrans existants (qui n'utilisent pas encore les classes shadcn `bg-primary`, etc.) restent inchangés visuellement.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(ui): mapper le thème shadcn sur la direction C (primary #2563eb, ring, border, radius)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Composant partagé AuthShell

**Files:** Create `src/components/auth/AuthShell.tsx`

**Interfaces:**
- Consumes: shadcn `Card` (optionnel), tokens (Task 1).
- Produces: `<AuthShell title subtitle? footer?>{children}</AuthShell>` — carte d'auth centrée, de marque (logo RS ÉCOLOGIE), réutilisée par les 5 surfaces d'auth.

- [ ] **Step 1: Créer `src/components/auth/AuthShell.tsx`**

```tsx
import type { ReactNode } from "react";
import Image from "next/image";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f4f7fb]">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Image src="/logo.png" alt="RS ÉCOLOGIE" width={320} height={114} className="h-16 w-auto object-contain" priority />
        </div>
        <div className="rounded-[12px] border border-[#e1e8f2] bg-white p-8 shadow-[0_10px_30px_rgba(11,31,58,.10)]">
          <h1 className="text-2xl font-bold text-[#0b1f3a]">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-[#64748b]">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
        {footer ? <div className="mt-6 text-center text-sm text-[#64748b]">{footer}</div> : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Vérifier** — `npx tsc --noEmit` → 0 erreur.

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/AuthShell.tsx
git commit -m "feat(ui): composant AuthShell (carte d'auth de marque, partagée)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Restyle de la page Login

**Files:** Modify `src/app/login/page.tsx`

**Interfaces:** Consumes `AuthShell` (Task 2), shadcn `Button`/`Input` (Task 1).

**Préserver impérativement :** tout le `LoginForm` (états, `handleSubmit`, vérif env Supabase, gestion `error`/`success`, redirection `window.location.href = "/"`), le `data-testid="login-form"` sur le `<form>`, les `<input id="email">` / `<input id="password">` (id + type), le bouton de texte « Se connecter », le lien « Mot de passe oublié ? » → `/forgot-password`, le `Suspense`.

- [ ] **Step 1: Restyler le rendu**

Garder toute la logique. Remplacer le markup de présentation par `AuthShell` + composants shadcn. Conserver `id`, `type`, `value`, `onChange`, `required`, le `data-testid="login-form"` et les textes. Structure cible (adapter aux états error/success existants) :

```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/auth/AuthShell";
// … garder les imports existants (useState, useEffect, Suspense, useSearchParams, Link, createClient)

// dans le return du LoginForm, remplacer le wrapper + carte par :
return (
  <AuthShell
    title="Connexion"
    subtitle="Connectez-vous à votre espace"
    footer={<Link href="/" className="text-[#2563eb] hover:underline">Retour à l'accueil</Link>}
  >
    <form onSubmit={handleSubmit} data-testid="login-form" className="space-y-4">
      {error && <div className="rounded-[9px] bg-[#fee2e2] px-3 py-2 text-sm text-[#b91c1c]">{error}</div>}
      {success && <div className="rounded-[9px] bg-[#dcfce7] px-3 py-2 text-sm text-[#15803d]">{success}</div>}
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-[#0b1f3a]">Email</label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-[#0b1f3a]">Mot de passe</label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Connexion..." : "Se connecter"}
      </Button>
      <p className="text-center">
        <Link href="/forgot-password" className="text-sm font-medium text-[#2563eb] hover:underline">Mot de passe oublié ?</Link>
      </p>
    </form>
  </AuthShell>
);
```

(Le `LoginPage` par défaut garde son `Suspense` ; son fallback peut rester ou être simplifié en gardant `bg-[#f4f7fb]`.)

- [ ] **Step 2: Vérifier (tsc + E2E public + capture)**

Run: `npx tsc --noEmit` → 0 erreur.
Run: `npx playwright test --project=public` → les 2 tests `auth.public.spec.ts` passent (la page login s'affiche, testid présent). (Le webServer lance `npm run dev`.)
**Capture visuelle :** prendre une capture de `/login` et la lire pour confirmer le rendu direction C sans casse. Commande :
```bash
npx playwright screenshot --wait-for-timeout=1500 http://localhost:3000/login /tmp/login.png
```
(ou via un petit script Playwright). Puis lire `/tmp/login.png` (outil Read) et vérifier : carte blanche centrée + logo, bouton bleu #2563eb « Se connecter », champs encadrés, fond #f4f7fb. Si le dev server n'est pas lançable, noter le check visuel comme reporté.

- [ ] **Step 3: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "refactor(ui): restyle page Login (AuthShell + shadcn, direction C)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Restyle Mot de passe oublié + Réinitialisation

**Files:** Modify `src/app/forgot-password/page.tsx`, `src/app/reset-password/page.tsx`

**Préserver impérativement :** `forgot-password` — `handleSubmit` (resetPasswordForEmail + redirectTo `${SITE_URL}/reset-password`), l'état `success` et son écran « Email envoyé », l'`<input id="email">`. `reset-password` — toute la logique de session/hash (`useEffect`, `checkSession`, timers, `onAuthStateChange`), validations (longueur ≥ 6, correspondance), `updateUser` + signOut + redirection `/login?message=Mot de passe modifié`, les états `ready`/`error`/écran « Lien invalide », les `<input id="password">`/`id="confirmPassword">`, le `Suspense`.

- [ ] **Step 1: Restyler `forgot-password/page.tsx`** — garder la logique ; envelopper chaque état (formulaire ET écran succès) dans `<AuthShell>` ; remplacer inputs/boutons par shadcn `Input`/`Button` ; bloc erreur en `bg-[#fee2e2] text-[#b91c1c]` ; liens en `text-[#2563eb]`. Le bouton « Envoyer le lien » et le lien « Retour à la connexion » → `/login` conservés. Le bouton-lien « Retour à la connexion » de l'écran succès devient un `<Button asChild className="w-full"><Link href="/login">…</Link></Button>`.

- [ ] **Step 2: Restyler `reset-password/page.tsx`** — garder TOUTE la logique de session/validation ; envelopper les 3 états de rendu (chargement, « Lien invalide », formulaire) dans `<AuthShell>` (ou pour le chargement, un simple wrapper `min-h-screen … bg-[#f4f7fb]` avec texte atténué) ; inputs/boutons shadcn ; libellés/erreurs en direction C. Conserver `id="password"`/`id="confirmPassword"`, `minLength={6}`, le bouton « Réinitialiser le mot de passe ».

- [ ] **Step 3: Vérifier** — `npx tsc --noEmit` → 0. Capture de `/forgot-password` (rendu sans auth) → lire l'image, confirmer direction C. (`/reset-password` affiche l'écran « Lien invalide » sans token — acceptable pour le check visuel.)

- [ ] **Step 4: Commit**

```bash
git add src/app/forgot-password/page.tsx src/app/reset-password/page.tsx
git commit -m "refactor(ui): restyle écrans mot de passe oublié + réinitialisation (AuthShell + shadcn)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Restyle Setup + Accueil

**Files:** Modify `src/app/setup/page.tsx`, `src/app/page.tsx`

**Préserver impérativement :** `setup` — `runCheck`/`useEffect`, `handleSubmit` (POST /api/setup), tous les états (`canSetup === null`, `checkError`, `!canSetup`, formulaire), les `<input id="fullName"/email/password">`, le bouton « Créer le compte admin », les boutons « Réessayer »/« Continuer quand même ». `page.tsx` (accueil, **server component**) — la logique `getUser` + redirections par rôle (admin→`/admin`, secretaire→`/admin/documents-recus`, telepro→`/telepro`) + les deux écrans (choix d'espace si rôle inconnu ; landing non connecté) ; `export const dynamic = "force-dynamic"`.

- [ ] **Step 1: Restyler `setup/page.tsx`** — garder la logique ; envelopper l'état formulaire dans `<AuthShell title="Première configuration" subtitle="Créez le compte administrateur">` ; inputs/boutons shadcn ; les états `checkError`/`!canSetup` conservés, restylés en cartes direction C (boutons shadcn `Button` primary + `variant="outline"` pour secondaire). Conserver tous les `id`/textes.

- [ ] **Step 2: Restyler `page.tsx` (accueil)** — garder toute la logique serveur. Restyler les deux écrans de retour (« Choisir votre espace » et la landing) : titre `text-[#0b1f3a]`, carte/section centrée, boutons via shadcn `Button` (primary pour l'action principale, `variant="outline"` pour la secondaire) avec `asChild` + `<Link>` pour conserver la navigation (`/admin`, `/telepro`, `/login`, `/setup`). Ne pas changer les `href`.

- [ ] **Step 3: Vérifier** — `npx tsc --noEmit` → 0. Capture de `/setup` et `/` (landing non connecté) → lire, confirmer direction C.

- [ ] **Step 4: Commit**

```bash
git add src/app/setup/page.tsx src/app/page.tsx
git commit -m "refactor(ui): restyle écrans setup + accueil (direction C, shadcn)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Restyle de la coquille — AppLayout + Sidebar (Drawer)

**Files:** Modify `src/app/(app)/layout.tsx`, `src/components/Drawer.tsx`

**Préserver impérativement (CRITIQUE) :** TOUTE la logique du `Drawer` — sélection `nav` par rôle/espace, l'état `open` (mobile) + overlay + bouton hamburger + comportement `lg:translate-x-0`, le **menu imbriqué catégorie→statuts** (états `categoriesExpanded`/`expandedCategory`, `catTotal`, liens `?category=`/`?category=&status=`, mise en évidence active), TOUS les `data-testid` (`nav-leads`, `nav-leads-toggle`, `nav-category-${cat}`, `nav-status-${cat}-${s}`), le `handleLogout` + le bouton « Déconnexion », les compteurs (`statusCounts`), le bloc notifications, le `userName`. Le `AppLayout` — toute la logique serveur (profil, rôle, `deleted_at` signOut, `statusCounts`, `unreadNotifications`), le `Suspense`, la structure `flex` + `lg:ml-64`.

> Cette tâche change UNIQUEMENT l'habillage (classes/couleurs), pas la structure logique. Lire `Drawer.tsx` entièrement et remplacer les couleurs/écarts, pas la logique.

- [ ] **Step 1: Restyler la sidebar (`Drawer.tsx`)** — remplacer le fond `bg-[#2d4a6d]` (et bordures/hover associés) par le **dégradé navy** : sur l'`<aside>`, `bg-gradient-to-b from-[#0b1f3a] to-[#13294b] border-r border-white/10`. Items de nav : inactif `text-[#9fb4d6] hover:bg-white/10`, actif `bg-[#3b82f6]/20 text-white font-medium shadow-[inset_0_0_0_1px_rgba(96,165,250,.45)]`. Sous-items catégorie/statut : mêmes familles de couleurs (texte `text-[#cfe0ff]`/atténué, surbrillance active `bg-white/15`). Compteurs `text-white/70 tabular-nums`. Bouton hamburger (mobile) : `bg-[#13294b] border border-white/15`. Déconnexion : hover `hover:bg-red-500/25`. Garder les icônes lucide, les `data-testid`, la structure JSX et toute la logique. L'`Image` du logo reste.
- [ ] **Step 2: Restyler `AppLayout`** — `main` : `bg-[#f4f7fb]` (fond direction C) si pas déjà via body ; garder `lg:ml-64`, le `Suspense` fallback en `bg-gradient-to-b from-[#0b1f3a] to-[#13294b]` pour la colonne. Aucune autre logique modifiée.
- [ ] **Step 3: Vérifier (tsc + E2E list + structurel)** — `npx tsc --noEmit` → 0. `npx playwright test --list` → les 13 tests toujours découverts (les testids du Drawer intacts). Confirmer dans le diff qu'aucun `data-testid` ni handler n'a changé. **Check visuel d'un écran authentifié reporté au point de contrôle de fin de Phase 1** (nécessite une session).
- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/layout.tsx" src/components/Drawer.tsx
git commit -m "refactor(ui): sidebar navy + coquille direction C (logique/menu imbriqué/testids préservés)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Point de contrôle fin de Phase 1 (après Task 6)
- Vérifier en session réelle (dev server + connexion) : sidebar navy, menu imbriqué fonctionnel, navigation par rôle, mobile (drawer + overlay), déconnexion. Captures des écrans authentifiés.
- Les E2E auth-gated (redirect/menu/filtres) seront exécutés quand `.env.test.local` sera fourni.

## Hors périmètre Phase 1
- Restyle des écrans admin (Phase 2), télépro (Phase 3), secrétaire/finition (Phase 4).
- Toute modification fonctionnelle.

## Récapitulatif de couverture (spec Phase 1)
- Coquille + sidebar navy (menu imbriqué préservé) → Task 6.
- Auth (login, forgot, reset, setup, accueil) → Tasks 3-5, sur base `AuthShell` (Task 2) + thème shadcn direction C (Task 1).

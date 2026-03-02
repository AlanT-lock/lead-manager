# Déploiement sur Netlify

Vercel ne fonctionne pas pour ce projet (erreur interne persistante). Utilisez Netlify à la place.

## Étapes

1. **Créer un compte Netlify** : https://app.netlify.com/signup

2. **Connecter le dépôt GitHub** :
   - Cliquez sur **Add new site** → **Import an existing project**
   - Choisissez **GitHub** et connectez votre compte
   - Sélectionnez le dépôt `AlanT-lock/lead-manager`

3. **Configuration du build** (auto-détectée) :
   - Build command : `npm run build`
   - Publish directory : `.next` (Netlify le gère automatiquement pour Next.js)
   - Base directory : `./` (laisser vide)

4. **Variables d'environnement** :
   - Allez dans **Site settings** → **Environment variables**
   - Ajoutez les mêmes variables que celles de `.env.local` :
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`

5. **Déployer** :
   - Cliquez sur **Deploy site**
   - Netlify va builder et déployer automatiquement

## Déploiements futurs

Chaque push sur la branche `main` déclenchera un nouveau déploiement automatique.

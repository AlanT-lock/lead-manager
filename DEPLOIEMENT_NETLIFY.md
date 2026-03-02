# Déploiement sur Netlify

Vercel ne fonctionne pas pour ce projet (erreur interne persistante). Utilisez Netlify à la place.

## Étapes

1. **Créer un compte Netlify** : https://app.netlify.com/signup

2. **Connecter le dépôt GitHub** :
   - Cliquez sur **Add new site** → **Import an existing project**
   - Choisissez **GitHub** et connectez votre compte
   - Sélectionnez le dépôt `AlanT-lock/lead-manager`

3. **Configuration du build** :
   - Build command : `npm run build`
   - **Publish directory : LAISSER VIDE** (le plugin Next.js gère tout)
   - Base directory : laisser vide

4. **Variables d'environnement (OBLIGATOIRES)** :
   - Allez dans **Site settings** → **Environment variables** → **Add a variable**
   - Ajoutez ces 3 variables (les mêmes que dans `.env.local`) :
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
   - Sans ces variables, l'app ne fonctionnera pas (404 ou erreurs).

5. **Redéployer** après avoir ajouté les variables :
   - **Deploys** → **Trigger deploy** → **Deploy site**

## Déploiements futurs

Chaque push sur la branche `main` déclenchera un nouveau déploiement automatique.

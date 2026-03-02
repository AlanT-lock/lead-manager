# Déploiement sur Vercel (sans GitHub)

## 1. Installer la CLI Vercel

```bash
npm i -g vercel
```

Ou avec npx (sans installation) :

```bash
npx vercel
```

## 2. Se connecter à Vercel

```bash
cd /Users/alantouati/lead-manager
vercel login
```

Suivez les instructions pour vous connecter (email, GitHub, etc.).

## 3. Premier déploiement

```bash
cd /Users/alantouati/lead-manager
vercel
```

Répondez aux questions :
- **Set up and deploy?** → Y
- **Which scope?** → Votre compte
- **Link to existing project?** → N (nouveau projet)
- **Project name?** → lead-manager (ou autre)
- **In which directory is your code?** → ./ (appuyez sur Entrée)
- **Want to override the settings?** → N

## 4. Configurer les variables d'environnement

**Avant le déploiement en production**, ajoutez vos clés Supabase :

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Collez votre URL Supabase quand demandé
# Production, Preview, Development → sélectionnez les 3

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Collez votre clé anon

vercel env add SUPABASE_SERVICE_ROLE_KEY
# Collez votre clé service_role (ne la partagez jamais !)
```

Ou en une seule commande (remplacez les valeurs) :

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production <<< "https://VOTRE_PROJECT.supabase.co"
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production <<< "VOTRE_CLE_ANON"
vercel env add SUPABASE_SERVICE_ROLE_KEY production <<< "VOTRE_CLE_SERVICE_ROLE"
```

## 5. Déployer en production

```bash
vercel --prod
```

## 6. Après le déploiement

1. Rendez-vous sur **https://votre-projet.vercel.app/setup**
2. Créez votre compte administrateur
3. Connectez-vous et utilisez l'application

## Commandes utiles

```bash
# Déploiement preview (test)
vercel

# Déploiement production
vercel --prod

# Voir les logs
vercel logs

# Lister les variables d'environnement
vercel env ls
```

## Important : Supabase

Dans le **Dashboard Supabase** → **Authentication** → **URL Configuration**, ajoutez votre domaine Vercel dans **Redirect URLs** :

- `https://votre-projet.vercel.app/**`
- `https://votre-projet.vercel.app/login`
- `https://votre-projet.vercel.app/setup`

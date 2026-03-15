# Lead Manager

Plateforme de gestion des leads pour téléprospection - PAC, systèmes solaires, ballons électriques.

## Stack technique

- **Frontend** : Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend** : Supabase (Auth, PostgreSQL, Storage)
- **Déploiement** : Vercel

## Configuration

### 1. Variables d'environnement

Copiez `.env.example` vers `.env.local` et remplissez :

```
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role
NEXT_PUBLIC_SITE_URL=https://crm-rs-ecologie.netlify.app
# Pas de variable Vapi sur Vercel : tout est dans les Edge Functions Supabase
```

### 2. Supabase

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Exécutez la migration SQL dans `supabase/migrations/001_initial_schema.sql` via le SQL Editor de Supabase
3. Créez manuellement le bucket de stockage "documents" dans Storage (paramètres : privé)
4. Les policies de stockage sont dans la migration
5. **Réinitialisation mot de passe** : Dans Authentication > URL Configuration, ajoutez :
   - **Site URL** : `https://crm-rs-ecologie.netlify.app` (ou votre URL de production)
   - **Redirect URLs** : `https://crm-rs-ecologie.netlify.app/reset-password`

### 3. Premier lancement

1. `npm install`
2. Copiez `.env.example` vers `.env.local` et remplissez avec vos clés Supabase
3. `npm run dev`
4. Accédez à `/setup` pour créer le premier compte administrateur
5. Connectez-vous puis créez des télépros depuis Admin > Utilisateurs

> **Note** : Pour que le build Vercel réussisse, les variables d'environnement doivent être configurées dans les paramètres du projet.

## Structure

- `/` - Page d'accueil
- `/login` - Connexion
- `/forgot-password` - Mot de passe oublié (envoi du lien par email)
- `/reset-password` - Réinitialisation du mot de passe (depuis le lien email)
- `/setup` - Première configuration (création admin)
- `/telepro` - Espace télépro (dashboard, leads, téléprospection)
- `/admin` - Espace admin (dashboard, import CSV, utilisateurs, leads, documents reçus, stats)

## Import CSV

Format attendu (Meta Ads) : colonnes `first_name`, `last_name`, `phone_number`, `email` (ou variantes françaises). Détection automatique des colonnes.

## Appels NRP (agent IA Vapi)

Pour que les télépros puissent lancer des appels NRP depuis le tableau de bord (2 numéros en parallèle, transfert au premier qui décroche) :

1. **Edge Function (recommandé)** : le webhook Vapi est traité par une Edge Function Supabase pour plus de fiabilité.
   - Déployer les functions : `supabase functions deploy vapi-webhook`, `supabase functions deploy nrp-calls-start`, `supabase functions deploy vapi-setup-assistant`
   - Définir le secret Vapi : `supabase secrets set VAPI_API_KEY=votre_cle_privee_vapi`
   - Dans Vapi, vous pouvez utiliser soit l’URL de l’Edge Function directement (`https://<ref>.supabase.co/functions/v1/vapi-webhook`), soit l’URL de votre app (`https://votre-domaine.com/api/webhooks/vapi`) qui proxy vers l’Edge Function si `SUPABASE_URL` (ou `NEXT_PUBLIC_SUPABASE_URL`) est défini.
2. **Vercel** : aucune variable Vapi à ajouter. L’app utilise `NEXT_PUBLIC_SUPABASE_URL` ; le télépro appelle l’Edge Function `nrp-calls-start` pour lancer les appels.
3. **Vapi** : 3 assistants et 3 numéros Twilio (1 par télépro). Pour chaque assistant :
   - **Server URL** : `https://votre-domaine.com/api/webhooks/vapi` (proxy) ou `https://<ref>.supabase.co/functions/v1/vapi-webhook` (direct).
   - **Server Messages** : incluez `status-update`.
4. **Admin > Utilisateurs** : pour chaque télépro, configurer numéro de téléphone, ID assistant Vapi, ID numéro Vapi et message d’attente.

## Déploiement Vercel

1. Connectez le repo GitHub à Vercel
2. Ajoutez les variables d'environnement
3. Déployez

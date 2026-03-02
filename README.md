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
```

### 2. Supabase

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Exécutez la migration SQL dans `supabase/migrations/001_initial_schema.sql` via le SQL Editor de Supabase
3. Créez manuellement le bucket de stockage "documents" dans Storage (paramètres : privé)
4. Les policies de stockage sont dans la migration

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
- `/setup` - Première configuration (création admin)
- `/telepro` - Espace télépro (dashboard, leads, téléprospection)
- `/admin` - Espace admin (dashboard, import CSV, utilisateurs, leads, documents reçus, stats)

## Import CSV

Format attendu (Meta Ads) : colonnes `first_name`, `last_name`, `phone_number`, `email` (ou variantes françaises). Détection automatique des colonnes.

## Déploiement Vercel

1. Connectez le repo GitHub à Vercel
2. Ajoutez les variables d'environnement
3. Déployez

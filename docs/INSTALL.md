# Installation

## Prérequis

- Node.js 20 ou plus récent, npm
- Un projet Supabase :
  - **Local** : [Docker](https://docs.docker.com/get-docker/) + [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm install -g supabase` ou `npx supabase`)
  - **Hébergé** : un compte gratuit sur [supabase.com](https://supabase.com)
- (Optionnel) une clé API Anthropic pour activer les fonctions d'assistance IA — voir `docs/AI_FEATURES.md`

## 1. Installer les dépendances

```bash
npm install
```

## 2. Configurer Supabase

### Option A — Projet hébergé (recommandé pour démarrer rapidement)

1. Créez un projet sur [supabase.com](https://supabase.com/dashboard).
2. Dans **Project Settings → API**, notez l'URL du projet et la clé `anon public`, ainsi que la clé `service_role` (secrète).
3. Copiez `.env.example` vers `.env.local` et renseignez :

   ```bash
   cp .env.example .env.local
   ```

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...        # secret, jamais exposé au navigateur
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   AUTOMATIONS_CRON_SECRET=<générez une valeur aléatoire>
   ```

4. Appliquez les migrations. Depuis la racine du projet :

   ```bash
   npx supabase login
   npx supabase link --project-ref <votre-ref-de-projet>
   npx supabase db push
   ```

   Cela applique dans l'ordre tous les fichiers de `supabase/migrations/`.

5. (Optionnel) Peuplez une organisation de démonstration complète :

   ```bash
   npm run db:seed:demo
   ```

   Ce script crée l'organisation « Recyclage Nordique » avec des équipements, bons de travail, pièces, fournisseurs, un dossier d'analyse des causes, etc., ainsi que 10 comptes de démonstration (un par rôle) — voir la sortie du script pour les identifiants (mot de passe identique pour tous : `Demo1234!`). Il utilise l'API d'administration de Supabase Auth et nécessite donc un vrai projet Supabase (hébergé ou local via `supabase start`) — il ne fonctionne pas contre le shim de développement local décrit plus bas.

### Option B — Supabase local (nécessite Docker)

```bash
npx supabase start        # démarre Postgres + Auth + Storage + Studio en local
npx supabase db push      # applique les migrations
```

`supabase start` affiche l'URL locale et les clés à utiliser dans `.env.local` (généralement `http://127.0.0.1:54321`).

## 3. Démarrer l'application

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000). Créez un compte, puis une organisation depuis l'assistant d'accueil.

## 4. Vérifications

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run test        # Tests unitaires (Vitest)
npm run build       # Build de production
```

## Développement sans Docker ni projet Supabase (avancé)

Ce dépôt inclut un émulateur minimal des schémas `auth`/`storage` de Supabase sur un PostgreSQL local ordinaire (`db/local_dev_shim.sql`), utilisé uniquement pour exécuter les migrations SQL et les tests d'isolation RLS **directement en SQL**, sans passer par l'application Next.js ni par l'authentification réelle. Ce n'est **pas** un substitut à un vrai projet Supabase pour faire fonctionner l'application elle-même (aucune API d'authentification ni de stockage de fichiers réelle n'est fournie par ce shim).

```bash
# Nécessite un PostgreSQL 16 local, rôle superutilisateur app_dev, base "intervia"
npm run db:reset      # réinitialise et applique toutes les migrations
npm run db:test:rls   # exécute la suite de tests d'isolation multi-organisation
```

Voir le script `scripts/db-reset.sh` pour les détails (chaîne de connexion configurable via `DATABASE_URL`).

# Intervia — GMAO / CMMS industrielle

Intervia est une plateforme SaaS de gestion de maintenance assistée par ordinateur (GMAO) : équipements, bons de travail, demandes, maintenance préventive, procédures/inspections, pièces et achats, fiabilité (analyse des causes), rapports, et un mode mobile/hors ligne pour les techniciens.

Identité visuelle et code entièrement originaux — voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) pour les décisions de conception et [`docs/ROADMAP.md`](docs/ROADMAP.md) pour l'état d'avancement détaillé (fonctions terminées, limites connues, recommandations).

## Pile technologique

- **Next.js 16** (App Router) + **React 19** + **TypeScript strict**
- **Tailwind CSS v4** + composants accessibles inspirés de shadcn/ui (construits sur mesure, Radix UI)
- **Supabase** : PostgreSQL, authentification, stockage de fichiers, Row Level Security
- **react-hook-form** + **Zod** pour les formulaires et la validation
- **Vitest** (tests unitaires) et **Playwright** (tests de bout en bout)
- PWA installable avec file d'attente hors ligne (IndexedDB) pour l'exécution des bons de travail
- Couche IA optionnelle et débrayable via l'API Anthropic (Claude)

## Démarrage rapide

Voir [`docs/INSTALL.md`](docs/INSTALL.md) pour la procédure complète. En bref :

```bash
npm install
cp .env.example .env.local   # renseigner les variables Supabase
npm run dev
```

L'application nécessite un projet Supabase (hébergé ou local via `supabase start`, ce qui requiert Docker) pour fonctionner de bout en bout — voir la section « Environnement de développement de ce dépôt » ci-dessous pour le détail de ce qui a pu être vérifié sans Docker.

## Scripts utiles

| Commande | Description |
| --- | --- |
| `npm run dev` | Démarre le serveur de développement |
| `npm run build` | Build de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | Vérification TypeScript (`tsc --noEmit`) |
| `npm run test` | Tests unitaires (Vitest) |
| `npm run test:e2e` | Tests de bout en bout (Playwright) |
| `npm run db:reset` | (Dev local uniquement) réinitialise la base Postgres locale et applique toutes les migrations |
| `npm run db:test:rls` | Exécute la suite de tests d'isolation RLS multi-organisation |
| `npm run db:seed:demo` | Crée l'organisation de démonstration « Recyclage Nordique » (nécessite un vrai backend Supabase Auth) |

## Documentation

| Document | Contenu |
| --- | --- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Architecture système, décisions techniques, schéma de dossiers |
| [`docs/DATA_DICTIONARY.md`](docs/DATA_DICTIONARY.md) | Dictionnaire de données complet (tables, colonnes, politiques RLS) |
| [`docs/PERMISSIONS.md`](docs/PERMISSIONS.md) | Modèle de permissions et matrice complète par rôle |
| [`docs/INSTALL.md`](docs/INSTALL.md) | Installation et configuration locale |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Déploiement en production (Vercel + Supabase) |
| [`docs/BACKUP_RESTORE.md`](docs/BACKUP_RESTORE.md) | Sauvegarde et restauration |
| [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) | Guide d'utilisation pour les équipes de maintenance |
| [`docs/ADMIN_GUIDE.md`](docs/ADMIN_GUIDE.md) | Guide d'administration (organisation, rôles, automatisations) |
| [`docs/AI_FEATURES.md`](docs/AI_FEATURES.md) | Fonctions d'assistance IA (optionnelles) |
| [`docs/TESTING.md`](docs/TESTING.md) | Comment exécuter les suites de tests |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Fonctions terminées, limites connues, recommandations |

## Environnement de développement de ce dépôt

Ce projet a été développé dans un environnement d'exécution sans Docker et sans projet Supabase hébergé réel. Pour permettre un développement et des tests véritables malgré cette contrainte :

- Un PostgreSQL 16 local (`db/local_dev_shim.sql`) reproduit les schémas `auth`/`storage` et les fonctions `auth.uid()`/`auth.jwt()` de Supabase, afin que les migrations SQL de production (`supabase/migrations/`) s'appliquent **sans modification** et que les politiques RLS soient testées pour vrai (`db/tests/rls_isolation_test.sql`, `npm run db:test:rls`).
- Les vérifications suivantes ont été exécutées avec succès dans cet environnement : `tsc --noEmit`, `eslint`, `next build` (production, ~65 routes), les tests unitaires Vitest, et la suite d'isolation RLS.
- Ce qui **n'a pas pu être vérifié en conditions réelles** ici, faute de Docker/projet Supabase hébergé : l'authentification réelle (GoTrue), le stockage de fichiers réel, les tests de bout en bout Playwright contre une instance vivante, et le script de données de démonstration (`db:seed:demo`, qui appelle l'API d'administration Supabase Auth).
- Une fois un projet Supabase configuré (`supabase start` en local avec Docker, ou un projet hébergé), l'application est immédiatement fonctionnelle — aucun code de l'application ne dépend du shim local, qui sert uniquement aux tests SQL directs.

Voir [`docs/ROADMAP.md`](docs/ROADMAP.md) pour la liste complète et honnête de ce qui est terminé, testé, ou en attente de vérification en conditions réelles.

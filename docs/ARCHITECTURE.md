# Architecture — Intervia

## Vue d'ensemble

Intervia est une application web multi-organisation (multi-tenant) construite selon une architecture Next.js « full-stack » : les composants serveur (React Server Components) interrogent directement Supabase, les mutations passent par des Server Actions, et Postgres (via Row Level Security) constitue la seule frontière d'autorisation réellement fiable — l'interface masque ou désactive des actions selon les permissions, mais c'est toujours la base de données qui décide en dernier ressort.

```
┌─────────────────────────────────────────────────────────────┐
│                        Navigateur                            │
│  RSC (rendu serveur) + Client Components (interactivité)     │
│  Service worker (PWA) + file d'attente hors ligne (IndexedDB)│
└───────────────┬───────────────────────────────┬─────────────┘
                │ HTML/RSC                       │ appels directs
                ▼                                ▼ (lecture/écriture)
┌─────────────────────────────┐    ┌─────────────────────────────┐
│   Next.js (App Router)      │    │   Supabase                  │
│   - Server Components       │───▶│   - PostgreSQL + RLS        │
│   - Server Actions          │    │   - Auth (GoTrue)           │
│   - Route Handlers (/api)   │    │   - Storage (fichiers)      │
└─────────────────────────────┘    └─────────────────────────────┘
```

## Pourquoi ces choix

- **Next.js App Router + Server Components** : évite une couche d'API REST/GraphQL intermédiaire pour le cas courant (afficher des données scoping-org) — un composant serveur interroge Supabase directement avec la session de l'utilisateur, RLS filtre automatiquement. Les Server Actions remplacent les endpoints d'API pour les mutations simples, avec validation Zod côté serveur systématique.
- **Supabase plutôt qu'un backend sur mesure** : Postgres + RLS donne une frontière de sécurité multi-tenant vérifiable indépendamment du code applicatif (voir plus bas), l'authentification et le stockage de fichiers sont fournis clé en main, et le modèle reste un simple Postgres standard (portable, pas de verrou propriétaire fort).
- **TypeScript strict partout**, y compris les types générés à partir du schéma (`src/types/database.ts`) pour que les requêtes Supabase soient vérifiées à la compilation.
- **shadcn-style, pas shadcn/ui tel quel** : les composants d'interface (`src/components/ui/`) suivent les conventions du projet shadcn/ui (Radix UI + `class-variance-authority` + Tailwind) mais ont été écrits à la main pour ce projet, avec la palette de jetons de conception propre à Intervia — aucun fichier ni identité visuelle copié d'un concurrent.

## Multi-tenance et sécurité (le point le plus important)

Chaque table métier porte une colonne `org_id`. Deux fonctions Postgres (`app.is_member_of(org_id)`, `app.has_permission(org_id, 'module.action')`, schéma `app`, `SECURITY DEFINER`) sont les deux seules primitives dont dépendent presque toutes les politiques RLS — voir `docs/DATA_DICTIONARY.md` pour le détail table par table et `docs/PERMISSIONS.md` pour la matrice de permissions complète.

Conséquence pratique : un Server Action peut recevoir un `orgId` fourni par le client (pour la commodité du code — `revalidatePath`, valeurs à insérer) sans jamais avoir besoin de le revérifier lui-même, parce qu'une tentative de lecture/écriture sur une organisation à laquelle l'utilisateur n'appartient pas est rejetée par Postgres, quoi que prétende l'appelant. C'est exactement ce que vérifie `db/tests/rls_isolation_test.sql` : un utilisateur de l'organisation B ne peut ni lire, ni modifier, ni insérer dans les données de l'organisation A, même en forgeant directement l'appel.

Le rôle `service_role` (bypass RLS complet) n'est utilisé qu'à un seul endroit légitime : le moteur d'automatisations et la génération planifiée des bons de travail préventifs (`src/lib/supabase/admin.ts`, `src/lib/automations/evaluate.ts`, `src/app/api/automations/run/route.ts`), qui doivent agir au nom du système plutôt que d'un utilisateur précis. Cette route est protégée par un secret partagé (`AUTOMATIONS_CRON_SECRET`), jamais exposé au navigateur.

## Structure des dossiers

```
src/
  app/
    (auth)/                 Connexion, inscription, mots de passe (mise en page dédiée)
    auth/callback/          Échange du code d'authentification Supabase
    invite/[token]/         Acceptation d'invitation à une organisation
    scan/[code]/            Résolveur de code QR/code-barres (redirige vers la bonne fiche)
    onboarding/             Création ou sélection d'organisation
    o/[orgSlug]/            Toutes les pages internes, scoping par organisation (slug dans l'URL)
      dashboard, my-work, work-orders, requests, procedures, pm-plans, meters,
      equipment, locations, parts, suppliers, purchasing, rca, reports,
      calendar, automations, users, settings, notifications, audit-log, scan
    api/automations/run/    Endpoint planifié (cron) pour générer les bons préventifs
  components/
    ui/                     Composants d'interface génériques (style shadcn/ui, faits maison)
    layout/                 Barre latérale, barre supérieure, navigation mobile
    auth/, offline/, pwa/   Composants spécifiques
  lib/
    supabase/               Clients Supabase (navigateur, serveur, admin) + middleware de session
    actions/                Server Actions, un fichier par domaine métier
    validation/             Schémas Zod, un fichier par domaine métier
    data/                   Fonctions de lecture de données complexes (rapports, contexte d'organisation)
    ai/                     Couche d'assistance IA (interface + fournisseur Anthropic + fournisseur neutre)
    offline/                File d'attente hors ligne (IndexedDB) pour l'exécution des bons de travail
    automations/, pm/       Moteur de règles et calcul des échéances préventives
  i18n/                     Configuration next-intl (locale par cookie, pas par préfixe d'URL)
  types/                    Types générés depuis le schéma Supabase + alias pratiques
supabase/migrations/        Schéma SQL complet, source de vérité — voir docs/DATA_DICTIONARY.md
db/
  local_dev_shim.sql        Émulation locale des schémas auth/storage (développement sans Docker)
  tests/                    Tests SQL directs (isolation RLS)
  seed/                     Script de données de démonstration
e2e/                        Tests de bout en bout Playwright
```

## Modèle d'organisation et de routage

Les URLs internes sont scoping par organisation via son *slug* (`/o/acme-corp/work-orders`), pas par sous-domaine ni par un identifiant caché en session — cela permet à un utilisateur appartenant à plusieurs organisations d'avoir plusieurs onglets ouverts sur des organisations différentes sans conflit, et rend chaque lien partageable sans ambiguïté. Le layout `src/app/o/[orgSlug]/layout.tsx` résout l'organisation, vérifie l'appartenance active de l'utilisateur (`requireOrgAccess`, défense en profondeur en plus de RLS) et fournit le contexte (rôle, permissions effectives) au reste de l'arbre via `OrgProvider`/`useOrg()`/`usePermission()`.

## Internationalisation

L'application est bilingue français/anglais, mais la langue est un **préférence par utilisateur** (cookie `intervia-locale`, réglable dans Paramètres → Profil), pas un segment d'URL — un choix délibéré pour une application B2B authentifiée où chaque utilisateur choisit sa langue une fois, plutôt que de dupliquer chaque lien interne sous `/fr/...` et `/en/...`. Le vocabulaire de navigation fixe passe par `next-intl` (`messages/fr.json`, `messages/en.json`) ; le contenu spécifique à chaque page est actuellement rédigé directement en français dans les composants (voir `docs/ROADMAP.md` pour l'état de la traduction anglaise des pages).

## Ce que l'IA fait et ne fait pas dans cette architecture

La couche IA (`src/lib/ai/`) est un fournisseur interchangeable : `NoopAiProvider` (par défaut, si `ANTHROPIC_API_KEY` est absente) ou `AnthropicAiProvider`. Aucune fonctionnalité cœur de métier n'en dépend — chaque appel est une action explicite de l'utilisateur (bouton « Suggérer », « Résumer », etc.), le résultat est toujours présenté comme une suggestion à valider, jamais appliqué automatiquement à une donnée. Voir `docs/AI_FEATURES.md`.

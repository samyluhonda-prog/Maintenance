# Déploiement en production

## Architecture de déploiement recommandée

- **Application** : [Vercel](https://vercel.com) (adapté nativement à Next.js App Router — Server Actions, streaming, revalidation) ou toute plateforme supportant Next.js en mode serveur (Node.js ≥ 20).
- **Base de données, authentification, stockage** : un projet Supabase hébergé (production séparée du projet de développement/test).

## 1. Préparer le projet Supabase de production

1. Créez un nouveau projet Supabase dédié à la production (ne réutilisez jamais le projet de développement).
2. Appliquez les migrations : `npx supabase link --project-ref <ref-prod> && npx supabase db push`.
3. Dans **Authentication → URL Configuration**, définissez l'URL du site de production et les URLs de redirection autorisées (`https://votre-domaine.com/auth/callback`).
4. Dans **Authentication → Email Templates**, personnalisez les courriels de confirmation/réinitialisation si désiré.
5. Vérifiez dans **Authentication → Policies** que la confirmation d'adresse courriel est activée (comportement par défaut) pour éviter la création de comptes avec des adresses non vérifiées.
6. Ne peuplez **pas** l'organisation de démonstration (`db:seed:demo`) sur le projet de production.

## 2. Variables d'environnement

Configurez, sur la plateforme d'hébergement, les mêmes variables que `.env.example` avec les valeurs du projet Supabase de production :

| Variable | Portée |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Publique |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publique |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secrète** — jamais dans un bundle client |
| `NEXT_PUBLIC_SITE_URL` | Publique — doit correspondre au domaine réel |
| `AUTOMATIONS_CRON_SECRET` | **Secrète** — générez une valeur aléatoire longue (`openssl rand -hex 32`) |
| `ANTHROPIC_API_KEY` | **Secrète**, optionnelle — active les fonctions IA |

## 3. Déployer l'application

Sur Vercel : importez le dépôt Git, renseignez les variables d'environnement ci-dessus dans les paramètres du projet, déployez. Le build (`next build`) exécute automatiquement la vérification TypeScript.

## 4. Planifier la génération des bons de travail préventifs

L'endpoint `POST /api/automations/run` génère les bons de travail dus (déclencheurs calendaires et sur compteurs) et n'est **jamais** appelé automatiquement par l'application — il doit être déclenché par un ordonnanceur externe, par exemple :

- **Vercel Cron** : ajoutez un fichier `vercel.json` avec une entrée `crons` pointant vers cet endpoint (fréquence recommandée : toutes les heures), et transmettez le secret via l'en-tête `x-automations-secret` (Vercel Cron ne permet pas nativement d'en-têtes personnalisés sur l'appel planifié lui-même — une solution courante est une petite route intermédiaire qui lit le secret depuis une variable d'environnement serveur et relaie l'appel, ou l'utilisation d'un service de cron externe comme décrit ci-dessous).
- **Un service de cron externe** (cron-job.org, GitHub Actions avec `schedule`, etc.) effectuant un `POST` avec l'en-tête `x-automations-secret: <AUTOMATIONS_CRON_SECRET>`.

Sans cet ordonnanceur, les plans de maintenance préventive restent fonctionnels pour la saisie manuelle mais ne généreront pas automatiquement de nouveaux bons de travail à échéance — un administrateur peut toujours déclencher l'évaluation manuellement via le bouton **Vérifier maintenant** de la page des plans de maintenance.

## 5. Domaine et certificats

Configurez un domaine personnalisé sur la plateforme d'hébergement (TLS géré automatiquement par la plupart des plateformes, dont Vercel). Mettez à jour `NEXT_PUBLIC_SITE_URL` et la configuration des URLs autorisées côté Supabase en conséquence.

## 6. Après le déploiement

- Créez le premier compte administrateur réel et sa première organisation via l'interface (`/signup` → assistant d'accueil).
- Vérifiez le bon fonctionnement de bout en bout : connexion, création d'un équipement, génération de son code QR, soumission d'une demande, conversion en bon de travail.
- Voir `docs/BACKUP_RESTORE.md` pour la mise en place des sauvegardes.

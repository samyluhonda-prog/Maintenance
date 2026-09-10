# Sauvegarde et restauration

## Ce qui doit être sauvegardé

1. **Base de données Postgres** (toutes les données métier : organisations, équipements, bons de travail, etc.)
2. **Fichiers de stockage Supabase** (photos, manuels, signatures, documents joints) — buckets `equipment-media`, `documents`, `avatars`, `signatures`, `request-media`, `work-order-media`
3. **Code et migrations** — déjà versionnés dans ce dépôt Git ; ce n'est pas une « sauvegarde » au sens opérationnel mais la restauration du schéma en dépend entièrement.

## Projet Supabase hébergé

Supabase effectue des sauvegardes automatiques quotidiennes de la base de données sur les plans payants (rétention selon le plan — voir **Database → Backups** dans le tableau de bord Supabase). Sur le plan gratuit, aucune sauvegarde automatique n'est garantie : pour un usage en production, un plan payant avec sauvegardes est requis, ou une exportation manuelle régulière (ci-dessous).

### Sauvegarde manuelle de la base de données

```bash
# Exporte la totalité du schéma et des données
npx supabase db dump --db-url "postgresql://postgres:<mot-de-passe>@<host>:5432/postgres" -f backup-$(date +%Y%m%d).sql
```

Conservez ces exports chiffrés, hors du dépôt Git, avec une rotation (par exemple : quotidienne pendant 7 jours, hebdomadaire pendant un mois, mensuelle pendant un an).

### Sauvegarde des fichiers de stockage

Le tableau de bord Supabase (**Storage**) permet de lister/télécharger les objets par bucket. Pour une sauvegarde automatisée, un script utilisant le SDK Supabase avec la clé `service_role` peut lister et télécharger périodiquement tous les objets de chaque bucket vers un stockage externe (S3, etc.) — non fourni dans ce dépôt à ce stade (voir `docs/ROADMAP.md`).

### Restauration

```bash
# Restaure un export SQL vers un projet Supabase (idéalement un nouveau projet vide)
psql "postgresql://postgres:<mot-de-passe>@<host>:5432/postgres" -f backup-20260101.sql
```

Restaurez toujours vers un projet neuf ou une base clairement isolée, jamais directement par-dessus une base de production active, pour éviter d'écraser des données plus récentes que la sauvegarde en cas d'erreur.

## Environnement de développement local (shim sans Docker)

Le PostgreSQL local utilisé pour les tests RLS dans ce dépôt (`db/local_dev_shim.sql`) ne contient aucune donnée de production — il est entièrement reconstruit à la demande via `npm run db:reset`. Aucune sauvegarde n'est nécessaire pour cet environnement ; il est jetable par conception.

## Recommandations avant mise en production

- Activez un plan Supabase avec sauvegardes automatiques et vérifiez la fenêtre de restauration (« point-in-time recovery » si disponible sur votre plan).
- Testez la procédure de restauration au moins une fois avant d'en dépendre en situation réelle (restaurez vers un projet de test, vérifiez l'intégrité des données et le bon fonctionnement de l'application pointée dessus).
- Documentez et communiquez à l'équipe le délai de récupération visé (RTO) et la perte de données maximale acceptable (RPO) selon le plan Supabase choisi.

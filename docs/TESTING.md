# Tests

## Résumé

| Suite | Outil | Statut dans cet environnement de développement |
| --- | --- | --- |
| Isolation multi-organisation (RLS) | SQL direct via `psql` | ✅ Exécutée et passante (13 assertions) |
| Unitaires (schémas de validation, logique pure) | Vitest | ✅ Exécutée et passante |
| Bout en bout (13 parcours utilisateurs complets) | Playwright | ⚠️ Écrite (14 tests, `npx playwright test --list` valide), non exécutable ici (aucun projet Supabase/Docker disponible dans ce bac à sable) |

## Tests d'isolation RLS

```bash
npm run db:reset       # applique le schéma complet sur le Postgres local
npm run db:test:rls    # exécute db/tests/rls_isolation_test.sql
```

Ce test crée deux organisations et plusieurs utilisateurs avec des rôles différents, puis vérifie, en se faisant réellement passer pour chaque utilisateur au niveau de la session Postgres (comme le fait PostgREST en production), que :

- un membre d'une organisation ne peut ni lire, ni modifier, ni insérer de données dans une autre organisation ;
- les permissions par rôle sont bien appliquées (un technicien sans la permission de création d'équipement est bloqué) ;
- un bon de travail assigné à quelqu'un sans permission générale de consultation lui reste visible, mais aucun autre bon de travail ;
- l'appartenance à plusieurs organisations fonctionne sans fuite de données entre elles.

## Tests unitaires

```bash
npm run test
```

Couvre la logique pure : schémas de validation Zod (cas valides et invalides, coercition numérique), logique de score et de visibilité conditionnelle des procédures, calcul des prochaines échéances de maintenance préventive, utilitaires (génération de codes courts, fusion de classes CSS). Ces tests ne nécessitent aucune base de données ni service externe.

## Tests de bout en bout (Playwright)

```bash
npm run test:e2e
```

Nécessite une instance de l'application connectée à un vrai projet Supabase (local via `supabase start`, ou hébergé) — voir `docs/INSTALL.md`. 13 fichiers de scénarios (14 tests) couvrent les parcours obligatoires du cahier des charges : inscription et création d'organisation, création d'un équipement et de son code QR avec scan-to-open, soumission/approbation/conversion d'une demande, cycle de vie complet d'un bon de travail, exécution d'une procédure avec signalement de non-conformité, création d'un plan préventif, relevé de compteur, déduction automatique de l'inventaire, bon de commande avec réception partielle, calendrier, tableaux de bord avec export CSV, gestion d'équipe et permissions — et, le plus important, `13-cross-org-isolation.spec.ts` : l'isolation entre organisations testée depuis l'interface elle-même (deux organisations réelles, deux comptes réels, vérification qu'aucun des deux ne peut ouvrir une URL de l'autre), en complément du test SQL direct ci-dessus.

Voir `e2e/README.md` pour le détail de chaque scénario, les comptes de test utilisés (issus de `db/seed/seed-demo-org.ts`), les limites connues (glisser-déposer du calendrier non simulé, génération PM non déclenchable dans le même test) et la procédure exacte pour les exécuter une fois un environnement Supabase réel disponible. `npx playwright test --list` a été exécuté dans ce bac à sable et confirme que les 14 tests sont syntaxiquement valides et correctement collectés par Playwright.

## Pourquoi certains tests n'ont pas pu être exécutés ici

Cet environnement de développement ne dispose ni de Docker ni d'un projet Supabase hébergé accessible (voir la section correspondante du `README.md`). Les tests de bout en bout et le script de données de démonstration appellent tous deux de vraies API Supabase (authentification, stockage) qui n'existent pas dans cet environnement — ils ont été écrits avec soin contre le code réel des pages (routes, labels et sélecteurs vérifiés dans le code source, pas devinés) et relus, et leur structure a été validée (`npx playwright test --list`), mais leur exécution effective doit être validée par la personne qui déploiera l'application dans un environnement complet.

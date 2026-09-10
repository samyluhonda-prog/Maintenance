# Tests de bout en bout (Playwright)

Ces tests pilotent un vrai navigateur contre l'application réelle, connectée
à un vrai projet Supabase — aucune donnée n'est simulée ni contournée par
un accès direct à la base de données.

## Prérequis

1. Un projet Supabase fonctionnel (local via `supabase start`, ou hébergé),
   avec le schéma appliqué (`supabase db push`) — voir `docs/INSTALL.md`.
2. La confirmation d'adresse courriel automatique activée pour les
   nouveaux comptes (paramètre par défaut de `supabase start` en local).
   Contre un projet hébergé qui exige une confirmation par courriel, les
   scénarios `01-onboarding` et `13-cross-org-isolation` doivent d'abord
   récupérer le lien de confirmation (p. ex. via Inbucket/Mailpit) avant
   de poursuivre.
3. Les données de démonstration seedées : `npm run db:seed:demo` (voir
   `db/seed/seed-demo-org.ts` — organisation `recyclage-nordique`, mot de
   passe unique `Demo1234!` pour tous les comptes, voir `fixtures.ts`).
4. Variables d'environnement Supabase dans `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

## Exécution

```bash
npm run build && npm run start   # ou laissez Playwright le faire (voir playwright.config.ts)
npm run test:e2e
```

Par défaut, `playwright.config.ts` démarre lui-même `next build && next
start` sur `http://localhost:3000`. Contre un déploiement déjà démarré
ailleurs, pointez `PLAYWRIGHT_BASE_URL` vers son URL.

## Scénarios couverts

| Fichier | Parcours |
| --- | --- |
| `01-onboarding.spec.ts` | Inscription, confirmation, création d'organisation |
| `02-equipment-qr.spec.ts` | Création d'équipement, code QR, scan-to-open |
| `03-request-workflow.spec.ts` | Demande → approbation → conversion en bon de travail |
| `04-work-order-lifecycle.spec.ts` | Cycle de vie complet d'un bon de travail (statuts, tâches, commentaires, clôture) |
| `05-procedure-execution.spec.ts` | Exécution d'une procédure/inspection avec signalement de non-conformité |
| `06-pm-plan.spec.ts` | Création d'un plan préventif et d'un déclencheur, vérification manuelle |
| `07-meter-reading.spec.ts` | Relevé de compteur et historique |
| `08-parts-deduction.spec.ts` | Déduction automatique de l'inventaire à l'utilisation sur un bon de travail |
| `09-purchasing.spec.ts` | Bon de commande complet, approbation, réception partielle |
| `10-calendar.spec.ts` | Calendrier de planification, navigation, ouverture d'un bon de travail |
| `11-reports.spec.ts` | Tableaux de bord, filtres de date, export CSV |
| `12-team-and-permissions.spec.ts` | Invitation d'un membre, application des permissions (rôle Auditeur) |
| `13-cross-org-isolation.spec.ts` | **Isolation multi-organisation testée depuis l'interface** — le scénario le plus important |

Ce test `13-cross-org-isolation.spec.ts` est le complément, au niveau de
l'application, du test SQL `db/tests/rls_isolation_test.sql` : celui-ci
vérifie que les politiques RLS elles-mêmes empêchent toute fuite au niveau
de la base de données (avec une couverture plus exhaustive des rôles et
permissions) ; celui-là vérifie que la couche de routage Next.js
(`requireOrgAccess`) ne laisse fuiter aucune information — un
enregistrement d'une autre organisation renvoie une 404 identique à un
enregistrement inexistant, jamais une erreur distincte qui révélerait son
existence.

## Limites connues

- Le glisser-déposer HTML5 du calendrier (réordonnancement des bons de
  travail) n'est pas simulé par `10-calendar.spec.ts` — Playwright ne peut
  pas fiablement reproduire les événements `dragstart`/`dragover`/`drop`
  natifs du navigateur comme un vrai geste utilisateur ; ce test vérifie
  le rendu et la navigation du calendrier à la place.
- `06-pm-plan.spec.ts` ne peut pas déclencher une génération réelle de bon
  de travail préventif dans le même test : `upsertPmTriggerAction`
  positionne délibérément la première échéance d'un déclencheur
  fraîchement créé un intervalle complet plus tard (jamais immédiatement
  due), pour éviter qu'un plan ne génère une rafale de bons de travail dès
  son enregistrement. Le test vérifie donc la création du plan/déclencheur
  et l'exécution de la vérification manuelle, mais pas la génération
  elle-même.
- Ces tests n'ont jamais été exécutés dans l'environnement de
  développement de ce dépôt (aucun Docker ni projet Supabase hébergé
  disponible ici — voir la section correspondante du `README.md` à la
  racine). Ils ont été écrits avec soin contre le code réel des pages
  (labels, routes, sélecteurs vérifiés dans le code source), mais leur
  exécution effective doit être validée par la première personne qui
  disposera d'un environnement Supabase complet.

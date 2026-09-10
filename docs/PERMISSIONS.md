# Modèle de permissions — Intervia CMMS

> Référence pour un administrateur configurant les rôles d'une organisation. Généré à partir des migrations SQL finalisées `supabase/migrations/0001` à `0015` — en particulier `0002_organizations_and_roles.sql` (catalogue et grants) et les policies RLS des migrations 0004 à 0013 (accès élargis au-delà de la matrice).

## 1. Comment fonctionne le modèle

Le contrôle d'accès d'Intervia repose sur quatre tables et deux fonctions :

- **`permissions`** — un catalogue figé de permissions unitaires, chacune identifiée par une clé `module.action` (ex. `equipment.edit`). Le catalogue compte **120 permissions** (15 modules × 8 actions), voir section 2.
- **`roles`** — les rôles auxquels ces permissions peuvent être accordées. Intervia seed **9 rôles système** (`org_id` = `null`, partagés par toutes les organisations, non modifiables via l'API) :
  Owner, Admin, Gestionnaire de maintenance (Maintenance Manager), Planificateur (Planner), Superviseur (Supervisor), Technicien (Technician), Employé demandeur (Requester), Fournisseur/Entrepreneur externe (Vendor/Contractor), Lecteur/Auditeur (Viewer/Auditor).
  Une organisation peut aussi définir des **rôles personnalisés** (`org_id` renseigné) — voir section 5.
- **`role_permissions`** — table d'association qui accorde des permissions à un rôle. C'est cette table, seedée dans `0002_organizations_and_roles.sql`, qui détermine la matrice de la section 3.
- **`memberships`** — associe un utilisateur à **un rôle dans un org donné**. Un même utilisateur peut détenir des adhésions distinctes (donc des rôles différents) dans plusieurs organisations : ses droits sont toujours évalués **par org**, jamais globalement.

Deux fonctions SQL (`app.is_member_of`, `app.has_permission`, schéma `app`, `SECURITY DEFINER`) sont les primitives que presque toutes les policies RLS composent pour vérifier respectivement l'appartenance à l'org et la détention d'une permission précise — voir `docs/DATA_DICTIONARY.md` pour le détail technique.

**Owner et Admin reçoivent implicitement les 120 permissions**, accordées explicitement dans le seed via un `cross join` (`role_permissions` contient une ligne pour chacune des 120 permissions, pour chacun de ces deux rôles) plutôt que par une règle de contournement dans le code — ce sont donc de vraies lignes en base, comme pour tout autre rôle.

## 2. Le catalogue : 15 modules × 8 actions = 120 permissions

**Modules** (issus de l'`unnest(array[...])` dans `0002_organizations_and_roles.sql`) :

1. `equipment` — Équipements
2. `locations` — Emplacements / installations
3. `requests` — Demandes d'intervention
4. `work_orders` — Bons de travail
5. `procedures` — Procédures / checklists
6. `pm_plans` — Plans de maintenance préventive
7. `meters` — Compteurs
8. `parts` — Pièces / inventaire
9. `purchasing` — Achats (bons de commande)
10. `suppliers` — Fournisseurs
11. `reports` — Rapports
12. `automations` — Automatisations
13. `users` — Utilisateurs / membres
14. `settings` — Paramètres de l'organisation
15. `rca` — Analyse de cause racine (fiabilité)

**Actions** (mêmes migrations, et contrainte `CHECK` sur `permissions.action`) :

`view` (consulter), `create` (créer), `edit` (modifier), `approve` (approuver), `close` (clôturer), `export` (exporter), `admin` (administrer), `delete` (supprimer).

Chaque combinaison module × action forme une clé de permission, ex. `purchasing.approve`, `rca.edit`, `settings.admin` — soit 15 × 8 = **120 clés** au total.

## 3. Matrice des permissions par rôle

La matrice ci-dessous est dérivée **exactement** des instructions `insert into public.role_permissions` de `0002_organizations_and_roles.sql` (recoupement ligne par ligne des `p.key in (...)` de chaque rôle). ✔ = permission accordée, — = non accordée.

- **Owner** et **Admin** : ✔ sur les 120 lignes (cross join explicite avec l'ensemble du catalogue).
- **Viewer/Auditeur** : ✔ sur toute permission dont l'action est `view` (une par module, 15 au total), — partout ailleurs.
- Les autres rôles reçoivent le sous-ensemble explicitement listé dans le seed (voir décompte de contrôle en section 3bis).

| Permission | Owner | Admin | Maint. Manager | Planner | Supervisor | Technician | Requester | Vendor | Viewer |
|---|---|---|---|---|---|---|---|---|---|
| equipment.view | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — | ✔ |
| equipment.create | ✔ | ✔ | ✔ | — | — | — | — | — | — |
| equipment.edit | ✔ | ✔ | ✔ | — | — | — | — | — | — |
| equipment.approve | ✔ | ✔ | — | — | — | — | — | — | — |
| equipment.close | ✔ | ✔ | — | — | — | — | — | — | — |
| equipment.export | ✔ | ✔ | ✔ | — | — | — | — | — | — |
| equipment.admin | ✔ | ✔ | — | — | — | — | — | — | — |
| equipment.delete | ✔ | ✔ | — | — | — | — | — | — | — |
| locations.view | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — | — | ✔ |
| locations.create | ✔ | ✔ | ✔ | — | — | — | — | — | — |
| locations.edit | ✔ | ✔ | ✔ | — | — | — | — | — | — |
| locations.approve | ✔ | ✔ | — | — | — | — | — | — | — |
| locations.close | ✔ | ✔ | — | — | — | — | — | — | — |
| locations.export | ✔ | ✔ | — | — | — | — | — | — | — |
| locations.admin | ✔ | ✔ | — | — | — | — | — | — | — |
| locations.delete | ✔ | ✔ | — | — | — | — | — | — | — |
| requests.view | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — | ✔ |
| requests.create | ✔ | ✔ | ✔ | — | — | ✔ | ✔ | — | — |
| requests.edit | ✔ | ✔ | ✔ | ✔ | ✔ | — | — | — | — |
| requests.approve | ✔ | ✔ | ✔ | ✔ | ✔ | — | — | — | — |
| requests.close | ✔ | ✔ | — | — | — | — | — | — | — |
| requests.export | ✔ | ✔ | — | — | — | — | — | — | — |
| requests.admin | ✔ | ✔ | — | — | — | — | — | — | — |
| requests.delete | ✔ | ✔ | — | — | — | — | — | — | — |
| work_orders.view | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — | ✔ | ✔ |
| work_orders.create | ✔ | ✔ | ✔ | ✔ | ✔ | — | — | — | — |
| work_orders.edit | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — | ✔ | — |
| work_orders.approve | ✔ | ✔ | ✔ | — | — | — | — | — | — |
| work_orders.close | ✔ | ✔ | ✔ | — | ✔ | — | — | — | — |
| work_orders.export | ✔ | ✔ | ✔ | ✔ | ✔ | — | — | — | — |
| work_orders.admin | ✔ | ✔ | — | — | — | — | — | — | — |
| work_orders.delete | ✔ | ✔ | — | — | — | — | — | — | — |
| procedures.view | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — | — | ✔ |
| procedures.create | ✔ | ✔ | ✔ | ✔ | ✔ | — | — | — | — |
| procedures.edit | ✔ | ✔ | ✔ | ✔ | — | — | — | — | — |
| procedures.approve | ✔ | ✔ | — | — | — | — | — | — | — |
| procedures.close | ✔ | ✔ | — | — | — | — | — | — | — |
| procedures.export | ✔ | ✔ | — | — | — | — | — | — | — |
| procedures.admin | ✔ | ✔ | — | — | — | — | — | — | — |
| procedures.delete | ✔ | ✔ | — | — | — | — | — | — | — |
| pm_plans.view | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — | — | ✔ |
| pm_plans.create | ✔ | ✔ | ✔ | ✔ | — | — | — | — | — |
| pm_plans.edit | ✔ | ✔ | ✔ | ✔ | — | — | — | — | — |
| pm_plans.approve | ✔ | ✔ | — | — | — | — | — | — | — |
| pm_plans.close | ✔ | ✔ | — | — | — | — | — | — | — |
| pm_plans.export | ✔ | ✔ | — | — | — | — | — | — | — |
| pm_plans.admin | ✔ | ✔ | — | — | — | — | — | — | — |
| pm_plans.delete | ✔ | ✔ | — | — | — | — | — | — | — |
| meters.view | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — | — | ✔ |
| meters.create | ✔ | ✔ | ✔ | — | — | ✔ | — | — | — |
| meters.edit | ✔ | ✔ | ✔ | ✔ | ✔ | — | — | — | — |
| meters.approve | ✔ | ✔ | — | — | — | — | — | — | — |
| meters.close | ✔ | ✔ | — | — | — | — | — | — | — |
| meters.export | ✔ | ✔ | — | — | — | — | — | — | — |
| meters.admin | ✔ | ✔ | — | — | — | — | — | — | — |
| meters.delete | ✔ | ✔ | — | — | — | — | — | — | — |
| parts.view | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — | — | ✔ |
| parts.create | ✔ | ✔ | ✔ | — | — | — | — | — | — |
| parts.edit | ✔ | ✔ | ✔ | — | ✔ | ✔ | — | — | — |
| parts.approve | ✔ | ✔ | — | — | — | — | — | — | — |
| parts.close | ✔ | ✔ | — | — | — | — | — | — | — |
| parts.export | ✔ | ✔ | ✔ | — | — | — | — | — | — |
| parts.admin | ✔ | ✔ | — | — | — | — | — | — | — |
| parts.delete | ✔ | ✔ | — | — | — | — | — | — | — |
| purchasing.view | ✔ | ✔ | ✔ | ✔ | ✔ | — | — | ✔ | ✔ |
| purchasing.create | ✔ | ✔ | ✔ | ✔ | — | — | — | — | — |
| purchasing.edit | ✔ | ✔ | ✔ | — | — | — | — | — | — |
| purchasing.approve | ✔ | ✔ | ✔ | — | — | — | — | — | — |
| purchasing.close | ✔ | ✔ | — | — | — | — | — | — | — |
| purchasing.export | ✔ | ✔ | — | — | — | — | — | — | — |
| purchasing.admin | ✔ | ✔ | — | — | — | — | — | — | — |
| purchasing.delete | ✔ | ✔ | — | — | — | — | — | — | — |
| suppliers.view | ✔ | ✔ | ✔ | ✔ | ✔ | — | — | — | ✔ |
| suppliers.create | ✔ | ✔ | ✔ | — | — | — | — | — | — |
| suppliers.edit | ✔ | ✔ | ✔ | — | — | — | — | — | — |
| suppliers.approve | ✔ | ✔ | — | — | — | — | — | — | — |
| suppliers.close | ✔ | ✔ | — | — | — | — | — | — | — |
| suppliers.export | ✔ | ✔ | — | — | — | — | — | — | — |
| suppliers.admin | ✔ | ✔ | — | — | — | — | — | — | — |
| suppliers.delete | ✔ | ✔ | — | — | — | — | — | — | — |
| reports.view | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — | — | ✔ |
| reports.create | ✔ | ✔ | — | — | — | — | — | — | — |
| reports.edit | ✔ | ✔ | — | — | — | — | — | — | — |
| reports.approve | ✔ | ✔ | — | — | — | — | — | — | — |
| reports.close | ✔ | ✔ | — | — | — | — | — | — | — |
| reports.export | ✔ | ✔ | ✔ | — | ✔ | — | — | — | — |
| reports.admin | ✔ | ✔ | — | — | — | — | — | — | — |
| reports.delete | ✔ | ✔ | — | — | — | — | — | — | — |
| automations.view | ✔ | ✔ | ✔ | — | — | — | — | — | ✔ |
| automations.create | ✔ | ✔ | ✔ | — | — | — | — | — | — |
| automations.edit | ✔ | ✔ | ✔ | — | — | — | — | — | — |
| automations.approve | ✔ | ✔ | — | — | — | — | — | — | — |
| automations.close | ✔ | ✔ | — | — | — | — | — | — | — |
| automations.export | ✔ | ✔ | — | — | — | — | — | — | — |
| automations.admin | ✔ | ✔ | — | — | — | — | — | — | — |
| automations.delete | ✔ | ✔ | — | — | — | — | — | — | — |
| users.view | ✔ | ✔ | ✔ | — | ✔ | — | — | — | ✔ |
| users.create | ✔ | ✔ | — | — | — | — | — | — | — |
| users.edit | ✔ | ✔ | — | — | — | — | — | — | — |
| users.approve | ✔ | ✔ | — | — | — | — | — | — | — |
| users.close | ✔ | ✔ | — | — | — | — | — | — | — |
| users.export | ✔ | ✔ | — | — | — | — | — | — | — |
| users.admin | ✔ | ✔ | — | — | — | — | — | — | — |
| users.delete | ✔ | ✔ | — | — | — | — | — | — | — |
| settings.view | ✔ | ✔ | — | — | — | — | — | — | ✔ |
| settings.create | ✔ | ✔ | — | — | — | — | — | — | — |
| settings.edit | ✔ | ✔ | — | — | — | — | — | — | — |
| settings.approve | ✔ | ✔ | — | — | — | — | — | — | — |
| settings.close | ✔ | ✔ | — | — | — | — | — | — | — |
| settings.export | ✔ | ✔ | — | — | — | — | — | — | — |
| settings.admin | ✔ | ✔ | — | — | — | — | — | — | — |
| settings.delete | ✔ | ✔ | — | — | — | — | — | — | — |
| rca.view | ✔ | ✔ | ✔ | — | ✔ | — | — | — | ✔ |
| rca.create | ✔ | ✔ | ✔ | — | ✔ | — | — | — | — |
| rca.edit | ✔ | ✔ | ✔ | — | ✔ | — | — | — | — |
| rca.approve | ✔ | ✔ | — | — | — | — | — | — | — |
| rca.close | ✔ | ✔ | — | — | — | — | — | — | — |
| rca.export | ✔ | ✔ | — | — | — | — | — | — | — |
| rca.admin | ✔ | ✔ | — | — | — | — | — | — | — |
| rca.delete | ✔ | ✔ | — | — | — | — | — | — | — |

### 3bis. Contrôle de cohérence

- **120 lignes** de permissions (15 modules × 8 actions) × **9 colonnes** de rôles = **1080 cellules**, toutes renseignées (✔ ou —) ci-dessus.
- Nombre de ✔ par rôle, recompté directement depuis les clauses `p.key in (...)` du seed :

| Rôle | Nombre de permissions accordées |
|---|---|
| Owner | 120 / 120 (toutes, via cross join) |
| Admin | 120 / 120 (toutes, via cross join) |
| Gestionnaire de maintenance | 46 |
| Planificateur | 22 |
| Superviseur | 25 |
| Technicien | 13 |
| Employé demandeur | 3 |
| Fournisseur / Entrepreneur externe | 3 |
| Lecteur / Auditeur | 15 (une par module, toutes actions `view`) |

Ces décomptes ont été vérifiés par extraction automatisée des listes `p.key in (...)` de `0002_organizations_and_roles.sql` puis recoupés un à un avec le catalogue des 120 clés — aucune approximation.

### Remarque de cohérence à connaître : `rca.create` vs `rca.edit`

Le catalogue accorde `rca.create` à plusieurs rôles (Gestionnaire de maintenance, Superviseur) séparément de `rca.edit`. Cependant, la policy RLS de `rca_records` (et des tables associées `rca_five_whys`, `rca_causes`, `corrective_actions`, `failure_categories`, `failure_modes`) ne teste que `rca.edit` pour les écritures (`for all`) — il n'existe pas de policy `insert` distincte qui accepterait `rca.create` seul. En pratique, un rôle qui aurait `rca.create` sans `rca.edit` ne pourrait donc pas créer de dossier RCA via l'API cliente ; ce cas ne se présente pas parmi les 9 rôles système actuels (chacun d'eux qui a `rca.create` a aussi `rca.edit`), mais un administrateur composant un rôle personnalisé devrait accorder les deux ensemble pour ce module.

## 4. Accès accordés en dehors de la matrice de permissions (policies RLS complémentaires)

La matrice ci-dessus décrit le modèle "permission de module" mais plusieurs policies RLS accordent un accès **supplémentaire**, propriétaire de la ressource, indépendamment de toute permission de module. Un administrateur doit en tenir compte : retirer une permission de module ne retire pas ces accès.

- **Bons de travail (`work_orders`) et leurs sous-objets** (`work_order_tasks`, `work_order_parts`) : visibles et modifiables non seulement par un membre détenant `work_orders.view`/`work_orders.edit`, mais aussi par **l'assigné principal** (`primary_assignee_id = auth.uid()`) et par **tout utilisateur listé dans `work_order_assignees`** — même sans ces permissions. C'est ce qui permet à un Technicien ou un Vendor de voir/gérer uniquement les bons de travail qui lui sont confiés.
- **Demandes (`requests`)** : l'auteur d'une demande (`requested_by = auth.uid()`) peut toujours **la modifier tant qu'elle est encore au statut `draft`**, même sans `requests.edit` ni `requests.approve` — au-delà de ce statut, seules les permissions de module s'appliquent.
- **Commentaires** (`public.comments`) : chaque utilisateur peut toujours modifier et supprimer **ses propres** commentaires (`user_id = auth.uid()`), quelle que soit sa permission sur le module de l'entité commentée. (Sur `work_order_comments`, en revanche, il n'existe pas de policy update/delete du tout — ces commentaires-là sont immuables une fois postés.)
- **Feuilles de temps** (`work_order_time_logs`) : chaque utilisateur gère toujours **ses propres** entrées de temps (`user_id = auth.uid()`), en plus de quiconque détient `work_orders.edit`.
- **Notifications** (`notifications`) et **préférences de notification** (`notification_preferences`) : strictement personnelles — chacun ne voit et ne gère que les siennes (`user_id = auth.uid()`), sans lien avec l'appartenance à l'org ni avec une permission de module.
- **Profil** (`profiles`) : chacun modifie toujours son propre profil ; la lecture est en revanche partagée entre collègues d'un même org (tout membre actif d'un org voit les profils de base des autres membres actifs du même org).
- **Signatures** (`work_order_signatures`) : chacun ne peut signer qu'en son propre nom (`user_id = auth.uid()`).
- **Pièces jointes génériques** (`attachments`) : la suppression est réservée à celui qui a déposé le fichier (`uploaded_by = auth.uid()`).
- **Bons de commande en attente d'approbation** (`purchase_orders`) : un membre avec `purchasing.approve` (mais pas nécessairement `purchasing.edit`) peut modifier un bon de commande **uniquement lorsqu'il est au statut `pending_approval`** — un accès conditionnel au statut, plus étroit qu'une permission d'édition générale.

## 5. Rôles personnalisés (custom roles)

Le schéma modélise déjà les rôles personnalisés par organisation : `public.roles.org_id` peut être renseigné (au lieu de `null` pour un rôle système), et la contrainte `unique (org_id, key)` permet à chaque organisation de définir ses propres clés de rôle. Les policies RLS de `roles` et `role_permissions` autorisent déjà un Owner/Admin (`app.is_org_admin`) à créer, modifier et attribuer des permissions à un rôle personnalisé de son organisation (`create policy "admins manage custom roles"`, `"admins manage custom role permissions"`).

**Cependant, à ce stade, l'application ne propose pas encore d'écran d'administration dédié pour créer ou éditer un rôle personnalisé** — la fonctionnalité existe au niveau base de données et est accessible par appel direct à l'API Supabase, mais aucune interface utilisateur ne l'expose encore. Un administrateur qui a besoin d'un rôle sur mesure aujourd'hui devrait le faire créer via une intervention technique directe sur la base, en attendant cet écran.

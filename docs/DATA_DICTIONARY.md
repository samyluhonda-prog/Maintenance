# Dictionnaire de données — Intervia CMMS

> Généré à partir des migrations SQL finalisées `supabase/migrations/0001` à `0015`.
> Ce document décrit le schéma `public` (et les fonctions d'appui du schéma `app`) tel qu'il existe réellement dans les migrations — pas une intention future.

**53 tables** du schéma `public` sont documentées ci-dessous, réparties en 10 sections logiques, plus une annexe sur les fonctions d'aide du schéma `app`.

## Modèle multi-tenant — à lire en premier

Intervia est un SaaS multi-organisations (multi-tenant) sur une base Postgres/Supabase partagée :

- **Isolation par colonne** : à l'exception des tables globales `public.roles` (rôles système, `org_id null`), `public.permissions` et de la table technique `app.number_sequences`, **chaque table métier porte une colonne `org_id`** qui référence `organizations.id`. C'est la clé de partition logique de tout le système.
- **RLS comme unique frontière de sécurité** : `row level security` est activé sur toutes les tables `public`. Il n'y a pas de filtrage `org_id` supplémentaire côté application dont la sécurité dépendrait — la RLS est la frontière d'application réelle. Toute requête, y compris via `service_role` dans une Edge Function, doit être consciente de ce modèle.
- **Deux primitives composent presque toutes les policies** :
  - `app.is_member_of(org_id)` — vrai si l'utilisateur courant a une adhésion (`memberships`) **active** dans cet org. Sert de garde-fou de base pour le `select`.
  - `app.has_permission(org_id, 'module.action')` — vrai si l'utilisateur courant a, dans cet org, un rôle auquel la permission `module.action` a été accordée (via `role_permissions`). Sert de garde-fou pour `insert`/`update`/`delete`.
  - `app.is_org_admin(org_id)` est une troisième primitive plus rare, utilisée pour une poignée d'écrans strictement réservés à Owner/Admin (gestion des équipes, des invitations, des rôles personnalisés, mise à jour de l'organisation).
- **Pattern quasi universel** répété table par table :
  - `select` : tout membre actif de l'org (`app.is_member_of(org_id)`) — la visibilité en lecture est large.
  - `insert` / `update` / `delete` : membre actif **et** détenteur de la permission du module correspondant (`app.has_permission(org_id, '<module>.<action>')`).
  - Quelques tables élargissent ce modèle de base (voir `docs/PERMISSIONS.md` section 4) : bons de travail visibles/éditables par leur assigné, brouillons de demandes éditables par leur auteur, commentaires/temps/notifications/profil toujours gérés par leur propriétaire.
- **Fonctions SECURITY DEFINER pour éviter la récursion RLS** : `is_member_of`, `has_permission`, `is_org_admin` et `current_org_ids` sont déclarées `security definer`, appartiennent au rôle propriétaire de la migration et contournent donc la RLS *en interne* sur `memberships`/`roles`/`permissions`/`role_permissions`. C'est nécessaire : une policy sur `memberships` qui interrogerait `memberships` via le chemin normal (soumis à RLS) pour se vérifier elle-même entrerait dans une boucle de récursion — c'est le piège classique documenté par Supabase, et ces fonctions l'évitent en centralisant la logique d'appartenance dans un point unique, non récursif.
- **Numérotation humaine par org** : `app.next_number(org_id, key, prefix)` maintient un compteur séquentiel par organisation (table technique `app.number_sequences`) pour produire des identifiants lisibles comme `WO-000123`, `PO-000045`, `REQ-000012`.
- **Toutes les FK "utilisateur" pointent vers `public.profiles(id)`, pas vers `auth.users(id)`** — c'est un choix qui a évolué après la première ébauche du schéma. La seule exception est `profiles.id` lui-même, la table-miroir 1:1 dont la PK est aussi une FK vers `auth.users(id)` (voir `profiles` en section 1). Toutes les autres colonnes du schéma qui désignent un utilisateur (`created_by`, `requested_by`, `primary_assignee_id`, `owner_user_id`, `uploaded_by`, `changed_by`, `user_id`, etc.) référencent `public.profiles(id)`. C'est délibéré : PostgREST (l'API auto-générée que Supabase expose au client) ne voit que les schémas `public`/`graphql_public` et ne peut donc pas faire de jointure imbriquée (`embed`) vers `auth.users`, qui lui est invisible. En pointant systématiquement vers `profiles`, chaque requête client peut demander un embed du type `profiles(full_name)` sur n'importe quelle relation "utilisateur" de l'application (auteur d'un commentaire, assigné d'un bon de travail, etc.) sans détour par une fonction serveur.

---

## 1. Organisations & Contrôle d'accès

Tables : `organizations`, `profiles`, `roles`, `permissions`, `role_permissions`, `memberships`, `org_invitations`.

### `organizations`
Une organisation cliente (tenant) d'Intervia.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| name | text | non | — | |
| slug | text | non | — | unique |
| locale_default | text | non | `'fr'` | CHECK: `fr` ou `en` |
| timezone | text | non | `'America/Toronto'` | |
| logo_path | text | oui | — | chemin de stockage |
| is_demo | boolean | non | `false` | |
| created_at | timestamptz | non | `now()` | |
| updated_at | timestamptz | non | `now()` | auto-maintenu |

**RLS** — Select : tout membre actif de l'org (`app.is_member_of(id)`). Insert : tout utilisateur authentifié (`auth.uid() is not null`) — l'usage réel passe par `app.create_organization_with_owner` (voir annexe) qui crée l'org et l'adhésion Owner de façon atomique. Update : Owner/Admin de l'org (`app.is_org_admin(id)`). Delete : aucune policy définie → suppression impossible via l'API cliente.
**Triggers** : `trg_organizations_updated_at` → `app.set_updated_at()` (maintient `updated_at`).

### `profiles`
Profil applicatif 1:1 avec `auth.users` ; informations d'affichage valables pour tous les orgs de l'utilisateur.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | — | PK, FK -> auth.users.id, ON DELETE CASCADE |
| full_name | text | non | `''` | |
| avatar_path | text | oui | — | |
| locale | text | non | `'fr'` | CHECK: `fr`/`en` |
| phone | text | oui | — | |
| is_external_contractor | boolean | non | `false` | |
| created_at | timestamptz | non | `now()` | |
| updated_at | timestamptz | non | `now()` | auto-maintenu |

**RLS** — Select : l'utilisateur voit son propre profil (`id = auth.uid()`), **et** tout collègue actif d'un même org peut voir le profil d'un autre membre actif du même org ("org-mates can view basic profile info"). Insert/Update : uniquement son propre profil (`id = auth.uid()`).
**Triggers** : `trg_profiles_updated_at` (updated_at). Un profil est aussi créé automatiquement à l'inscription par le trigger `trg_auth_user_created` sur `auth.users` (voir `app.handle_new_user` en annexe).

### `roles`
Catalogue des rôles : 9 rôles système partagés (`org_id null`) + rôles personnalisés par org (`org_id` renseigné).

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | oui | — | FK -> organizations.id, CASCADE. `null` = rôle système |
| key | text | non | — | identifiant machine (`owner`, `technician`, ...) |
| name_fr / name_en | text | non | — | libellés bilingues |
| description_fr / description_en | text | oui | — | |
| is_system | boolean | non | `false` | |
| created_at | timestamptz | non | `now()` | |
| — | — | — | — | UNIQUE (org_id, key) ; index unique sur `key` où `org_id is null` (unicité des clés système) |

**RLS** — Select : rôles système (`org_id is null`) visibles de tous les utilisateurs authentifiés ayant une session, ou rôles personnalisés visibles des membres de l'org concernée. Insert/Update/Delete (`for all`) : uniquement pour des rôles personnalisés (`org_id is not null`) et uniquement par un Owner/Admin de cet org (`app.is_org_admin`) — les rôles système ne sont pas modifiables via l'API.

### `permissions`
Catalogue figé des permissions unitaires (`module.action`), 120 entrées (15 modules × 8 actions).

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| key | text | non | — | unique, ex. `equipment.edit` |
| module | text | non | — | l'un des 15 modules (voir PERMISSIONS.md) |
| action | text | non | — | CHECK: view/create/edit/approve/close/export/admin/delete |
| label_fr / label_en | text | non | — | libellés générés (`initcap(module) — action`) |

**RLS** — Select : tout utilisateur authentifié (`auth.uid() is not null`) — catalogue global, non scoping par org. Aucune policy insert/update/delete : table figée, gérée uniquement par migration.

### `role_permissions`
Table d'association many-to-many rôle ↔ permission.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| role_id | uuid | non | — | FK -> roles.id, CASCADE, PK (composite) |
| permission_id | uuid | non | — | FK -> permissions.id, CASCADE, PK (composite) |

**RLS** — Select : visible si le rôle associé est un rôle système ou un rôle personnalisé de l'org de l'utilisateur. Insert/Update/Delete (`for all`) : uniquement pour les rôles personnalisés d'un org, par un Owner/Admin de cet org.

### `memberships`
Rattache un utilisateur (`profiles`) à une organisation avec un rôle donné — la table pivot centrale du modèle multi-tenant. Un utilisateur peut avoir des adhésions distinctes (rôles différents) dans plusieurs orgs.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| user_id | uuid | non | — | FK -> profiles.id, CASCADE |
| role_id | uuid | non | — | FK -> roles.id |
| status | text | non | `'active'` | CHECK: active/invited/suspended |
| invited_email | text | oui | — | |
| job_title | text | oui | — | |
| created_at / updated_at | timestamptz | non | `now()` | updated_at auto-maintenu |
| — | — | — | — | UNIQUE (org_id, user_id) ; index sur user_id et sur org_id |

**RLS** — Select : tout membre actif de l'org (`app.is_member_of(org_id)`). Insert/Update/Delete : réservé aux Owner/Admin de l'org (`app.is_org_admin(org_id)`) — sauf la toute première adhésion (Owner) d'un org tout neuf, créée hors RLS par la fonction `app.create_organization_with_owner` (contourne le problème de l'œuf-et-la-poule : pas d'admin encore présent pour autoriser la première insertion).
**Triggers** : `trg_memberships_updated_at` (updated_at).

### `org_invitations`
Invitations en attente à rejoindre une organisation avec un rôle prédéfini.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| email | text | non | — | |
| role_id | uuid | non | — | FK -> roles.id |
| invited_by | uuid | non | — | FK -> profiles.id |
| token | uuid | non | `gen_random_uuid()` | index unique |
| status | text | non | `'pending'` | CHECK: pending/accepted/revoked/expired |
| created_at | timestamptz | non | `now()` | |
| expires_at | timestamptz | non | `now() + 14 jours` | |

**RLS** — Select/Insert/Update/Delete (`for all`) : réservé aux Owner/Admin de l'org (`app.is_org_admin(org_id)`). Un invité non encore membre ne peut pas lire sa propre invitation via cette policy (le flux d'acceptation passe vraisemblablement par le token, hors RLS classique / côté serveur).

---

## 2. Installations & Équipements

Tables : `locations`, `equipment`, `equipment_documents`, `equipment_moves`.

### `locations`
Hiérarchie d'emplacements auto-référencée (site / bâtiment / zone / ligne de production / système / autre).

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| parent_id | uuid | oui | — | FK -> locations.id, CASCADE (auto-référence) |
| type | text | non | — | CHECK: site/building/zone/production_line/system/other |
| name | text | non | — | |
| code | text | oui | — | |
| address | text | oui | — | |
| qr_code | text | oui | — | unique |
| notes | text | oui | — | |
| created_at / updated_at | timestamptz | non | `now()` | updated_at auto-maintenu |
| deleted_at | timestamptz | oui | — | soft delete |

**RLS** — Select : membre actif de l'org. Insert : membre + `locations.create`. Update : membre + `locations.edit`. Delete : membre + `locations.delete`.
**Triggers** : `trg_locations_updated_at`.

### `equipment`
Registre des équipements, avec sous-équipements/composants via auto-référence.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| location_id | uuid | oui | — | FK -> locations.id, ON DELETE SET NULL |
| parent_equipment_id | uuid | oui | — | FK -> equipment.id, CASCADE (sous-équipement) |
| name | text | non | — | indexé (trigram, recherche floue) |
| internal_code | text | oui | — | |
| qr_code | text | oui | — | unique |
| category | text | oui | — | |
| status | text | non | `'operational'` | CHECK: operational/down/in_repair/decommissioned/standby |
| criticality | text | non | `'medium'` | CHECK: low/medium/high/critical |
| manufacturer / model / serial_number | text | oui | — | |
| commissioned_at | date | oui | — | |
| acquisition_cost | numeric(14,2) | oui | — | |
| expected_lifetime_months | integer | oui | — | |
| warranty_expires_at | date | oui | — | |
| supplier_id | uuid | oui | — | FK -> suppliers.id (contrainte ajoutée en 0008), ON DELETE SET NULL |
| owner_user_id | uuid | oui | — | FK -> profiles.id |
| cumulative_cost | numeric(14,2) | non | `0` | |
| cumulative_downtime_minutes | bigint | non | `0` | |
| created_by | uuid | oui | — | FK -> profiles.id |
| created_at / updated_at | timestamptz | non | `now()` | updated_at auto-maintenu |
| deleted_at | timestamptz | oui | — | soft delete |

**RLS** — Select : membre actif. Insert : membre + `equipment.create`. Update : membre + `equipment.edit`. Delete : membre + `equipment.delete`.
**Triggers** : `trg_equipment_updated_at`.

### `equipment_documents`
Photos, manuels, plans et documents attachés à un équipement.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| equipment_id | uuid | non | — | FK -> equipment.id, CASCADE |
| kind | text | non | — | CHECK: photo/manual/plan/document |
| storage_path | text | non | — | |
| file_name | text | non | — | |
| mime_type | text | oui | — | |
| size_bytes | bigint | oui | — | |
| uploaded_by | uuid | oui | — | FK -> profiles.id |
| created_at | timestamptz | non | `now()` | |

**RLS** — Select : membre actif. Insert/Delete : membre + `equipment.edit` (pas de update — les documents sont ajoutés/retirés, pas modifiés).

### `equipment_moves`
Historique des déplacements d'un équipement entre emplacements.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| equipment_id | uuid | non | — | FK -> equipment.id, CASCADE |
| from_location_id / to_location_id | uuid | oui | — | FK -> locations.id |
| moved_by | uuid | oui | — | FK -> profiles.id |
| moved_at | timestamptz | non | `now()` | |
| note | text | oui | — | |

**RLS** — Select : membre actif. Insert : membre + `equipment.edit`. Pas d'update/delete (journal immuable des déplacements).

---

## 3. Compteurs (Meters)

Tables : `meters`, `meter_readings`.

### `meters`
Compteur rattaché à un équipement (heures, km, cycles, pression, etc.).

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| equipment_id | uuid | non | — | FK -> equipment.id, CASCADE |
| name | text | non | — | |
| unit | text | non | — | |
| kind | text | non | `'custom'` | CHECK: hours/kilometers/cycles/pressure/temperature/vibration/energy/weight/production/custom |
| source | text | non | `'manual'` | CHECK: manual/api/sensor |
| is_cumulative | boolean | non | `true` | |
| created_at / updated_at | timestamptz | non | `now()` | updated_at auto-maintenu |

**RLS** — Select : membre actif. Insert : membre + `meters.create`. Update : membre + `meters.edit`. Delete : membre + `meters.delete`.
**Triggers** : `trg_meters_updated_at`.

### `meter_readings`
Relevés successifs d'un compteur.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| meter_id | uuid | non | — | FK -> meters.id, CASCADE |
| value | numeric | non | — | |
| recorded_at | timestamptz | non | `now()` | index composite (meter_id, recorded_at desc) |
| recorded_by | uuid | oui | — | FK -> profiles.id |
| source | text | non | `'manual'` | CHECK: manual/api/sensor |
| note | text | oui | — | |
| created_at | timestamptz | non | `now()` | |

**RLS** — Select : membre actif. Insert : membre + `meters.create`. Update : membre + `meters.edit`. Pas de delete (historique conservé).

---

## 4. Pièces & Inventaire

Tables : `parts`, `equipment_parts`, `part_transactions`.

### `parts`
Catalogue des pièces de rechange ; `quantity_on_hand`/`quantity_reserved`/`quantity_on_order` sont des soldes courants maintenus par trigger plutôt que recalculés à la lecture.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| number | text | non | — | unique par org (UNIQUE org_id, number) |
| name | text | non | — | indexé (trigram) |
| description / category / manufacturer / manufacturer_part_number | text | oui | — | |
| unit | text | non | `'unit'` | |
| unit_cost | numeric(14,2) | non | `0` | |
| storage_location_id | uuid | oui | — | FK -> locations.id |
| quantity_on_hand | numeric | non | `0` | maintenu par `app.apply_part_transaction` |
| quantity_reserved | numeric | non | `0` | idem (type `reservation`) |
| quantity_on_order | numeric | non | `0` | |
| min_threshold | numeric | non | `0` | seuil de réappro |
| optimal_level | numeric | oui | — | |
| lead_time_days | integer | oui | — | |
| primary_supplier_id | uuid | oui | — | FK -> suppliers.id (contrainte ajoutée en 0008), ON DELETE SET NULL |
| qr_code | text | oui | — | unique |
| photo_path | text | oui | — | |
| created_at / updated_at | timestamptz | non | `now()` | updated_at auto-maintenu |
| deleted_at | timestamptz | oui | — | soft delete |

**RLS** — Select : membre actif. Insert : membre + `parts.create`. Update : membre + `parts.edit`. Delete : membre + `parts.delete`.
**Triggers** : `trg_parts_updated_at`.

### `equipment_parts`
Table d'association pièce ↔ équipement compatible.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| equipment_id | uuid | non | — | FK -> equipment.id, CASCADE, PK (composite) |
| part_id | uuid | non | — | FK -> parts.id, CASCADE, PK (composite) |

**RLS** — Select : membre actif. Insert/Update/Delete (`for all`) : membre + `parts.edit`.

### `part_transactions`
Grand livre immuable des mouvements de stock (réceptions, usages, réservations, retours, transferts, ajustements, comptages, rebuts).

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| part_id | uuid | non | — | FK -> parts.id, CASCADE |
| type | text | non | — | CHECK: receipt/usage/reservation/return/transfer/adjustment/cycle_count/scrap |
| quantity | numeric | non | — | signe géré par le trigger selon `type` |
| unit_cost | numeric(14,2) | oui | — | |
| work_order_id | uuid | oui | — | FK -> work_orders.id (contrainte ajoutée en 0010), ON DELETE SET NULL |
| purchase_order_id | uuid | oui | — | FK -> purchase_orders.id (contrainte ajoutée en 0008), ON DELETE SET NULL |
| from_location_id / to_location_id | uuid | oui | — | FK -> locations.id |
| performed_by | uuid | oui | — | FK -> profiles.id |
| note | text | oui | — | |
| created_at | timestamptz | non | `now()` | index (part_id, created_at desc) et (work_order_id) |

**RLS** — Select : membre actif. Insert : membre + `parts.edit`. Pas d'update/delete (ledger immuable).
**Triggers** : `trg_part_transactions_apply` (AFTER INSERT) → `app.apply_part_transaction()` : met à jour `parts.quantity_on_hand` (receipt/return: +, usage/scrap: −, adjustment/cycle_count: valeur signée telle quelle) ou `parts.quantity_reserved` (type `reservation`).

---

## 5. Fournisseurs & Achats

Tables : `suppliers`, `supplier_documents`, `purchase_orders`, `purchase_order_lines`.

### `suppliers`
Fournisseurs / sous-traitants.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| name | text | non | — | |
| contact_name / email / phone / address / notes | text | oui | — | |
| rating | numeric(3,2) | oui | — | CHECK: entre 0 et 5 |
| created_at / updated_at | timestamptz | non | `now()` | updated_at auto-maintenu |
| deleted_at | timestamptz | oui | — | soft delete |

**RLS** — Select : membre actif. Insert : membre + `suppliers.create`. Update : membre + `suppliers.edit`. Delete : membre + `suppliers.delete`.
**Triggers** : `trg_suppliers_updated_at`.

### `supplier_documents`
Contrats et documents rattachés à un fournisseur.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| supplier_id | uuid | non | — | FK -> suppliers.id, CASCADE |
| title | text | non | — | |
| kind | text | non | `'document'` | CHECK: contract/document |
| storage_path | text | non | — | |
| start_date / end_date | date | oui | — | |
| value | numeric(14,2) | oui | — | |
| created_at | timestamptz | non | `now()` | |

**RLS** — Select : membre actif. Insert/Update/Delete (`for all`) : membre + `suppliers.edit`.

### `purchase_orders`
Bons de commande, cycle de vie `draft → requested → pending_approval → approved → ordered → partially_received → received → closed` (ou `cancelled`).

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| number | text | non | — | unique par org |
| supplier_id | uuid | oui | — | FK -> suppliers.id |
| status | text | non | `'draft'` | CHECK: draft/requested/pending_approval/approved/ordered/partially_received/received/closed/cancelled |
| requested_by / approved_by | uuid | oui | — | FK -> profiles.id |
| approved_at / ordered_at | timestamptz | oui | — | |
| expected_at | date | oui | — | |
| subtotal / tax / shipping / total | numeric(14,2) | non | `0` | |
| notes | text | oui | — | |
| created_at / updated_at | timestamptz | non | `now()` | updated_at auto-maintenu |

**RLS** — Select : membre actif. Insert : membre + `purchasing.create`. Update : membre + `purchasing.edit`, **ou** membre + `purchasing.approve` lorsque le bon est au statut `pending_approval` (permet à un approbateur de faire avancer uniquement les bons en attente d'approbation, sans droit d'édition général). Delete : membre + `purchasing.delete`.
**Triggers** : `trg_purchase_orders_updated_at`.

### `purchase_order_lines`
Lignes d'un bon de commande.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| purchase_order_id | uuid | non | — | FK -> purchase_orders.id, CASCADE |
| part_id | uuid | oui | — | FK -> parts.id |
| description | text | non | — | |
| quantity | numeric | non | — | |
| unit_cost | numeric(14,2) | non | `0` | |
| quantity_received | numeric | non | `0` | mise à jour par `app.receive_purchase_order_line` |
| created_at | timestamptz | non | `now()` | |

**RLS** — Select : membre actif. Insert/Update/Delete (`for all`) : membre + `purchasing.edit`.

---

## 6. Procédures

Tables : `procedure_templates`, `procedure_fields`, `procedure_runs`, `procedure_run_answers`.

### `procedure_templates`
Modèle de procédure/checklist visuelle réutilisable.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| name | text | non | — | |
| description / category | text | oui | — | |
| version | integer | non | `1` | |
| is_active | boolean | non | `true` | |
| created_by | uuid | oui | — | FK -> profiles.id |
| created_at / updated_at | timestamptz | non | `now()` | updated_at auto-maintenu |
| deleted_at | timestamptz | oui | — | soft delete |

**RLS** — Select : membre actif. Insert : membre + `procedures.create`. Update : membre + `procedures.edit`. Delete : membre + `procedures.delete`.
**Triggers** : `trg_procedure_templates_updated_at`.

### `procedure_fields`
Champs ordonnés d'un modèle (sections + champs concrets), avec logique conditionnelle dans `config` (jsonb).

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| template_id | uuid | non | — | FK -> procedure_templates.id, CASCADE |
| section_id | uuid | oui | — | FK -> procedure_fields.id, CASCADE (auto-référence, regroupement en section) |
| order_index | integer | non | `0` | |
| type | text | non | — | CHECK: section/text/instructions/checkbox/yesno/multiple_choice/number/free_text/datetime/meter_reading/pass_fail/photo/signature/file/amount_range |
| label | text | non | — | |
| is_required | boolean | non | `false` | |
| config | jsonb | non | `'{}'` | forme dépendant de `type` (options, min/max, condition d'affichage...) |
| created_at | timestamptz | non | `now()` | |

**RLS** — Select : membre actif. Insert/Update/Delete (`for all`) : membre + `procedures.edit`.

### `procedure_runs`
Exécution d'une procédure (souvent liée à un bon de travail).

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| template_id | uuid | non | — | FK -> procedure_templates.id |
| work_order_id | uuid | oui | — | pas de contrainte FK déclarée dans les migrations lues |
| equipment_id | uuid | oui | — | FK -> equipment.id |
| status | text | non | `'in_progress'` | CHECK: in_progress/completed/failed |
| started_by | uuid | oui | — | FK -> profiles.id |
| started_at | timestamptz | non | `now()` | |
| completed_at | timestamptz | oui | — | |
| score | numeric | oui | — | |
| created_at | timestamptz | non | `now()` | |

**RLS** — Select : membre actif. Insert : tout membre actif peut démarrer une exécution. Update : l'auteur (`started_by = auth.uid()`) **ou** un membre avec `procedures.edit`.

### `procedure_run_answers`
Réponses saisies pour chaque champ d'une exécution.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| run_id | uuid | non | — | FK -> procedure_runs.id, CASCADE |
| field_id | uuid | non | — | FK -> procedure_fields.id |
| value | jsonb | oui | — | |
| flagged | boolean | non | `false` | |
| created_at | timestamptz | non | `now()` | UNIQUE (run_id, field_id) |

**RLS** — Select : membre actif. Insert/Update/Delete (`for all`) : membre actif, si l'exécution parente a été démarrée par l'utilisateur (`started_by = auth.uid()`) **ou** si l'utilisateur a `procedures.edit`.

---

## 7. Demandes & Bons de travail

Tables : `requests`, `request_attachments`, `work_orders`, `teams`, `team_members`, `work_order_assignees`, `work_order_tasks`, `work_order_parts`, `work_order_time_logs`, `work_order_comments`, `work_order_attachments`, `work_order_signatures`, `work_order_status_history`.

### `requests`
Demandes d'intervention soumises via le portail (avant conversion éventuelle en bon de travail).

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| number | text | non | — | unique par org |
| title | text | non | — | |
| description | text | oui | — | |
| equipment_id | uuid | oui | — | FK -> equipment.id |
| location_id | uuid | oui | — | FK -> locations.id |
| category | text | oui | — | |
| urgency | text | non | `'medium'` | CHECK: low/medium/high/critical |
| is_equipment_down | boolean | non | `false` | |
| status | text | non | `'draft'` | CHECK: draft/submitted/under_review/approved/rejected/converted |
| requested_by | uuid | non | — | FK -> profiles.id |
| reviewed_by | uuid | oui | — | FK -> profiles.id |
| reviewed_at | timestamptz | oui | — | |
| review_note | text | oui | — | |
| converted_work_order_id | uuid | oui | — | FK -> work_orders.id (contrainte ajoutée après création de work_orders), ON DELETE SET NULL |
| created_at / updated_at | timestamptz | non | `now()` | updated_at auto-maintenu |

**RLS** — Select : membre actif. Insert : membre + `requests.create`, **et** seulement en son propre nom (`requested_by = auth.uid()`). Update : l'auteur peut éditer **tant que la demande est en statut `draft`**, **ou** tout membre avec `requests.approve`, **ou** tout membre avec `requests.edit`.
**Triggers** : `trg_requests_updated_at`.

### `request_attachments`
Pièces jointes d'une demande.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| request_id | uuid | non | — | FK -> requests.id, CASCADE |
| storage_path / file_name | text | non | — | |
| mime_type | text | oui | — | |
| uploaded_by | uuid | oui | — | FK -> profiles.id |
| created_at | timestamptz | non | `now()` | |

**RLS** — Select : membre actif. Insert : membre actif, uniquement pour joindre un fichier à **sa propre** demande (`requests.requested_by = auth.uid()`). Pas d'update/delete.

### `work_orders`
Bon de travail — cœur opérationnel du CMMS.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| number | text | non | — | unique par org |
| title | text | non | — | |
| description | text | oui | — | |
| type | text | non | `'corrective'` | CHECK: preventive/corrective/inspection/safety/improvement/other |
| priority | text | non | `'medium'` | CHECK: low/medium/high/critical |
| status | text | non | `'draft'` | CHECK: draft/open/planned/assigned/in_progress/on_hold/completed/to_review/closed/cancelled/skipped |
| equipment_id | uuid | oui | — | FK -> equipment.id |
| location_id | uuid | oui | — | FK -> locations.id |
| request_id | uuid | oui | — | FK -> requests.id |
| parent_work_order_id | uuid | oui | — | FK -> work_orders.id, ON DELETE SET NULL (auto-référence) |
| pm_plan_id | uuid | oui | — | FK -> pm_plans.id (contrainte ajoutée en 0011), ON DELETE SET NULL |
| procedure_template_id | uuid | oui | — | FK -> procedure_templates.id |
| procedure_run_id | uuid | oui | — | FK -> procedure_runs.id |
| primary_assignee_id | uuid | oui | — | FK -> profiles.id, indexé |
| team_id | uuid | oui | — | FK -> teams.id (contrainte ajoutée plus bas), ON DELETE SET NULL |
| created_by | uuid | oui | — | FK -> profiles.id |
| scheduled_start / due_at | timestamptz | oui | — | index (org_id, due_at) |
| estimate_hours | numeric(8,2) | oui | — | |
| actual_hours | numeric(8,2) | non | `0` | |
| downtime_minutes | integer | non | `0` | |
| labor_cost / parts_cost / external_cost | numeric(14,2) | non | `0` | |
| requires_lockout | boolean | non | `false` | |
| safety_notes | text | oui | — | |
| failure_cause / resolution | text | oui | — | |
| follow_up_required | boolean | non | `false` | |
| follow_up_notes | text | oui | — | |
| closed_at | timestamptz | oui | — | |
| closed_by | uuid | oui | — | FK -> profiles.id |
| created_at / updated_at | timestamptz | non | `now()` | updated_at auto-maintenu |
| deleted_at | timestamptz | oui | — | soft delete |

**RLS** — Select : membre actif **et** (a la permission `work_orders.view` **ou** est l'assigné principal `primary_assignee_id = auth.uid()` **ou** figure dans `work_order_assignees`). Insert : membre + `work_orders.create`. Update : membre **et** (`work_orders.edit` **ou** assigné principal **ou** dans `work_order_assignees`) — un technicien affecté peut donc modifier "son" bon de travail sans détenir `work_orders.edit`. Delete : membre + `work_orders.delete`.
**Triggers** : `trg_work_orders_updated_at` (updated_at) ; `trg_work_orders_status_history` (AFTER INSERT OR UPDATE OF status) → `app.log_work_order_status_change()` : à chaque insertion ou changement réel de `status`, insère une ligne dans `work_order_status_history` avec l'ancien et le nouveau statut.

### `teams`
Équipes internes.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| name | text | non | — | |
| created_at | timestamptz | non | `now()` | |

**RLS** — Select : membre actif. Insert/Update/Delete (`for all`) : Owner/Admin uniquement (`app.is_org_admin`).

### `team_members`
Association utilisateur ↔ équipe.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| team_id | uuid | non | — | FK -> teams.id, CASCADE, PK (composite) |
| user_id | uuid | non | — | FK -> profiles.id, CASCADE, PK (composite) |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |

**RLS** — Select : membre actif. Insert/Update/Delete (`for all`) : Owner/Admin uniquement.

### `work_order_assignees`
Assignés (multiples) d'un bon de travail, au-delà de l'assigné principal.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| work_order_id | uuid | non | — | FK -> work_orders.id, CASCADE, PK (composite) |
| user_id | uuid | non | — | FK -> profiles.id, CASCADE, PK (composite), indexé |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| role_on_wo | text | oui | `'technician'` | |

**RLS** — Select : membre actif. Insert/Update/Delete (`for all`) : membre + `work_orders.edit`.

### `work_order_tasks`
Sous-tâches (checklist simple) d'un bon de travail.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| work_order_id | uuid | non | — | FK -> work_orders.id, CASCADE |
| label | text | non | — | |
| is_done | boolean | non | `false` | |
| order_index | integer | non | `0` | |
| created_at | timestamptz | non | `now()` | |

**RLS** — Select : membre actif. Insert/Update/Delete (`for all`) : membre et (assigné principal, ou dans `work_order_assignees`, ou `work_orders.edit`) du bon de travail parent.

### `work_order_parts`
Pièces planifiées/utilisées sur un bon de travail.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| work_order_id | uuid | non | — | FK -> work_orders.id, CASCADE |
| part_id | uuid | non | — | FK -> parts.id |
| quantity_planned / quantity_used | numeric | non | `0` | |
| unit_cost | numeric(14,2) | non | `0` | |
| created_at | timestamptz | non | `now()` | |

**RLS** — Select : membre actif. Insert/Update/Delete (`for all`) : membre et (assigné principal, ou dans `work_order_assignees`, ou `work_orders.edit`) du bon de travail parent.

### `work_order_time_logs`
Feuilles de temps par intervenant.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| work_order_id | uuid | non | — | FK -> work_orders.id, CASCADE |
| user_id | uuid | non | — | FK -> profiles.id |
| started_at | timestamptz | non | — | |
| ended_at | timestamptz | oui | — | |
| minutes | integer | oui | — | |
| labor_rate | numeric(10,2) | oui | — | |
| note | text | oui | — | |
| created_at | timestamptz | non | `now()` | |

**RLS** — Select : membre actif. Insert/Update/Delete (`for all`) : le propriétaire de l'entrée (`user_id = auth.uid()`) **ou** un membre avec `work_orders.edit` — chacun gère toujours son propre temps.

### `work_order_comments`
Fil de discussion sur un bon de travail.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| work_order_id | uuid | non | — | FK -> work_orders.id, CASCADE |
| user_id | uuid | non | — | FK -> profiles.id |
| body | text | non | — | |
| mentioned_user_ids | uuid[] | non | `'{}'` | |
| created_at | timestamptz | non | `now()` | index (work_order_id, created_at) |

**RLS** — Select : membre actif. Insert : membre, en son propre nom (`user_id = auth.uid()`). Pas d'update/delete définie (commentaires immuables sur cette table, à la différence de `public.comments` générique — voir section 10).

### `work_order_attachments`
Pièces jointes d'un bon de travail.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| work_order_id | uuid | non | — | FK -> work_orders.id, CASCADE |
| storage_path / file_name | text | non | — | |
| mime_type | text | oui | — | |
| uploaded_by | uuid | oui | — | FK -> profiles.id |
| created_at | timestamptz | non | `now()` | |

**RLS** — Select : membre actif. Insert : tout membre actif (pas de contrainte supplémentaire). Pas d'update/delete.

### `work_order_signatures`
Signatures électroniques apposées sur un bon de travail.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| work_order_id | uuid | non | — | FK -> work_orders.id, CASCADE |
| user_id | uuid | non | — | FK -> profiles.id |
| signed_at | timestamptz | non | `now()` | |
| signature_path | text | non | — | |

**RLS** — Select : membre actif. Insert : uniquement pour signer en son propre nom (`user_id = auth.uid()`). Pas d'update/delete (signature immuable).

### `work_order_status_history`
Journal immuable des transitions de statut d'un bon de travail.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| work_order_id | uuid | non | — | FK -> work_orders.id, CASCADE |
| from_status | text | oui | — | `null` à la création |
| to_status | text | non | — | |
| changed_by | uuid | oui | — | FK -> profiles.id |
| changed_at | timestamptz | non | `now()` | index (work_order_id, changed_at) |
| note | text | oui | — | |

**RLS** — Select : membre actif. Aucune policy insert/update/delete pour les rôles applicatifs : la table n'est alimentée que par le trigger `app.log_work_order_status_change` (SECURITY DEFINER), jamais en écriture directe par un client.

---

## 8. Maintenance préventive (PM)

Tables : `pm_plans`, `pm_triggers`, `pm_generated_work_orders`.

### `pm_plans`
Plan de maintenance préventive rattaché à un équipement, gabarit du bon de travail à générer.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| name | text | non | — | |
| equipment_id | uuid | non | — | FK -> equipment.id, CASCADE |
| procedure_template_id | uuid | oui | — | FK -> procedure_templates.id |
| wo_title | text | non | — | titre du BT généré |
| wo_description | text | oui | — | |
| wo_priority | text | non | `'medium'` | CHECK: low/medium/high/critical |
| wo_estimate_hours | numeric(8,2) | oui | — | |
| default_assignee_id | uuid | oui | — | FK -> profiles.id |
| lead_time_days | integer | non | `0` | avance de génération du BT avant l'échéance |
| status | text | non | `'active'` | CHECK: active/paused/archived |
| created_by | uuid | oui | — | FK -> profiles.id |
| created_at / updated_at | timestamptz | non | `now()` | updated_at auto-maintenu |

**RLS** — Select : membre actif. Insert : membre + `pm_plans.create`. Update : membre + `pm_plans.edit`. Delete : membre + `pm_plans.delete`.
**Triggers** : `trg_pm_plans_updated_at`.

### `pm_triggers`
Déclencheur(s) d'un plan PM — calendaire, à compteur, ou conditionnel ; un plan peut avoir plusieurs déclencheurs simultanés ("tous les 6 mois OU toutes les 2000 heures moteur, au premier des deux").

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| pm_plan_id | uuid | non | — | FK -> pm_plans.id, CASCADE |
| kind | text | non | — | CHECK: calendar/meter/condition |
| frequency_unit | text | oui | — | CHECK: day/week/month/year/custom (calendaire) |
| frequency_value | integer | oui | — | |
| days_of_week | integer[] | oui | — | |
| fixed_interval | boolean | non | `true` | true = cadence calendaire fixe, false = flottant depuis la dernière complétion |
| tolerance_days | integer | non | `0` | |
| meter_id | uuid | oui | — | FK -> meters.id (déclencheur à compteur) |
| meter_interval | numeric | oui | — | |
| meter_operator | text | oui | — | CHECK: gte/lte/eq |
| meter_threshold | numeric | oui | — | |
| condition_expression | jsonb | oui | — | déclencheur conditionnel (API/capteur) |
| is_active | boolean | non | `true` | |
| last_generated_at | timestamptz | oui | — | |
| last_generated_meter_value | numeric | oui | — | |
| next_due_at | timestamptz | oui | — | index partiel (org_id, next_due_at) où is_active |
| created_at | timestamptz | non | `now()` | |

**RLS** — Select : membre actif. Insert/Update/Delete (`for all`) : membre + `pm_plans.edit`.

### `pm_generated_work_orders`
Table de liaison traçant quel déclencheur a généré quel bon de travail, pour quelle occurrence.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| pm_trigger_id | uuid | non | — | FK -> pm_triggers.id, CASCADE, PK (composite) |
| work_order_id | uuid | non | — | FK -> work_orders.id, CASCADE, PK (composite) |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| occurrence_date | date | non | — | |
| generated_at | timestamptz | non | `now()` | |

**RLS** — Select : membre actif. Aucune policy insert/update/delete pour les rôles applicatifs — alimentée uniquement par `app.generate_pm_work_order` (appelée par le job planifié, rôle `service_role`).

---

## 9. Automatisations

Tables : `automation_rules`, `automation_logs`.

### `automation_rules`
Moteur de règles : SI `trigger_event` (+ conditions jsonb) ALORS `actions` (tableau jsonb). Évaluées côté serveur (Edge Function / route API avec `service_role`) afin d'agir sur des tables indépendamment de la visibilité RLS de l'utilisateur déclencheur.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| name | text | non | — | |
| description | text | oui | — | |
| is_active | boolean | non | `true` | |
| trigger_event | text | non | — | CHECK: l'un de `request.created`, `request.critical_created`, `equipment.status_changed`, `equipment.repeat_failure`, `work_order.created`, `work_order.completed`, `work_order.overdue`, `work_order.unassigned_timeout`, `procedure.failed`, `meter.threshold_reached`, `part.below_min` |
| conditions | jsonb | non | `'{}'` | |
| actions | jsonb | non | `'[]'` | |
| created_by | uuid | oui | — | FK -> profiles.id |
| created_at / updated_at | timestamptz | non | `now()` | updated_at auto-maintenu ; index partiel (org_id, trigger_event) où is_active |

**RLS** — Select : membre actif. Insert/Update/Delete (`for all`) : membre + `automations.edit`.
**Triggers** : `trg_automation_rules_updated_at`.

### `automation_logs`
Journal d'exécution de chaque règle déclenchée (traçabilité).

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| rule_id | uuid | oui | — | FK -> automation_rules.id, ON DELETE SET NULL |
| triggered_at | timestamptz | non | `now()` | index (org_id, triggered_at desc) |
| context | jsonb | non | `'{}'` | |
| actions_taken | jsonb | non | `'[]'` | |
| success | boolean | non | `true` | |
| error | text | oui | — | |

**RLS** — Select : membre actif (toute la lecture, aucune restriction de permission — un simple membre peut consulter les logs d'automatisation de son org). Aucune policy insert/update/delete pour les rôles applicatifs : uniquement écrit par le processus serveur (`service_role`, hors RLS).

---

## 10. Notifications, Audit & Fiabilité (RCA)

Tables : `notifications`, `notification_preferences`, `audit_log`, `failure_categories`, `failure_modes`, `rca_records`, `rca_five_whys`, `rca_causes`, `corrective_actions`, `comments`, `attachments`.

### `notifications`
Notifications in-app par utilisateur.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| user_id | uuid | non | — | FK -> profiles.id, CASCADE |
| type | text | non | — | |
| title | text | non | — | |
| body | text | oui | — | |
| link | text | oui | — | |
| is_read | boolean | non | `false` | |
| created_at | timestamptz | non | `now()` | index (user_id, is_read, created_at desc) |

**RLS** — Select/Update : uniquement le destinataire (`user_id = auth.uid()`) — pas de visibilité `is_member_of` ici, la portée est strictement personnelle. Aucune policy insert pour les rôles applicatifs (écrites par le serveur / triggers d'automatisation via `service_role`).

### `notification_preferences`
Préférences de canal (in-app/email/push) par catégorie, par utilisateur et par org.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| user_id | uuid | non | — | FK -> profiles.id, CASCADE, PK (composite) |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE, PK (composite) |
| channel | text | non | — | CHECK: inapp/email/push, PK (composite) |
| category | text | non | — | PK (composite) |
| enabled | boolean | non | `true` | |

**RLS** — Select/Insert/Update/Delete (`for all`) : uniquement le propriétaire (`user_id = auth.uid()`).

### `audit_log`
Journal d'audit immuable (append-only) des actions sensibles.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| actor_id | uuid | oui | — | FK -> profiles.id |
| action | text | non | — | |
| entity_type | text | non | — | |
| entity_id | uuid | oui | — | index (org_id, entity_type, entity_id) |
| before / after | jsonb | oui | — | |
| created_at | timestamptz | non | `now()` | index (org_id, created_at desc) |

**RLS** — Select : membre de l'org **et** détenteur de `settings.admin` uniquement. Aucune policy insert/update/delete pour les rôles applicatifs : seul `service_role` écrit dans cette table, ce qui en garantit l'intégrité en tant que piste de conformité.

### `failure_categories`
Catégories de modes de défaillance (pour la RCA).

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| name | text | non | — | |

**RLS** — Select : membre actif. Insert/Update/Delete (`for all`) : membre + `rca.edit`.

### `failure_modes`
Modes de défaillance rattachés à une catégorie.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| category_id | uuid | oui | — | FK -> failure_categories.id, CASCADE |
| name | text | non | — | |

**RLS** — Select : membre actif. Insert/Update/Delete (`for all`) : membre + `rca.edit`.

### `rca_records`
Dossier d'analyse de cause racine (root cause analysis).

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| work_order_id | uuid | oui | — | FK -> work_orders.id |
| equipment_id | uuid | non | — | FK -> equipment.id |
| title | text | non | — | |
| problem_statement | text | non | — | |
| failure_mode_id | uuid | oui | — | FK -> failure_modes.id |
| status | text | non | `'open'` | CHECK: open/in_progress/completed |
| created_by | uuid | oui | — | FK -> profiles.id |
| created_at / updated_at | timestamptz | non | `now()` | updated_at auto-maintenu |

**RLS** — Select : membre actif. Insert/Update/Delete (`for all`) : membre + `rca.edit` (noter : `rca.create` existe dans le catalogue et est accordé à certains rôles, mais la policy d'écriture de cette table teste uniquement `rca.edit` — un rôle avec `rca.create` mais pas `rca.edit` ne pourrait pas créer de dossier RCA via cette policy).
**Triggers** : `trg_rca_records_updated_at`.

### `rca_five_whys`
Méthode des "5 pourquoi" rattachée à un dossier RCA.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| rca_id | uuid | non | — | FK -> rca_records.id, CASCADE |
| order_index | integer | non | — | index (rca_id, order_index) |
| question | text | non | — | |
| answer | text | oui | — | |

**RLS** — Select : membre actif. Insert/Update/Delete (`for all`) : membre + `rca.edit`.

### `rca_causes`
Causes classées (méthode Ishikawa : méthode/machine/matière/main-d'œuvre/mesure/milieu) rattachées à un dossier RCA.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| rca_id | uuid | non | — | FK -> rca_records.id, CASCADE |
| category | text | non | — | CHECK: method/machine/material/man/measurement/environment |
| description | text | non | — | |

**RLS** — Select : membre actif. Insert/Update/Delete (`for all`) : membre + `rca.edit`.

### `corrective_actions`
Actions correctives issues d'un dossier RCA, avec suivi de vérification d'efficacité.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| rca_id | uuid | non | — | FK -> rca_records.id, CASCADE |
| description | text | non | — | |
| owner_id | uuid | oui | — | FK -> profiles.id |
| due_date | date | oui | — | |
| status | text | non | `'open'` | CHECK: open/in_progress/done/verified |
| verified_by | uuid | oui | — | FK -> profiles.id |
| verified_at | timestamptz | oui | — | |
| effectiveness_note | text | oui | — | |
| created_at | timestamptz | non | `now()` | |

**RLS** — Select : membre actif. Insert/Update/Delete (`for all`) : membre + `rca.edit`.

### `comments`
Commentaires génériques réutilisables par n'importe quel type d'entité qui n'a pas déjà sa propre table de commentaires dédiée (équipement, demandes, pièces, RCA, ...), via `entity_type`/`entity_id` polymorphes.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| entity_type | text | non | — | discriminant polymorphe (pas de FK possible) |
| entity_id | uuid | non | — | discriminant polymorphe |
| user_id | uuid | non | — | FK -> profiles.id |
| body | text | non | — | |
| mentioned_user_ids | uuid[] | non | `'{}'` | |
| created_at | timestamptz | non | `now()` | index (org_id, entity_type, entity_id, created_at) |

**RLS** — Select : membre actif. Insert : membre, en son propre nom. Update/Delete : l'auteur uniquement (`user_id = auth.uid()`) — chacun gère toujours ses propres commentaires.

### `attachments`
Pièces jointes génériques, même principe polymorphe que `comments`.

| Colonne | Type | Nullable | Défaut | Notes |
|---|---|---|---|---|
| id | uuid | non | `gen_random_uuid()` | PK |
| org_id | uuid | non | — | FK -> organizations.id, CASCADE |
| entity_type / entity_id | text / uuid | non | — | discriminant polymorphe, index (org_id, entity_type, entity_id) |
| storage_path | text | non | — | |
| file_name | text | non | — | |
| mime_type | text | oui | — | |
| size_bytes | bigint | oui | — | |
| uploaded_by | uuid | oui | — | FK -> profiles.id |
| created_at | timestamptz | non | `now()` | |

**RLS** — Select : membre actif. Insert : tout membre actif. Delete : uniquement celui qui a déposé le fichier (`uploaded_by = auth.uid()`). Pas d'update.

---

## Annexe — Fonctions d'aide du schéma `app`

Toutes les fonctions ci-dessous vivent dans le schéma `app` (non exposé directement par l'API PostgREST — voir `0015_public_rpc_wrappers.sql`) plutôt que `public`, pour que triggers et autres fonctions SQL puissent s'y appeler sans détour par l'API.

| Fonction | Rôle | Détails |
|---|---|---|
| `app.set_updated_at()` | Trigger générique | `BEFORE UPDATE`, met `new.updated_at = now()`. Attaché à toutes les tables porteuses d'une colonne `updated_at` (organizations, profiles, memberships, locations, equipment, meters, parts, suppliers, purchase_orders, procedure_templates, requests, work_orders, pm_plans, automation_rules, rca_records). |
| `app.next_number(org_id, key, prefix)` | Numérotation séquentielle par org | `SECURITY DEFINER`. Fait un upsert sur `app.number_sequences` (clé `(org_id, sequence_key)`) qui incrémente `last_value`, puis retourne `prefix || '-' || lpad(valeur, 6, '0')` (ex. `WO-000123`). Exposé côté client via `public.next_number`. |
| `app.is_member_of(target_org)` | Primitive RLS de base | `SECURITY DEFINER`, `stable`, langage SQL. Vrai si l'utilisateur courant (`auth.uid()`) a une ligne `memberships` active dans `target_org`. **Pourquoi SECURITY DEFINER** : appelée depuis les policies RLS de `memberships` elle-même (et de presque toutes les autres tables) ; si elle interrogeait `memberships` via le chemin normal soumis à RLS, la policy `select` de `memberships` se réévaluerait indéfiniment (récursion). En s'exécutant avec les droits du propriétaire de la fonction, elle contourne la RLS *en interne* et casse la boucle. |
| `app.has_permission(target_org, perm_key)` | Primitive RLS de contrôle fin | `SECURITY DEFINER`, `stable`. Vrai si un rôle actif de l'utilisateur dans `target_org` (via `memberships` → `role_permissions` → `permissions`) porte la clé `perm_key`. Même raison SECURITY DEFINER que `is_member_of` — évite la récursion RLS sur `role_permissions`/`permissions` et centralise la logique d'autorisation en un seul endroit auditable. |
| `app.is_org_admin(target_org)` | Raccourci Owner/Admin | `SECURITY DEFINER`, `stable`. Vrai si l'utilisateur a un rôle `owner` ou `admin` dans `target_org`. Utilisée pour les écrans strictement réservés aux administrateurs (gestion des membres, des équipes, des rôles personnalisés, mise à jour de l'organisation) plutôt que de vérifier une permission fine. |
| `app.current_org_ids()` | Utilitaire | `SECURITY DEFINER`, `stable`, retourne l'ensemble des `org_id` où l'utilisateur courant a une adhésion active. |
| `app.create_organization_with_owner(name, slug, locale, timezone)` | Bootstrap d'une nouvelle org | `SECURITY DEFINER`. Crée la ligne `organizations` puis insère l'utilisateur courant comme membre `owner` — en une seule transaction, hors RLS. Nécessaire car la policy normale d'insertion dans `memberships` exige déjà un admin existant dans l'org (`app.is_org_admin`), ce qui est impossible pour la toute première adhésion d'un org qui vient d'être créé (problème de l'œuf et la poule). Exposée côté client via `public.create_organization_with_owner`. |
| `app.receive_purchase_order_line(line_id, quantity, performed_by)` | Réception d'une ligne de bon de commande | `SECURITY INVOKER` (s'exécute avec les droits de l'appelant, donc soumise à la RLS normale de l'appelant sur les tables touchées). Valide la quantité restante, incrémente `purchase_order_lines.quantity_received`, insère une transaction de type `receipt` dans `part_transactions` (si la ligne est liée à une pièce), puis fait avancer automatiquement `purchase_orders.status` vers `partially_received` ou `received` selon le total reçu. Exposée côté client via `public.receive_purchase_order_line`. |
| `app.generate_pm_work_order(trigger_id, occurrence)` | Génération d'un bon de travail préventif | `SECURITY INVOKER`. Lit le déclencheur et le plan PM, génère un numéro via `app.next_number`, insère un `work_orders` au statut `planned` (dates calculées à partir de `lead_time_days`), trace la génération dans `pm_generated_work_orders`, et met à jour `last_generated_at` du déclencheur. Conçue pour être appelée par la tâche planifiée (Edge Function, rôle `service_role` — `execute` n'est accordé qu'à `service_role`, pas à `authenticated`), et reste directement testable en SQL. |
| `app.apply_part_transaction()` | Trigger de mise à jour du stock | `SECURITY DEFINER`, `AFTER INSERT` sur `part_transactions`. Calcule une quantité signée selon `type` (receipt/return: +, usage/scrap: −, adjustment/cycle_count: valeur telle quelle) et met à jour `parts.quantity_on_hand`, ou `parts.quantity_reserved` pour le type `reservation`. Maintient un solde couramment lisible sans recalcul du grand livre à chaque lecture. |
| `app.log_work_order_status_change()` | Trigger d'historique de statut | `SECURITY DEFINER`, `AFTER INSERT OR UPDATE OF status` sur `work_orders`. Insère une ligne dans `work_order_status_history` à chaque création ou changement réel de statut, avec l'ancien statut (`null` à la création), le nouveau, et l'auteur (`auth.uid()`). |
| `app.handle_new_user()` | Trigger de provisionnement de profil | `SECURITY DEFINER`, déclenché par `trg_auth_user_created` `AFTER INSERT on auth.users`. Crée automatiquement la ligne `public.profiles` correspondante (nom complet et locale extraits de `raw_user_meta_data` si présents), `ON CONFLICT DO NOTHING`. |


-- Organizations, roles/permissions catalog, memberships, invitations, profiles.

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  locale_default text not null default 'fr' check (locale_default in ('fr', 'en')),
  timezone text not null default 'America/Toronto',
  logo_path text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_organizations_updated_at before update on public.organizations
  for each row execute function app.set_updated_at();

-- One row per user, 1:1 with auth.users. Holds cross-org display info.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  avatar_path text,
  locale text not null default 'fr' check (locale in ('fr', 'en')),
  phone text,
  is_external_contractor boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function app.set_updated_at();

create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, locale)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.raw_user_meta_data ->> 'locale', 'fr'))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

-- Roles: system roles are shared templates (org_id null); an org may also define
-- custom roles (org_id set). Both are referenced the same way by memberships.
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations (id) on delete cascade,
  key text not null,
  name_fr text not null,
  name_en text not null,
  description_fr text,
  description_en text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (org_id, key)
);
create unique index roles_system_key_unique on public.roles (key) where org_id is null;

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  module text not null,
  action text not null check (action in ('view', 'create', 'edit', 'approve', 'close', 'export', 'admin', 'delete')),
  label_fr text not null,
  label_en text not null
);

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role_id uuid not null references public.roles (id),
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  invited_email text,
  job_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create trigger trg_memberships_updated_at before update on public.memberships
  for each row execute function app.set_updated_at();
create index memberships_user_idx on public.memberships (user_id);
create index memberships_org_idx on public.memberships (org_id);

create table public.org_invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role_id uuid not null references public.roles (id),
  invited_by uuid not null references auth.users (id),
  token uuid not null default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days')
);
create index org_invitations_org_idx on public.org_invitations (org_id);
create unique index org_invitations_token_idx on public.org_invitations (token);

-- RLS is enabled and policies are created in 0004_organizations_and_roles_rls.sql,
-- once 0003's app.is_member_of()/app.is_org_admin() helpers exist (those
-- helpers are SQL-language functions validated against these tables at
-- CREATE FUNCTION time, so they must come after the tables, and policies
-- referencing them must come after the functions).

-- ---------------------------------------------------------------------------
-- Seed: system roles + full permission catalog
-- ---------------------------------------------------------------------------
insert into public.roles (org_id, key, name_fr, name_en, is_system) values
  (null, 'owner', 'Propriétaire', 'Owner', true),
  (null, 'admin', 'Administrateur', 'Administrator', true),
  (null, 'maintenance_manager', 'Gestionnaire de maintenance', 'Maintenance Manager', true),
  (null, 'planner', 'Planificateur', 'Planner', true),
  (null, 'supervisor', 'Superviseur', 'Supervisor', true),
  (null, 'technician', 'Technicien', 'Technician', true),
  (null, 'requester', 'Employé demandeur', 'Requester', true),
  (null, 'vendor', 'Fournisseur / Entrepreneur externe', 'Vendor / Contractor', true),
  (null, 'viewer', 'Lecteur / Auditeur', 'Viewer / Auditor', true);

insert into public.permissions (key, module, action, label_fr, label_en)
select module || '.' || action, module, action,
  initcap(replace(module, '_', ' ')) || ' — ' ||
    case action
      when 'view' then 'consulter' when 'create' then 'créer' when 'edit' then 'modifier'
      when 'approve' then 'approuver' when 'close' then 'clôturer' when 'export' then 'exporter'
      when 'admin' then 'administrer' when 'delete' then 'supprimer' end,
  initcap(replace(module, '_', ' ')) || ' — ' || action
from
  unnest(array['equipment','locations','requests','work_orders','procedures','pm_plans','meters',
               'parts','purchasing','suppliers','reports','automations','users','settings','rca']) as module,
  unnest(array['view','create','edit','approve','close','export','admin','delete']) as action;

-- Role → permission grants. Owner/Admin get everything; other roles get a
-- realistic, least-privilege subset that matches the role's job in the field.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.key in ('owner', 'admin') and r.org_id is null;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r, public.permissions p
where r.key = 'maintenance_manager' and r.org_id is null
  and p.key in (
    'equipment.view','equipment.create','equipment.edit','equipment.export',
    'locations.view','locations.create','locations.edit',
    'requests.view','requests.create','requests.edit','requests.approve',
    'work_orders.view','work_orders.create','work_orders.edit','work_orders.approve','work_orders.close','work_orders.export',
    'procedures.view','procedures.create','procedures.edit',
    'pm_plans.view','pm_plans.create','pm_plans.edit',
    'meters.view','meters.create','meters.edit',
    'parts.view','parts.create','parts.edit','parts.export',
    'purchasing.view','purchasing.create','purchasing.edit','purchasing.approve',
    'suppliers.view','suppliers.create','suppliers.edit',
    'reports.view','reports.export',
    'automations.view','automations.create','automations.edit',
    'users.view',
    'rca.view','rca.create','rca.edit'
  );

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r, public.permissions p
where r.key = 'planner' and r.org_id is null
  and p.key in (
    'equipment.view','locations.view',
    'requests.view','requests.edit','requests.approve',
    'work_orders.view','work_orders.create','work_orders.edit','work_orders.export',
    'procedures.view','procedures.create','procedures.edit',
    'pm_plans.view','pm_plans.create','pm_plans.edit',
    'meters.view','meters.edit',
    'parts.view','purchasing.view','purchasing.create',
    'suppliers.view','reports.view'
  );

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r, public.permissions p
where r.key = 'supervisor' and r.org_id is null
  and p.key in (
    'equipment.view','locations.view',
    'requests.view','requests.edit','requests.approve',
    'work_orders.view','work_orders.create','work_orders.edit','work_orders.close','work_orders.export',
    'procedures.view','procedures.create',
    'pm_plans.view','meters.view','meters.edit',
    'parts.view','parts.edit','purchasing.view',
    'suppliers.view','reports.view','reports.export',
    'users.view','rca.view','rca.create','rca.edit'
  );

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r, public.permissions p
where r.key = 'technician' and r.org_id is null
  and p.key in (
    'equipment.view','locations.view',
    'requests.view','requests.create',
    'work_orders.view','work_orders.edit',
    'procedures.view',
    'pm_plans.view','meters.view','meters.create',
    'parts.view','parts.edit',
    'reports.view'
  );

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r, public.permissions p
where r.key = 'requester' and r.org_id is null
  and p.key in ('requests.view','requests.create','equipment.view');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r, public.permissions p
where r.key = 'vendor' and r.org_id is null
  and p.key in ('work_orders.view','work_orders.edit','purchasing.view');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r, public.permissions p
where r.key = 'viewer' and r.org_id is null
  and p.action = 'view';

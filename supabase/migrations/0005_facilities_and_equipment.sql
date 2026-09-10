-- Facility hierarchy (site/building/zone/line/system, self-referencing) and
-- the equipment registry (with sub-equipment/components via parent_equipment_id).

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  parent_id uuid references public.locations (id) on delete cascade,
  type text not null check (type in ('site', 'building', 'zone', 'production_line', 'system', 'other')),
  name text not null,
  code text,
  address text,
  qr_code text unique,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger trg_locations_updated_at before update on public.locations
  for each row execute function app.set_updated_at();
create index locations_org_idx on public.locations (org_id);
create index locations_parent_idx on public.locations (parent_id);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  location_id uuid references public.locations (id) on delete set null,
  parent_equipment_id uuid references public.equipment (id) on delete cascade,
  name text not null,
  internal_code text,
  qr_code text unique,
  category text,
  status text not null default 'operational' check (status in ('operational', 'down', 'in_repair', 'decommissioned', 'standby')),
  criticality text not null default 'medium' check (criticality in ('low', 'medium', 'high', 'critical')),
  manufacturer text,
  model text,
  serial_number text,
  commissioned_at date,
  acquisition_cost numeric(14, 2),
  expected_lifetime_months integer,
  warranty_expires_at date,
  supplier_id uuid,
  owner_user_id uuid references auth.users (id),
  cumulative_cost numeric(14, 2) not null default 0,
  cumulative_downtime_minutes bigint not null default 0,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger trg_equipment_updated_at before update on public.equipment
  for each row execute function app.set_updated_at();
create index equipment_org_idx on public.equipment (org_id);
create index equipment_location_idx on public.equipment (location_id);
create index equipment_parent_idx on public.equipment (parent_equipment_id);
create index equipment_name_trgm_idx on public.equipment using gin (name gin_trgm_ops);

create table public.equipment_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  equipment_id uuid not null references public.equipment (id) on delete cascade,
  kind text not null check (kind in ('photo', 'manual', 'plan', 'document')),
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index equipment_documents_equipment_idx on public.equipment_documents (equipment_id);

create table public.equipment_moves (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  equipment_id uuid not null references public.equipment (id) on delete cascade,
  from_location_id uuid references public.locations (id),
  to_location_id uuid references public.locations (id),
  moved_by uuid references auth.users (id),
  moved_at timestamptz not null default now(),
  note text
);
create index equipment_moves_equipment_idx on public.equipment_moves (equipment_id);

-- ---------------------------------------------------------------------------
-- RLS — the pattern repeated for every tenant-scoped table from here on:
--   select: any active member of the org
--   insert/update/delete: member AND holds the module-specific permission
-- ---------------------------------------------------------------------------
alter table public.locations enable row level security;
alter table public.equipment enable row level security;
alter table public.equipment_documents enable row level security;
alter table public.equipment_moves enable row level security;

create policy "members view locations" on public.locations for select
  using (app.is_member_of(org_id));
create policy "members with permission create locations" on public.locations for insert
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'locations.create'));
create policy "members with permission edit locations" on public.locations for update
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'locations.edit'))
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'locations.edit'));
create policy "members with permission delete locations" on public.locations for delete
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'locations.delete'));

create policy "members view equipment" on public.equipment for select
  using (app.is_member_of(org_id));
create policy "members with permission create equipment" on public.equipment for insert
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'equipment.create'));
create policy "members with permission edit equipment" on public.equipment for update
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'equipment.edit'))
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'equipment.edit'));
create policy "members with permission delete equipment" on public.equipment for delete
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'equipment.delete'));

create policy "members view equipment documents" on public.equipment_documents for select
  using (app.is_member_of(org_id));
create policy "members with permission manage equipment documents" on public.equipment_documents for insert
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'equipment.edit'));
create policy "members with permission delete equipment documents" on public.equipment_documents for delete
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'equipment.edit'));

create policy "members view equipment moves" on public.equipment_moves for select
  using (app.is_member_of(org_id));
create policy "members with permission log equipment moves" on public.equipment_moves for insert
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'equipment.edit'));

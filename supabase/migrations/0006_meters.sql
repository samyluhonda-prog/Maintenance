-- Meters and their reading history (manual, API, or sensor sourced).

create table public.meters (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  equipment_id uuid not null references public.equipment (id) on delete cascade,
  name text not null,
  unit text not null,
  kind text not null default 'custom' check (kind in
    ('hours', 'kilometers', 'cycles', 'pressure', 'temperature', 'vibration', 'energy', 'weight', 'production', 'custom')),
  source text not null default 'manual' check (source in ('manual', 'api', 'sensor')),
  is_cumulative boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_meters_updated_at before update on public.meters
  for each row execute function app.set_updated_at();
create index meters_org_idx on public.meters (org_id);
create index meters_equipment_idx on public.meters (equipment_id);

create table public.meter_readings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  meter_id uuid not null references public.meters (id) on delete cascade,
  value numeric not null,
  recorded_at timestamptz not null default now(),
  recorded_by uuid references public.profiles (id),
  source text not null default 'manual' check (source in ('manual', 'api', 'sensor')),
  note text,
  created_at timestamptz not null default now()
);
create index meter_readings_meter_idx on public.meter_readings (meter_id, recorded_at desc);

alter table public.meters enable row level security;
alter table public.meter_readings enable row level security;

create policy "members view meters" on public.meters for select
  using (app.is_member_of(org_id));
create policy "members with permission create meters" on public.meters for insert
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'meters.create'));
create policy "members with permission edit meters" on public.meters for update
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'meters.edit'))
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'meters.edit'));
create policy "members with permission delete meters" on public.meters for delete
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'meters.delete'));

create policy "members view meter readings" on public.meter_readings for select
  using (app.is_member_of(org_id));
create policy "members with permission record meter readings" on public.meter_readings for insert
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'meters.create'));
create policy "members with permission edit meter readings" on public.meter_readings for update
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'meters.edit'))
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'meters.edit'));

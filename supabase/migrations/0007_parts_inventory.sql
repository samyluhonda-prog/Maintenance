-- Parts catalog, equipment compatibility, and stock transactions.
-- quantity_on_hand is a maintained running balance (updated by the
-- app.apply_part_transaction trigger below) rather than recomputed on every
-- read, so dashboards/low-stock checks stay cheap.

create table public.parts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  number text not null,
  name text not null,
  description text,
  category text,
  manufacturer text,
  manufacturer_part_number text,
  unit text not null default 'unit',
  unit_cost numeric(14, 2) not null default 0,
  storage_location_id uuid references public.locations (id),
  quantity_on_hand numeric not null default 0,
  quantity_reserved numeric not null default 0,
  quantity_on_order numeric not null default 0,
  min_threshold numeric not null default 0,
  optimal_level numeric,
  lead_time_days integer,
  primary_supplier_id uuid,
  qr_code text unique,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (org_id, number)
);
create trigger trg_parts_updated_at before update on public.parts
  for each row execute function app.set_updated_at();
create index parts_org_idx on public.parts (org_id);
create index parts_name_trgm_idx on public.parts using gin (name gin_trgm_ops);

create table public.equipment_parts (
  org_id uuid not null references public.organizations (id) on delete cascade,
  equipment_id uuid not null references public.equipment (id) on delete cascade,
  part_id uuid not null references public.parts (id) on delete cascade,
  primary key (equipment_id, part_id)
);

create table public.part_transactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  part_id uuid not null references public.parts (id) on delete cascade,
  type text not null check (type in
    ('receipt', 'usage', 'reservation', 'return', 'transfer', 'adjustment', 'cycle_count', 'scrap')),
  quantity numeric not null,
  unit_cost numeric(14, 2),
  work_order_id uuid,
  purchase_order_id uuid,
  from_location_id uuid references public.locations (id),
  to_location_id uuid references public.locations (id),
  performed_by uuid references auth.users (id),
  note text,
  created_at timestamptz not null default now()
);
create index part_transactions_part_idx on public.part_transactions (part_id, created_at desc);
create index part_transactions_wo_idx on public.part_transactions (work_order_id);

-- Keeps parts.quantity_* in sync with the immutable transaction ledger.
create or replace function app.apply_part_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_signed numeric;
begin
  v_signed := case new.type
    when 'receipt' then new.quantity
    when 'return' then new.quantity
    when 'usage' then -new.quantity
    when 'scrap' then -new.quantity
    when 'adjustment' then new.quantity
    when 'cycle_count' then new.quantity
    else 0
  end;

  if new.type = 'reservation' then
    update public.parts set quantity_reserved = quantity_reserved + new.quantity where id = new.part_id;
  else
    update public.parts set quantity_on_hand = quantity_on_hand + v_signed where id = new.part_id;
  end if;

  return new;
end;
$$;

create trigger trg_part_transactions_apply
  after insert on public.part_transactions
  for each row execute function app.apply_part_transaction();

alter table public.parts enable row level security;
alter table public.equipment_parts enable row level security;
alter table public.part_transactions enable row level security;

create policy "members view parts" on public.parts for select
  using (app.is_member_of(org_id));
create policy "members with permission create parts" on public.parts for insert
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'parts.create'));
create policy "members with permission edit parts" on public.parts for update
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'parts.edit'))
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'parts.edit'));
create policy "members with permission delete parts" on public.parts for delete
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'parts.delete'));

create policy "members view equipment parts" on public.equipment_parts for select
  using (app.is_member_of(org_id));
create policy "members with permission manage equipment parts" on public.equipment_parts for all
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'parts.edit'))
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'parts.edit'));

create policy "members view part transactions" on public.part_transactions for select
  using (app.is_member_of(org_id));
create policy "members with permission record part transactions" on public.part_transactions for insert
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'parts.edit'));

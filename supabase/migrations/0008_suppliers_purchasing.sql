-- Suppliers, contracts, and the purchasing workflow
-- (draft -> requested -> pending_approval -> approved -> ordered -> partially_received -> received -> closed).

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  notes text,
  rating numeric(3, 2) check (rating between 0 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger trg_suppliers_updated_at before update on public.suppliers
  for each row execute function app.set_updated_at();
create index suppliers_org_idx on public.suppliers (org_id);

alter table public.equipment add constraint equipment_supplier_fk foreign key (supplier_id) references public.suppliers (id) on delete set null;
alter table public.parts add constraint parts_primary_supplier_fk foreign key (primary_supplier_id) references public.suppliers (id) on delete set null;

create table public.supplier_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  title text not null,
  kind text not null default 'document' check (kind in ('contract', 'document')),
  storage_path text not null,
  start_date date,
  end_date date,
  value numeric(14, 2),
  created_at timestamptz not null default now()
);
create index supplier_documents_supplier_idx on public.supplier_documents (supplier_id);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  number text not null,
  supplier_id uuid references public.suppliers (id),
  status text not null default 'draft' check (status in
    ('draft', 'requested', 'pending_approval', 'approved', 'ordered', 'partially_received', 'received', 'closed', 'cancelled')),
  requested_by uuid references auth.users (id),
  approved_by uuid references auth.users (id),
  approved_at timestamptz,
  ordered_at timestamptz,
  expected_at date,
  subtotal numeric(14, 2) not null default 0,
  tax numeric(14, 2) not null default 0,
  shipping numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, number)
);
create trigger trg_purchase_orders_updated_at before update on public.purchase_orders
  for each row execute function app.set_updated_at();
create index purchase_orders_org_idx on public.purchase_orders (org_id);

create table public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  part_id uuid references public.parts (id),
  description text not null,
  quantity numeric not null,
  unit_cost numeric(14, 2) not null default 0,
  quantity_received numeric not null default 0,
  created_at timestamptz not null default now()
);
create index purchase_order_lines_po_idx on public.purchase_order_lines (purchase_order_id);

alter table public.part_transactions add constraint part_transactions_po_fk foreign key (purchase_order_id) references public.purchase_orders (id) on delete set null;

-- Receiving a line (fully or partially) both records stock via a receipt
-- transaction and rolls the PO status forward automatically.
create or replace function app.receive_purchase_order_line(p_line_id uuid, p_quantity numeric, p_performed_by uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_line public.purchase_order_lines%rowtype;
  v_po public.purchase_orders%rowtype;
  v_remaining numeric;
  v_total_ordered numeric;
  v_total_received numeric;
begin
  select * into v_line from public.purchase_order_lines where id = p_line_id;
  if not found then
    raise exception 'purchase order line % not found', p_line_id;
  end if;

  select * into v_po from public.purchase_orders where id = v_line.purchase_order_id;

  v_remaining := v_line.quantity - v_line.quantity_received;
  if p_quantity <= 0 or p_quantity > v_remaining then
    raise exception 'invalid receive quantity % (remaining %)', p_quantity, v_remaining;
  end if;

  update public.purchase_order_lines
    set quantity_received = quantity_received + p_quantity
    where id = p_line_id;

  if v_line.part_id is not null then
    insert into public.part_transactions (org_id, part_id, type, quantity, unit_cost, purchase_order_id, performed_by, note)
    values (v_line.org_id, v_line.part_id, 'receipt', p_quantity, v_line.unit_cost, v_po.id, p_performed_by, 'Réception BC ' || v_po.number);
  end if;

  select coalesce(sum(quantity), 0), coalesce(sum(quantity_received), 0)
    into v_total_ordered, v_total_received
    from public.purchase_order_lines where purchase_order_id = v_po.id;

  update public.purchase_orders
    set status = case
        when v_total_received >= v_total_ordered then 'received'
        when v_total_received > 0 then 'partially_received'
        else status
      end
    where id = v_po.id;
end;
$$;

grant execute on function app.receive_purchase_order_line(uuid, numeric, uuid) to authenticated;

alter table public.suppliers enable row level security;
alter table public.supplier_documents enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_lines enable row level security;

create policy "members view suppliers" on public.suppliers for select
  using (app.is_member_of(org_id));
create policy "members with permission create suppliers" on public.suppliers for insert
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'suppliers.create'));
create policy "members with permission edit suppliers" on public.suppliers for update
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'suppliers.edit'))
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'suppliers.edit'));
create policy "members with permission delete suppliers" on public.suppliers for delete
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'suppliers.delete'));

create policy "members view supplier documents" on public.supplier_documents for select
  using (app.is_member_of(org_id));
create policy "members with permission manage supplier documents" on public.supplier_documents for all
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'suppliers.edit'))
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'suppliers.edit'));

create policy "members view purchase orders" on public.purchase_orders for select
  using (app.is_member_of(org_id));
create policy "members with permission create purchase orders" on public.purchase_orders for insert
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'purchasing.create'));
create policy "members with permission edit purchase orders" on public.purchase_orders for update
  using (
    app.is_member_of(org_id) and (
      app.has_permission(org_id, 'purchasing.edit')
      or (status = 'pending_approval' and app.has_permission(org_id, 'purchasing.approve'))
    )
  )
  with check (app.is_member_of(org_id));
create policy "members with permission delete purchase orders" on public.purchase_orders for delete
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'purchasing.delete'));

create policy "members view purchase order lines" on public.purchase_order_lines for select
  using (app.is_member_of(org_id));
create policy "members with permission manage purchase order lines" on public.purchase_order_lines for all
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'purchasing.edit'))
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'purchasing.edit'));

-- Maintenance requests (portal) and the full work order lifecycle.

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  number text not null,
  title text not null,
  description text,
  equipment_id uuid references public.equipment (id),
  location_id uuid references public.locations (id),
  category text,
  urgency text not null default 'medium' check (urgency in ('low', 'medium', 'high', 'critical')),
  is_equipment_down boolean not null default false,
  status text not null default 'draft' check (status in
    ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'converted')),
  requested_by uuid not null references public.profiles (id),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  review_note text,
  converted_work_order_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, number)
);
create trigger trg_requests_updated_at before update on public.requests
  for each row execute function app.set_updated_at();
create index requests_org_idx on public.requests (org_id);
create index requests_status_idx on public.requests (org_id, status);

create table public.request_attachments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  request_id uuid not null references public.requests (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index request_attachments_request_idx on public.request_attachments (request_id);

create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  number text not null,
  title text not null,
  description text,
  type text not null default 'corrective' check (type in
    ('preventive', 'corrective', 'inspection', 'safety', 'improvement', 'other')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'draft' check (status in
    ('draft', 'open', 'planned', 'assigned', 'in_progress', 'on_hold', 'completed', 'to_review', 'closed', 'cancelled', 'skipped')),
  equipment_id uuid references public.equipment (id),
  location_id uuid references public.locations (id),
  request_id uuid references public.requests (id),
  parent_work_order_id uuid references public.work_orders (id) on delete set null,
  pm_plan_id uuid,
  procedure_template_id uuid references public.procedure_templates (id),
  procedure_run_id uuid references public.procedure_runs (id),
  primary_assignee_id uuid references public.profiles (id),
  team_id uuid,
  created_by uuid references public.profiles (id),
  scheduled_start timestamptz,
  due_at timestamptz,
  estimate_hours numeric(8, 2),
  actual_hours numeric(8, 2) not null default 0,
  downtime_minutes integer not null default 0,
  labor_cost numeric(14, 2) not null default 0,
  parts_cost numeric(14, 2) not null default 0,
  external_cost numeric(14, 2) not null default 0,
  requires_lockout boolean not null default false,
  safety_notes text,
  failure_cause text,
  resolution text,
  follow_up_required boolean not null default false,
  follow_up_notes text,
  closed_at timestamptz,
  closed_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (org_id, number)
);
create trigger trg_work_orders_updated_at before update on public.work_orders
  for each row execute function app.set_updated_at();
create index work_orders_org_idx on public.work_orders (org_id);
create index work_orders_status_idx on public.work_orders (org_id, status);
create index work_orders_equipment_idx on public.work_orders (equipment_id);
create index work_orders_assignee_idx on public.work_orders (primary_assignee_id);
create index work_orders_due_idx on public.work_orders (org_id, due_at);

alter table public.requests add constraint requests_converted_wo_fk foreign key (converted_work_order_id) references public.work_orders (id) on delete set null;
alter table public.part_transactions add constraint part_transactions_wo_fk foreign key (work_order_id) references public.work_orders (id) on delete set null;

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
alter table public.work_orders add constraint work_orders_team_fk foreign key (team_id) references public.teams (id) on delete set null;

create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  primary key (team_id, user_id)
);

create table public.work_order_assignees (
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  role_on_wo text default 'technician',
  primary key (work_order_id, user_id)
);
create index work_order_assignees_user_idx on public.work_order_assignees (user_id);

create table public.work_order_tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  label text not null,
  is_done boolean not null default false,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
create index work_order_tasks_wo_idx on public.work_order_tasks (work_order_id, order_index);

create table public.work_order_parts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  part_id uuid not null references public.parts (id),
  quantity_planned numeric not null default 0,
  quantity_used numeric not null default 0,
  unit_cost numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);
create index work_order_parts_wo_idx on public.work_order_parts (work_order_id);

create table public.work_order_time_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  started_at timestamptz not null,
  ended_at timestamptz,
  minutes integer,
  labor_rate numeric(10, 2),
  note text,
  created_at timestamptz not null default now()
);
create index work_order_time_logs_wo_idx on public.work_order_time_logs (work_order_id);

create table public.work_order_comments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  body text not null,
  mentioned_user_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index work_order_comments_wo_idx on public.work_order_comments (work_order_id, created_at);

create table public.work_order_attachments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index work_order_attachments_wo_idx on public.work_order_attachments (work_order_id);

create table public.work_order_signatures (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  signed_at timestamptz not null default now(),
  signature_path text not null
);

create table public.work_order_status_history (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references public.profiles (id),
  changed_at timestamptz not null default now(),
  note text
);
create index work_order_status_history_wo_idx on public.work_order_status_history (work_order_id, changed_at);

create or replace function app.log_work_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.work_order_status_history (org_id, work_order_id, from_status, to_status, changed_by)
    values (new.org_id, new.id, case when tg_op = 'INSERT' then null else old.status end, new.status, auth.uid());
  end if;
  return new;
end;
$$;
create trigger trg_work_orders_status_history
  after insert or update of status on public.work_orders
  for each row execute function app.log_work_order_status_change();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.requests enable row level security;
alter table public.request_attachments enable row level security;
alter table public.work_orders enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.work_order_assignees enable row level security;
alter table public.work_order_tasks enable row level security;
alter table public.work_order_parts enable row level security;
alter table public.work_order_time_logs enable row level security;
alter table public.work_order_comments enable row level security;
alter table public.work_order_attachments enable row level security;
alter table public.work_order_signatures enable row level security;
alter table public.work_order_status_history enable row level security;

create policy "members view requests" on public.requests for select
  using (app.is_member_of(org_id));
create policy "members can submit requests" on public.requests for insert
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'requests.create') and requested_by = auth.uid());
create policy "owners or reviewers can edit requests" on public.requests for update
  using (
    app.is_member_of(org_id) and (
      (requested_by = auth.uid() and status = 'draft')
      or app.has_permission(org_id, 'requests.approve')
      or app.has_permission(org_id, 'requests.edit')
    )
  )
  with check (app.is_member_of(org_id));

create policy "members view request attachments" on public.request_attachments for select
  using (app.is_member_of(org_id));
create policy "requesters attach files to their requests" on public.request_attachments for insert
  with check (
    app.is_member_of(org_id) and exists (
      select 1 from public.requests r where r.id = request_attachments.request_id and r.requested_by = auth.uid()
    )
  );

-- Work orders: visible to any member with the view permission, OR to a user
-- directly assigned to it (covers technicians/vendors scoped to their own jobs
-- without a blanket "work_orders.view" grant).
create policy "members with visibility view work orders" on public.work_orders for select
  using (
    app.is_member_of(org_id) and (
      app.has_permission(org_id, 'work_orders.view')
      or primary_assignee_id = auth.uid()
      or exists (select 1 from public.work_order_assignees wa where wa.work_order_id = work_orders.id and wa.user_id = auth.uid())
    )
  );
create policy "members with permission create work orders" on public.work_orders for insert
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'work_orders.create'));
create policy "members with permission or assignees edit work orders" on public.work_orders for update
  using (
    app.is_member_of(org_id) and (
      app.has_permission(org_id, 'work_orders.edit')
      or primary_assignee_id = auth.uid()
      or exists (select 1 from public.work_order_assignees wa where wa.work_order_id = work_orders.id and wa.user_id = auth.uid())
    )
  )
  with check (app.is_member_of(org_id));
create policy "members with permission delete work orders" on public.work_orders for delete
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'work_orders.delete'));

create policy "members view teams" on public.teams for select using (app.is_member_of(org_id));
create policy "admins manage teams" on public.teams for all
  using (app.is_org_admin(org_id)) with check (app.is_org_admin(org_id));
create policy "members view team members" on public.team_members for select using (app.is_member_of(org_id));
create policy "admins manage team members" on public.team_members for all
  using (app.is_org_admin(org_id)) with check (app.is_org_admin(org_id));

create policy "members view wo assignees" on public.work_order_assignees for select using (app.is_member_of(org_id));
create policy "members with permission manage wo assignees" on public.work_order_assignees for all
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'work_orders.edit'))
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'work_orders.edit'));

create policy "members view wo tasks" on public.work_order_tasks for select using (app.is_member_of(org_id));
create policy "assignees manage wo tasks" on public.work_order_tasks for all
  using (
    app.is_member_of(org_id) and exists (
      select 1 from public.work_orders wo where wo.id = work_order_tasks.work_order_id
        and (wo.primary_assignee_id = auth.uid() or app.has_permission(org_id, 'work_orders.edit')
             or exists (select 1 from public.work_order_assignees wa where wa.work_order_id = wo.id and wa.user_id = auth.uid()))
    )
  )
  with check (app.is_member_of(org_id));

create policy "members view wo parts" on public.work_order_parts for select using (app.is_member_of(org_id));
create policy "assignees manage wo parts" on public.work_order_parts for all
  using (
    app.is_member_of(org_id) and exists (
      select 1 from public.work_orders wo where wo.id = work_order_parts.work_order_id
        and (wo.primary_assignee_id = auth.uid() or app.has_permission(org_id, 'work_orders.edit')
             or exists (select 1 from public.work_order_assignees wa where wa.work_order_id = wo.id and wa.user_id = auth.uid()))
    )
  )
  with check (app.is_member_of(org_id));

create policy "members view wo time logs" on public.work_order_time_logs for select using (app.is_member_of(org_id));
create policy "users manage their own time logs" on public.work_order_time_logs for all
  using (app.is_member_of(org_id) and (user_id = auth.uid() or app.has_permission(org_id, 'work_orders.edit')))
  with check (app.is_member_of(org_id) and (user_id = auth.uid() or app.has_permission(org_id, 'work_orders.edit')));

create policy "members view wo comments" on public.work_order_comments for select using (app.is_member_of(org_id));
create policy "members can comment on visible work orders" on public.work_order_comments for insert
  with check (app.is_member_of(org_id) and user_id = auth.uid());

create policy "members view wo attachments" on public.work_order_attachments for select using (app.is_member_of(org_id));
create policy "members can attach files to work orders" on public.work_order_attachments for insert
  with check (app.is_member_of(org_id));

create policy "members view wo signatures" on public.work_order_signatures for select using (app.is_member_of(org_id));
create policy "users sign their own work" on public.work_order_signatures for insert
  with check (app.is_member_of(org_id) and user_id = auth.uid());

create policy "members view wo status history" on public.work_order_status_history for select using (app.is_member_of(org_id));

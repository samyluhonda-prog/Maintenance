-- Preventive maintenance plans: calendar-based, meter-based, or condition-based
-- triggers, each capable of generating scheduled work orders ahead of time.

create table public.pm_plans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  equipment_id uuid not null references public.equipment (id) on delete cascade,
  procedure_template_id uuid references public.procedure_templates (id),
  wo_title text not null,
  wo_description text,
  wo_priority text not null default 'medium' check (wo_priority in ('low', 'medium', 'high', 'critical')),
  wo_estimate_hours numeric(8, 2),
  default_assignee_id uuid references auth.users (id),
  lead_time_days integer not null default 0,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_pm_plans_updated_at before update on public.pm_plans
  for each row execute function app.set_updated_at();
create index pm_plans_org_idx on public.pm_plans (org_id);
create index pm_plans_equipment_idx on public.pm_plans (equipment_id);

alter table public.work_orders add constraint work_orders_pm_plan_fk foreign key (pm_plan_id) references public.pm_plans (id) on delete set null;

-- A plan can carry several simultaneous triggers (e.g. "every 6 months OR
-- every 2000 engine-hours, whichever comes first").
create table public.pm_triggers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  pm_plan_id uuid not null references public.pm_plans (id) on delete cascade,
  kind text not null check (kind in ('calendar', 'meter', 'condition')),
  -- calendar
  frequency_unit text check (frequency_unit in ('day', 'week', 'month', 'year', 'custom')),
  frequency_value integer,
  days_of_week integer[],
  fixed_interval boolean not null default true, -- true = fixed calendar cadence, false = floating from last completion
  tolerance_days integer not null default 0,
  -- meter
  meter_id uuid references public.meters (id),
  meter_interval numeric,
  meter_operator text check (meter_operator in ('gte', 'lte', 'eq')),
  meter_threshold numeric,
  -- condition (custom, e.g. API/sensor-fed)
  condition_expression jsonb,
  is_active boolean not null default true,
  last_generated_at timestamptz,
  last_generated_meter_value numeric,
  next_due_at timestamptz,
  created_at timestamptz not null default now()
);
create index pm_triggers_plan_idx on public.pm_triggers (pm_plan_id);
create index pm_triggers_next_due_idx on public.pm_triggers (org_id, next_due_at) where is_active;

create table public.pm_generated_work_orders (
  pm_trigger_id uuid not null references public.pm_triggers (id) on delete cascade,
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  occurrence_date date not null,
  generated_at timestamptz not null default now(),
  primary key (pm_trigger_id, work_order_id)
);

-- Generates the next work order for a calendar trigger and advances
-- next_due_at. Called by the scheduled Edge Function (see docs/AUTOMATIONS.md);
-- exposed as a plain function so it is also unit-testable directly in SQL.
create or replace function app.generate_pm_work_order(p_trigger_id uuid, p_occurrence date)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_trigger public.pm_triggers%rowtype;
  v_plan public.pm_plans%rowtype;
  v_wo_id uuid;
  v_number text;
begin
  select * into v_trigger from public.pm_triggers where id = p_trigger_id;
  select * into v_plan from public.pm_plans where id = v_trigger.pm_plan_id;

  v_number := app.next_number(v_plan.org_id, 'work_order', 'WO');

  insert into public.work_orders (
    org_id, number, title, description, type, priority, status,
    equipment_id, pm_plan_id, procedure_template_id, primary_assignee_id,
    scheduled_start, due_at, estimate_hours, created_by
  ) values (
    v_plan.org_id, v_number, v_plan.wo_title, v_plan.wo_description, 'preventive', v_plan.wo_priority, 'planned',
    v_plan.equipment_id, v_plan.id, v_plan.procedure_template_id, v_plan.default_assignee_id,
    p_occurrence::timestamptz - (v_plan.lead_time_days || ' days')::interval, p_occurrence::timestamptz,
    v_plan.wo_estimate_hours, v_plan.created_by
  ) returning id into v_wo_id;

  insert into public.pm_generated_work_orders (pm_trigger_id, work_order_id, org_id, occurrence_date)
  values (p_trigger_id, v_wo_id, v_plan.org_id, p_occurrence);

  update public.pm_triggers set last_generated_at = now() where id = p_trigger_id;

  return v_wo_id;
end;
$$;

-- Invoked by the scheduled job that turns due PM triggers into work orders
-- (see docs/AUTOMATIONS.md) using the service role, which bypasses RLS —
-- hence execute is granted only to service_role, not authenticated.
grant execute on function app.generate_pm_work_order(uuid, date) to service_role;

alter table public.pm_plans enable row level security;
alter table public.pm_triggers enable row level security;
alter table public.pm_generated_work_orders enable row level security;

create policy "members view pm plans" on public.pm_plans for select using (app.is_member_of(org_id));
create policy "members with permission create pm plans" on public.pm_plans for insert
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'pm_plans.create'));
create policy "members with permission edit pm plans" on public.pm_plans for update
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'pm_plans.edit'))
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'pm_plans.edit'));
create policy "members with permission delete pm plans" on public.pm_plans for delete
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'pm_plans.delete'));

create policy "members view pm triggers" on public.pm_triggers for select using (app.is_member_of(org_id));
create policy "members with permission manage pm triggers" on public.pm_triggers for all
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'pm_plans.edit'))
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'pm_plans.edit'));

create policy "members view pm generated work orders" on public.pm_generated_work_orders for select
  using (app.is_member_of(org_id));

-- Rule engine: IF trigger_event (+ jsonb conditions) THEN actions (jsonb array).
-- Evaluated server-side (Edge Function / route handler using the service role,
-- see docs/AUTOMATIONS.md) so it can act across tables regardless of the
-- triggering user's own RLS visibility; every automation run is still logged
-- per-org for auditability and is readable by members like any other data.

create table public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  trigger_event text not null check (trigger_event in (
    'request.created', 'request.critical_created',
    'equipment.status_changed', 'equipment.repeat_failure',
    'work_order.created', 'work_order.completed', 'work_order.overdue', 'work_order.unassigned_timeout',
    'procedure.failed', 'meter.threshold_reached', 'part.below_min'
  )),
  conditions jsonb not null default '{}'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_automation_rules_updated_at before update on public.automation_rules
  for each row execute function app.set_updated_at();
create index automation_rules_org_idx on public.automation_rules (org_id, trigger_event) where is_active;

create table public.automation_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  rule_id uuid references public.automation_rules (id) on delete set null,
  triggered_at timestamptz not null default now(),
  context jsonb not null default '{}'::jsonb,
  actions_taken jsonb not null default '[]'::jsonb,
  success boolean not null default true,
  error text
);
create index automation_logs_org_idx on public.automation_logs (org_id, triggered_at desc);

alter table public.automation_rules enable row level security;
alter table public.automation_logs enable row level security;

create policy "members view automation rules" on public.automation_rules for select using (app.is_member_of(org_id));
create policy "members with permission manage automation rules" on public.automation_rules for all
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'automations.edit'))
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'automations.edit'));

create policy "members view automation logs" on public.automation_logs for select using (app.is_member_of(org_id));

-- Visual procedure builder (templates -> ordered fields, with sections and
-- conditional logic in `config`) and execution runs (answers + pass/fail scoring).

create table public.procedure_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  category text,
  version integer not null default 1,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger trg_procedure_templates_updated_at before update on public.procedure_templates
  for each row execute function app.set_updated_at();
create index procedure_templates_org_idx on public.procedure_templates (org_id);

-- type: 'section' groups following fields visually; every other type is a
-- concrete input. `config` carries type-specific shape, e.g.
--   multiple_choice: { options: string[] }
--   number / meter_reading: { unit, min, max }
--   pass_fail / yesno / checkbox: { required: boolean }
--   any field: { condition: { field_id, operator, value } } to show it only
--     when a prior field's answer matches (simple conditional logic).
create table public.procedure_fields (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  template_id uuid not null references public.procedure_templates (id) on delete cascade,
  section_id uuid references public.procedure_fields (id) on delete cascade,
  order_index integer not null default 0,
  type text not null check (type in
    ('section', 'text', 'instructions', 'checkbox', 'yesno', 'multiple_choice', 'number',
     'free_text', 'datetime', 'meter_reading', 'pass_fail', 'photo', 'signature', 'file', 'amount_range')),
  label text not null,
  is_required boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index procedure_fields_template_idx on public.procedure_fields (template_id, order_index);

create table public.procedure_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  template_id uuid not null references public.procedure_templates (id),
  work_order_id uuid,
  equipment_id uuid references public.equipment (id),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'failed')),
  started_by uuid references public.profiles (id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  score numeric,
  created_at timestamptz not null default now()
);
create index procedure_runs_org_idx on public.procedure_runs (org_id);
create index procedure_runs_wo_idx on public.procedure_runs (work_order_id);

create table public.procedure_run_answers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  run_id uuid not null references public.procedure_runs (id) on delete cascade,
  field_id uuid not null references public.procedure_fields (id),
  value jsonb,
  flagged boolean not null default false,
  created_at timestamptz not null default now(),
  unique (run_id, field_id)
);
create index procedure_run_answers_run_idx on public.procedure_run_answers (run_id);

alter table public.procedure_templates enable row level security;
alter table public.procedure_fields enable row level security;
alter table public.procedure_runs enable row level security;
alter table public.procedure_run_answers enable row level security;

create policy "members view procedure templates" on public.procedure_templates for select
  using (app.is_member_of(org_id));
create policy "members with permission create procedure templates" on public.procedure_templates for insert
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'procedures.create'));
create policy "members with permission edit procedure templates" on public.procedure_templates for update
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'procedures.edit'))
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'procedures.edit'));
create policy "members with permission delete procedure templates" on public.procedure_templates for delete
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'procedures.delete'));

create policy "members view procedure fields" on public.procedure_fields for select
  using (app.is_member_of(org_id));
create policy "members with permission manage procedure fields" on public.procedure_fields for all
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'procedures.edit'))
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'procedures.edit'));

create policy "members view procedure runs" on public.procedure_runs for select
  using (app.is_member_of(org_id));
create policy "members can start procedure runs" on public.procedure_runs for insert
  with check (app.is_member_of(org_id));
create policy "members can update their own procedure runs" on public.procedure_runs for update
  using (app.is_member_of(org_id) and (started_by = auth.uid() or app.has_permission(org_id, 'procedures.edit')))
  with check (app.is_member_of(org_id));

create policy "members view procedure run answers" on public.procedure_run_answers for select
  using (app.is_member_of(org_id));
create policy "members can answer their own procedure runs" on public.procedure_run_answers for all
  using (
    app.is_member_of(org_id) and exists (
      select 1 from public.procedure_runs r
      where r.id = procedure_run_answers.run_id
        and (r.started_by = auth.uid() or app.has_permission(org_id, 'procedures.edit'))
    )
  )
  with check (app.is_member_of(org_id));

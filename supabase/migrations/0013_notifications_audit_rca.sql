-- Notifications, immutable audit log, and reliability / root-cause-analysis module.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

create table public.notification_preferences (
  user_id uuid not null references auth.users (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  channel text not null check (channel in ('inapp', 'email', 'push')),
  category text not null,
  enabled boolean not null default true,
  primary key (user_id, org_id, channel, category)
);

-- Append-only. No update/delete policy is defined for any role other than
-- service_role, which is the only writer that matters for compliance trails.
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  actor_id uuid references auth.users (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_org_idx on public.audit_log (org_id, created_at desc);
create index audit_log_entity_idx on public.audit_log (org_id, entity_type, entity_id);

create table public.failure_categories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null
);

create table public.failure_modes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  category_id uuid references public.failure_categories (id) on delete cascade,
  name text not null
);

create table public.rca_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  work_order_id uuid references public.work_orders (id),
  equipment_id uuid not null references public.equipment (id),
  title text not null,
  problem_statement text not null,
  failure_mode_id uuid references public.failure_modes (id),
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_rca_records_updated_at before update on public.rca_records
  for each row execute function app.set_updated_at();
create index rca_records_org_idx on public.rca_records (org_id);
create index rca_records_equipment_idx on public.rca_records (equipment_id);

create table public.rca_five_whys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  rca_id uuid not null references public.rca_records (id) on delete cascade,
  order_index integer not null,
  question text not null,
  answer text
);
create index rca_five_whys_rca_idx on public.rca_five_whys (rca_id, order_index);

create table public.rca_causes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  rca_id uuid not null references public.rca_records (id) on delete cascade,
  category text not null check (category in ('method', 'machine', 'material', 'man', 'measurement', 'environment')),
  description text not null
);
create index rca_causes_rca_idx on public.rca_causes (rca_id);

create table public.corrective_actions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  rca_id uuid not null references public.rca_records (id) on delete cascade,
  description text not null,
  owner_id uuid references auth.users (id),
  due_date date,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'verified')),
  verified_by uuid references auth.users (id),
  verified_at timestamptz,
  effectiveness_note text,
  created_at timestamptz not null default now()
);
create index corrective_actions_rca_idx on public.corrective_actions (rca_id);

-- Generic comments/attachments usable by any entity type that doesn't already
-- have a dedicated comments/attachments table (equipment, requests, parts, ...).
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  user_id uuid not null references auth.users (id),
  body text not null,
  mentioned_user_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index comments_entity_idx on public.comments (org_id, entity_type, entity_id, created_at);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index attachments_entity_idx on public.attachments (org_id, entity_type, entity_id);

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.audit_log enable row level security;
alter table public.failure_categories enable row level security;
alter table public.failure_modes enable row level security;
alter table public.rca_records enable row level security;
alter table public.rca_five_whys enable row level security;
alter table public.rca_causes enable row level security;
alter table public.corrective_actions enable row level security;
alter table public.comments enable row level security;
alter table public.attachments enable row level security;

create policy "users view their own notifications" on public.notifications for select using (user_id = auth.uid());
create policy "users update their own notifications" on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "users manage their own notification preferences" on public.notification_preferences for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "admins view audit log" on public.audit_log for select
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'settings.admin'));

create policy "members view failure categories" on public.failure_categories for select using (app.is_member_of(org_id));
create policy "members with permission manage failure categories" on public.failure_categories for all
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'rca.edit'))
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'rca.edit'));

create policy "members view failure modes" on public.failure_modes for select using (app.is_member_of(org_id));
create policy "members with permission manage failure modes" on public.failure_modes for all
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'rca.edit'))
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'rca.edit'));

create policy "members view rca records" on public.rca_records for select using (app.is_member_of(org_id));
create policy "members with permission manage rca records" on public.rca_records for all
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'rca.edit'))
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'rca.edit'));

create policy "members view rca five whys" on public.rca_five_whys for select using (app.is_member_of(org_id));
create policy "members with permission manage rca five whys" on public.rca_five_whys for all
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'rca.edit'))
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'rca.edit'));

create policy "members view rca causes" on public.rca_causes for select using (app.is_member_of(org_id));
create policy "members with permission manage rca causes" on public.rca_causes for all
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'rca.edit'))
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'rca.edit'));

create policy "members view corrective actions" on public.corrective_actions for select using (app.is_member_of(org_id));
create policy "members with permission manage corrective actions" on public.corrective_actions for all
  using (app.is_member_of(org_id) and app.has_permission(org_id, 'rca.edit'))
  with check (app.is_member_of(org_id) and app.has_permission(org_id, 'rca.edit'));

create policy "members view comments" on public.comments for select using (app.is_member_of(org_id));
create policy "members can post comments" on public.comments for insert
  with check (app.is_member_of(org_id) and user_id = auth.uid());
create policy "authors can edit their own comments" on public.comments for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "authors can delete their own comments" on public.comments for delete using (user_id = auth.uid());

create policy "members view attachments" on public.attachments for select using (app.is_member_of(org_id));
create policy "members can upload attachments" on public.attachments for insert with check (app.is_member_of(org_id));
create policy "uploaders can delete their own attachments" on public.attachments for delete
  using (app.is_member_of(org_id) and uploaded_by = auth.uid());

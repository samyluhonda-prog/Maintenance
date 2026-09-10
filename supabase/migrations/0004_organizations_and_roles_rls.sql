-- Enable RLS and define policies for the organizations/roles/memberships
-- tables created in 0002, now that 0003's helper functions exist.

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.memberships enable row level security;
alter table public.org_invitations enable row level security;

create policy "members can view their organizations"
  on public.organizations for select
  using (app.is_member_of(id));

create policy "admins can update their organization"
  on public.organizations for update
  using (app.is_org_admin(id))
  with check (app.is_org_admin(id));

create policy "authenticated users can create an organization"
  on public.organizations for insert
  with check (auth.uid() is not null);

create policy "users can view their own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "org-mates can view basic profile info"
  on public.profiles for select
  using (
    exists (
      select 1 from public.memberships mine
      join public.memberships theirs on theirs.org_id = mine.org_id
      where mine.user_id = auth.uid()
        and mine.status = 'active'
        and theirs.user_id = public.profiles.id
        and theirs.status = 'active'
    )
  );

create policy "users can update their own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "users can insert their own profile"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "everyone can read system roles"
  on public.roles for select
  using (org_id is null or app.is_member_of(org_id));

create policy "admins manage custom roles"
  on public.roles for all
  using (org_id is not null and app.is_org_admin(org_id))
  with check (org_id is not null and app.is_org_admin(org_id));

create policy "permissions catalog is readable by authenticated users"
  on public.permissions for select
  using (auth.uid() is not null);

create policy "role_permissions readable for visible roles"
  on public.role_permissions for select
  using (
    exists (
      select 1 from public.roles r
      where r.id = role_permissions.role_id
        and (r.org_id is null or app.is_member_of(r.org_id))
    )
  );

create policy "admins manage custom role permissions"
  on public.role_permissions for all
  using (
    exists (
      select 1 from public.roles r
      where r.id = role_permissions.role_id
        and r.org_id is not null
        and app.is_org_admin(r.org_id)
    )
  )
  with check (
    exists (
      select 1 from public.roles r
      where r.id = role_permissions.role_id
        and r.org_id is not null
        and app.is_org_admin(r.org_id)
    )
  );

create policy "members can view memberships in their orgs"
  on public.memberships for select
  using (app.is_member_of(org_id));

create policy "admins manage memberships"
  on public.memberships for insert
  with check (app.is_org_admin(org_id));

create policy "admins update memberships"
  on public.memberships for update
  using (app.is_org_admin(org_id))
  with check (app.is_org_admin(org_id));

create policy "admins delete memberships"
  on public.memberships for delete
  using (app.is_org_admin(org_id));

create policy "admins manage invitations"
  on public.org_invitations for all
  using (app.is_org_admin(org_id))
  with check (app.is_org_admin(org_id));

-- Bootstraps a brand-new organization: the "admins manage memberships" policy
-- above can't apply to a fresh org's very first membership (there is no admin
-- yet to satisfy it), so this SECURITY DEFINER function creates the org and
-- inserts the creator as its Owner atomically, bypassing that chicken-and-egg
-- problem the same way Supabase's own examples do it.
create or replace function app.create_organization_with_owner(
  p_name text, p_slug text, p_locale text default 'fr', p_timezone text default 'America/Toronto'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_owner_role_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  insert into public.organizations (name, slug, locale_default, timezone)
  values (p_name, p_slug, p_locale, p_timezone)
  returning id into v_org_id;

  select id into v_owner_role_id from public.roles where key = 'owner' and org_id is null;

  insert into public.memberships (org_id, user_id, role_id, status)
  values (v_org_id, auth.uid(), v_owner_role_id, 'active');

  return v_org_id;
end;
$$;

grant execute on function app.create_organization_with_owner(text, text, text, text) to authenticated;

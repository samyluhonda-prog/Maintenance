-- Multi-tenant RLS helper functions.
--
-- Every tenant-scoped table's RLS policy calls into these instead of
-- re-implementing the membership lookup, so isolation logic lives in one
-- place. They are SECURITY DEFINER and owned by the migration-running role
-- (which owns `memberships`/`roles`/`permissions`/`role_permissions`), so
-- they bypass RLS on those tables internally — this is the standard,
-- Supabase-documented way to avoid the recursive-RLS trap where a policy on
-- `memberships` would otherwise need to query `memberships` through the
-- normal (RLS-checked) path to check itself.
--
-- Placed after 0002's tables: Postgres validates a SQL-language function's
-- body (including catalog lookups for the tables/columns it queries) at
-- CREATE FUNCTION time, unlike PL/pgSQL which only resolves them at first
-- call — so these must be created once `memberships`/`roles`/`permissions`
-- exist.

create or replace function app.current_org_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select org_id
  from public.memberships
  where user_id = auth.uid()
    and status = 'active';
$$;

create or replace function app.is_member_of(target_org uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships
    where user_id = auth.uid()
      and org_id = target_org
      and status = 'active'
  );
$$;

create or replace function app.has_permission(target_org uuid, perm_key text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    join public.role_permissions rp on rp.role_id = m.role_id
    join public.permissions p on p.id = rp.permission_id
    where m.user_id = auth.uid()
      and m.org_id = target_org
      and m.status = 'active'
      and p.key = perm_key
  );
$$;

-- Convenience: true if the current user is Owner/Admin of the org (used for a
-- handful of admin-only screens instead of a fine-grained permission key).
create or replace function app.is_org_admin(target_org uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    join public.roles r on r.id = m.role_id
    where m.user_id = auth.uid()
      and m.org_id = target_org
      and m.status = 'active'
      and r.key in ('owner', 'admin')
  );
$$;

grant execute on all functions in schema app to authenticated, anon, service_role;

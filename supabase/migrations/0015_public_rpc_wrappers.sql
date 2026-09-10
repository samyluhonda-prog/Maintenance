-- Thin `public` schema wrappers around the `app.*` functions that client code
-- calls via `supabase.rpc(...)`.
--
-- Supabase's PostgREST data API only exposes the `public` (and
-- `graphql_public`) schemas by default — calling `app.foo` directly from
-- supabase-js would 404 unless a project owner opts into exposing the `app`
-- schema in the dashboard, which is an extra manual deployment step we don't
-- want this app to depend on. Keeping the real implementations in `app` (so
-- triggers and other SQL functions can call them without an API round trip)
-- and exposing only these thin, purpose-built wrappers in `public` keeps the
-- surface small and avoids that dependency entirely.

-- Used wherever client code needs a human-friendly sequential number
-- (work orders, purchase orders, requests, ...) at creation time.
create or replace function public.next_number(p_org_id uuid, p_key text, p_prefix text)
returns text
language sql
security invoker
set search_path = public, app
as $$
  select app.next_number(p_org_id, p_key, p_prefix);
$$;
grant execute on function public.next_number(uuid, text, text) to authenticated;

create or replace function public.create_organization_with_owner(
  p_name text, p_slug text, p_locale text default 'fr', p_timezone text default 'America/Toronto'
)
returns uuid
language sql
security invoker
set search_path = public, app
as $$
  select app.create_organization_with_owner(p_name, p_slug, p_locale, p_timezone);
$$;
grant execute on function public.create_organization_with_owner(text, text, text, text) to authenticated;

create or replace function public.receive_purchase_order_line(p_line_id uuid, p_quantity numeric)
returns void
language sql
security invoker
set search_path = public, app
as $$
  select app.receive_purchase_order_line(p_line_id, p_quantity, auth.uid());
$$;
grant execute on function public.receive_purchase_order_line(uuid, numeric) to authenticated;

-- Only ever invoked by the scheduled job (service role), never from the browser.
create or replace function public.generate_pm_work_order(p_trigger_id uuid, p_occurrence date)
returns uuid
language sql
security invoker
set search_path = public, app
as $$
  select app.generate_pm_work_order(p_trigger_id, p_occurrence);
$$;
grant execute on function public.generate_pm_work_order(uuid, date) to service_role;

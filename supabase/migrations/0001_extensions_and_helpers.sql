-- Intervia — core extensions and generic helpers shared by every later
-- migration (updated_at trigger, per-org sequential numbering). The
-- membership/permission RLS helpers live in 0003_rls_helpers.sql instead of
-- here: they are SQL-language functions, and Postgres validates a SQL
-- function's body (including the tables it queries) at CREATE FUNCTION time,
-- so they must be created after 0002's tables exist.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create schema if not exists app;

-- updated_at trigger helper, reused by every table that has an updated_at column.
create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Sequential human-friendly numbers per org (WO-000123, PO-000045, REQ-000012, ...).
create table if not exists app.number_sequences (
  org_id uuid not null,
  sequence_key text not null,
  last_value bigint not null default 0,
  primary key (org_id, sequence_key)
);

create or replace function app.next_number(p_org_id uuid, p_key text, p_prefix text)
returns text
language plpgsql
security definer
set search_path = public, app
as $$
declare
  v_next bigint;
begin
  insert into app.number_sequences (org_id, sequence_key, last_value)
  values (p_org_id, p_key, 1)
  on conflict (org_id, sequence_key)
  do update set last_value = app.number_sequences.last_value + 1
  returning last_value into v_next;

  return p_prefix || '-' || lpad(v_next::text, 6, '0');
end;
$$;

grant usage on schema app to authenticated, anon, service_role;
grant execute on all functions in schema app to authenticated, anon, service_role;

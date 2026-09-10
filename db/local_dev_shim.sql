-- Local development shim — NOT deployed to Supabase.
--
-- A real Supabase project already provides the `auth` schema (auth.users,
-- auth.uid(), auth.jwt(), auth.role()), the `storage` schema (storage.buckets,
-- storage.objects, storage.foldername()), and the `anon`/`authenticated`/
-- `service_role` database roles that RLS policies key off of.
--
-- This sandbox has no Docker, so `supabase start` (which runs the real GoTrue +
-- PostgREST + Storage stack in containers) is not available. This file
-- reproduces just enough of that surface — on plain Postgres 16 — for the
-- `supabase/migrations/*.sql` files to apply unmodified and for RLS policies
-- to be exercised for real via `SET LOCAL request.jwt.claims`, which is
-- exactly the mechanism Supabase's PostgREST layer uses under the hood to
-- carry the caller's identity into Postgres session state.
--
-- Run once against a fresh local database, before the supabase/migrations.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema if not exists auth;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  encrypted_password text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  email_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function auth.uid() returns uuid
  language sql stable
  as $$
    select (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub')::uuid;
  $$;

create or replace function auth.jwt() returns jsonb
  language sql stable
  as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
  $$;

create or replace function auth.role() returns text
  language sql stable
  as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role', current_user);
  $$;

create schema if not exists storage;

create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  created_at timestamptz not null default now()
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function storage.foldername(name text) returns text[]
  language plpgsql immutable
  as $$
  declare
    parts text[];
  begin
    parts := string_to_array(name, '/');
    if array_length(parts, 1) is null or array_length(parts, 1) < 2 then
      return '{}'::text[];
    end if;
    return parts[1 : array_length(parts, 1) - 1];
  end;
  $$;

alter table auth.users enable row level security;
alter table storage.buckets enable row level security;
alter table storage.objects enable row level security;
create policy "service role bypasses" on auth.users for all using (true) with check (true);
create policy "buckets readable" on storage.buckets for select using (true);

grant usage on schema auth, storage to anon, authenticated, service_role;
grant select on auth.users to anon, authenticated, service_role;
grant all on storage.buckets, storage.objects to authenticated, service_role;
grant select on storage.buckets, storage.objects to anon;

-- On a real Supabase project the platform bootstraps these grants for you;
-- replicate them here so `SET ROLE authenticated` behaves the same way
-- against this local database. RLS (not these grants) is what actually
-- restricts which *rows* each role can see/touch — these grants only say
-- "the role may attempt DML on this table at all".
create schema if not exists app;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges for role app_dev in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges for role app_dev in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges for role app_dev in schema app
  grant execute on functions to anon, authenticated, service_role;

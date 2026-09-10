-- RLS / multi-tenant isolation test suite.
--
-- Exercises the actual Postgres RLS policies (not application code) by
-- impersonating different users the same way Supabase's PostgREST layer
-- does: `SET ROLE authenticated; SET request.jwt.claims = '{"sub": "...", "role":"authenticated"}'`.
--
-- Assertions go through pg_temp.assert_true(condition, message): it RAISE
-- NOTICEs on success and RAISE EXCEPTIONs on failure, so a clean run prints
-- only PASS lines and psql (invoked with -v ON_ERROR_STOP=1) exits non-zero
-- the moment any assertion fails.
--
-- NB: assertions are plain top-level `select pg_temp.assert_true(...)`
-- statements, never wrapped in their own `do $$ ... $$` block — psql does
-- NOT perform :'variable' interpolation inside dollar-quoted strings (by
-- design, so it doesn't mangle function bodies that contain literal
-- colons), so a fixture id substituted as :'equip1_id' would pass through
-- to the server untouched and fail as a syntax error if used inside a
-- do-block. Keeping substitution at the top level, outside any $$ ... $$,
-- avoids that trap entirely.
--
-- Run with: PGPASSWORD=... psql -h localhost -U app_dev -d intervia -v ON_ERROR_STOP=1 -f db/tests/rls_isolation_test.sql

set client_min_messages to notice;

create or replace function pg_temp.assert_true(cond boolean, msg text) returns void
language plpgsql as $$
begin
  if not cond then
    raise exception 'FAIL: %', msg;
  end if;
  raise notice 'PASS: %', msg;
end;
$$;

select pg_temp.assert_true(true, 'RLS isolation test suite starting');

-- ---------------------------------------------------------------------------
-- Fixtures: two orgs, four users, run as table owner (bypasses RLS).
-- ---------------------------------------------------------------------------
reset role;

-- Idempotent: clean up any leftovers from a previous interrupted run before
-- creating fresh fixtures (a failed assertion aborts the script before its
-- own cleanup section runs).
delete from public.organizations where slug in ('alpha-corp', 'beta-corp');
delete from auth.users where id in (
  '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2',
  '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000b1'
);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner1@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'tech1@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'requester1@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner2@example.com')
on conflict (id) do nothing;

\set owner1 '00000000-0000-0000-0000-0000000000a1'
\set tech1 '00000000-0000-0000-0000-0000000000a2'
\set requester1 '00000000-0000-0000-0000-0000000000a3'
\set owner2 '00000000-0000-0000-0000-0000000000b1'

-- owner1 creates org "Alpha" via the bootstrap RPC.
set role authenticated;
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role":"authenticated"}';
select app.create_organization_with_owner('Alpha Corp', 'alpha-corp') as org1_id \gset
reset role;

-- owner2 creates org "Beta" via the bootstrap RPC.
set role authenticated;
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b1", "role":"authenticated"}';
select app.create_organization_with_owner('Beta Corp', 'beta-corp') as org2_id \gset
reset role;

select pg_temp.assert_true(:'org1_id' is not null, 'org Alpha was created');
select pg_temp.assert_true(:'org2_id' is not null, 'org Beta was created');

-- owner1 adds tech1 (Technician) and requester1 (Requester) to org Alpha.
set role authenticated;
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role":"authenticated"}';

insert into public.memberships (org_id, user_id, role_id, status)
select :'org1_id'::uuid, :'tech1'::uuid, id, 'active' from public.roles where key = 'technician' and org_id is null;

insert into public.memberships (org_id, user_id, role_id, status)
select :'org1_id'::uuid, :'requester1'::uuid, id, 'active' from public.roles where key = 'requester' and org_id is null;

-- owner1 creates a location + equipment in org Alpha.
insert into public.locations (org_id, type, name) values (:'org1_id'::uuid, 'site', 'Site Alpha 1') returning id as loc1_id \gset

insert into public.equipment (org_id, location_id, name, internal_code)
values (:'org1_id'::uuid, :'loc1_id'::uuid, 'Convoyeur A1', 'EQ-A1')
returning id as equip1_id \gset

reset role;

select pg_temp.assert_true(:'equip1_id' is not null, 'org Alpha equipment was created');

-- ---------------------------------------------------------------------------
-- TEST 1: a member of org Beta must NOT see org Alpha's equipment.
-- ---------------------------------------------------------------------------
set role authenticated;
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b1", "role":"authenticated"}';

select pg_temp.assert_true(
  (select count(*) from public.equipment where id = :'equip1_id'::uuid) = 0,
  'cross-org SELECT on equipment returns 0 rows'
);

update public.equipment set name = 'hacked' where id = :'equip1_id'::uuid;
select pg_temp.assert_true(
  (select name from public.equipment where id = :'equip1_id'::uuid) is distinct from 'hacked',
  'cross-org UPDATE on equipment affects 0 rows'
);
-- the row is invisible to the current role, so the guard above must use the
-- table owner's view to actually confirm nothing changed:
reset role;
select pg_temp.assert_true(
  (select name from public.equipment where id = :'equip1_id'::uuid) = 'Convoyeur A1',
  'cross-org UPDATE on equipment did not modify the row'
);

set role authenticated;
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b1", "role":"authenticated"}';

select pg_temp.assert_true(
  (select count(*) from public.locations where org_id = :'org1_id'::uuid) = 0,
  'cross-org SELECT on locations returns 0 rows'
);

select pg_temp.assert_true(
  (select count(*) from public.memberships where org_id = :'org1_id'::uuid) = 0,
  'cross-org SELECT on memberships returns 0 rows'
);

-- org Beta member must not be able to insert equipment into org Alpha. The
-- attempt itself has to happen inside a plpgsql function (to catch the RLS
-- exception without aborting the whole script), but the *call* to it is a
-- plain top-level statement so :org1_id still gets interpolated normally.
create or replace function pg_temp.try_cross_org_insert(p_org_id uuid) returns boolean
language plpgsql as $$
begin
  insert into public.equipment (org_id, name) values (p_org_id, 'Intrus');
  return true;
exception
  when insufficient_privilege then return false;
  when others then return false;
end;
$$;

set role authenticated;
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b1", "role":"authenticated"}';

select pg_temp.assert_true(
  pg_temp.try_cross_org_insert(:'org1_id'::uuid) = false,
  'cross-org INSERT into org Alpha equipment is rejected'
);

reset role;

-- ---------------------------------------------------------------------------
-- TEST 2: technician (view-only on equipment) can read but not create equipment.
-- ---------------------------------------------------------------------------
set role authenticated;
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a2", "role":"authenticated"}';

select pg_temp.assert_true(
  (select count(*) from public.equipment where id = :'equip1_id'::uuid) = 1,
  'technician can view own-org equipment'
);

select pg_temp.assert_true(
  pg_temp.try_cross_org_insert(:'org1_id'::uuid) = false,
  'technician without equipment.create permission is blocked'
);

reset role;

-- ---------------------------------------------------------------------------
-- TEST 3: work order visibility for an assignee who lacks work_orders.view.
-- The Requester role has no work_orders.* permission at all; a work order
-- assigned directly to a requester must still be visible to them, but no
-- *other* work order in the org should be.
-- ---------------------------------------------------------------------------
set role authenticated;
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role":"authenticated"}';

select app.next_number(:'org1_id'::uuid, 'work_order', 'WO') as wo_number \gset

insert into public.work_orders (org_id, number, title, primary_assignee_id, status)
values (:'org1_id'::uuid, :'wo_number', 'Réparer convoyeur', :'requester1'::uuid, 'assigned')
returning id as wo_assigned_id \gset

select app.next_number(:'org1_id'::uuid, 'work_order', 'WO') as wo_number2 \gset

insert into public.work_orders (org_id, number, title, status)
values (:'org1_id'::uuid, :'wo_number2', 'Autre bon de travail non assigné', 'open')
returning id as wo_other_id \gset

reset role;

set role authenticated;
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a3", "role":"authenticated"}';

select pg_temp.assert_true(
  (select count(*) from public.work_orders where id = :'wo_assigned_id'::uuid) = 1,
  'requester sees the work order assigned to them'
);

select pg_temp.assert_true(
  (select count(*) from public.work_orders where id = :'wo_other_id'::uuid) = 0,
  'requester cannot see work orders not assigned to them'
);

reset role;

-- ---------------------------------------------------------------------------
-- TEST 4: multi-org membership — owner1 also joining org Beta must not
-- retroactively expose org Alpha data to owner2, and owner1 should now see
-- both orgs.
-- ---------------------------------------------------------------------------
set role authenticated;
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b1", "role":"authenticated"}';

insert into public.memberships (org_id, user_id, role_id, status)
select :'org2_id'::uuid, :'owner1'::uuid, id, 'active' from public.roles where key = 'viewer' and org_id is null;

reset role;

set role authenticated;
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role":"authenticated"}';

select pg_temp.assert_true(
  (select count(*) from public.organizations where id in (:'org1_id'::uuid, :'org2_id'::uuid)) = 2,
  'user belonging to two orgs sees both'
);

reset role;

set role authenticated;
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000b1", "role":"authenticated"}';

select pg_temp.assert_true(
  (select count(*) from public.equipment where org_id = :'org1_id'::uuid) = 0,
  'org Beta owner still isolated from org Alpha after an unrelated cross-membership event'
);

reset role;

-- ---------------------------------------------------------------------------
-- Cleanup
-- ---------------------------------------------------------------------------
reset role;
delete from public.organizations where id in (:'org1_id'::uuid, :'org2_id'::uuid);
delete from auth.users where id in (:'owner1'::uuid, :'tech1'::uuid, :'requester1'::uuid, :'owner2'::uuid);

select pg_temp.assert_true(true, 'RLS isolation test suite: ALL TESTS PASSED');

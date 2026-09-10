-- audit_log had a SELECT policy (admins only) but no INSERT policy, so RLS
-- default-denied every insert attempt — including from the app itself
-- recording an admin's own action (role changes, membership removal, org
-- settings edits). Any org member may append an entry about their own
-- action; only admins can read the log (existing policy, unchanged). This
-- keeps audit_log append-only for everyone (no update/delete policy exists
-- for any non-bypass-RLS role) while letting normal request-scoped code
-- write to it without needing the service-role client.

create policy "members can record their own actions"
  on public.audit_log for insert
  with check (app.is_member_of(org_id) and (actor_id = auth.uid() or actor_id is null));

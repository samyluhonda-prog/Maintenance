-- Accepting an invitation is a chicken-and-egg case like org creation: the
-- "admins manage memberships" INSERT policy requires the inserting user to
-- already be an org admin, which an invitee by definition isn't yet. This
-- SECURITY DEFINER function uses the invitation record itself (created by
-- an admin via org_invitations, whose INSERT is already admin-gated) as the
-- authorization instead, the same bootstrap pattern as
-- app.create_organization_with_owner in 0004.

create or replace function app.accept_org_invitation(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.org_invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_invitation from public.org_invitations where token = p_token for update;

  if not found then
    raise exception 'invitation not found';
  end if;
  if v_invitation.status <> 'pending' then
    raise exception 'invitation is no longer pending';
  end if;
  if v_invitation.expires_at < now() then
    raise exception 'invitation has expired';
  end if;

  insert into public.memberships (org_id, user_id, role_id, status)
  values (v_invitation.org_id, auth.uid(), v_invitation.role_id, 'active')
  on conflict (org_id, user_id) do update set role_id = excluded.role_id, status = 'active';

  update public.org_invitations set status = 'accepted' where id = v_invitation.id;

  return v_invitation.org_id;
end;
$$;

create or replace function public.accept_org_invitation(p_token uuid)
returns uuid
language sql
security invoker
set search_path = public, app
as $$
  select app.accept_org_invitation(p_token);
$$;
grant execute on function public.accept_org_invitation(uuid) to authenticated;

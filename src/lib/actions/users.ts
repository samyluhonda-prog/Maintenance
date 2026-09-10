"use server";

import { revalidatePath } from "next/cache";

import { recordAuditEntry } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { inviteMemberSchema, teamSchema } from "@/lib/validation/users";

import { toActionError, type ActionState } from "./action-utils";

export async function inviteMemberAction(
  orgSlug: string,
  orgId: string,
  raw: unknown,
): Promise<ActionState<{ inviteUrl: string }>> {
  const parsed = inviteMemberSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const { data, error } = await supabase
    .from("org_invitations")
    .insert({ org_id: orgId, email: parsed.data.email, role_id: parsed.data.roleId, invited_by: user.id })
    .select("token")
    .single();
  if (error) return { error: toActionError(error) };

  await recordAuditEntry(supabase, {
    orgId,
    actorId: user.id,
    action: "member.invited",
    entityType: "org_invitation",
    entityId: data.token,
    after: { email: parsed.data.email },
  });

  revalidatePath(`/o/${orgSlug}/users`);
  return { data: { inviteUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/invite/${data.token}` } };
}

export async function revokeInvitationAction(orgSlug: string, invitationId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("org_invitations").update({ status: "revoked" }).eq("id", invitationId);
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/users`);
  return {};
}

export async function acceptInvitationAction(token: string): Promise<ActionState<{ orgSlug: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Vous devez être connecté pour accepter une invitation." };

  // No pre-check SELECT on org_invitations here: its RLS only lets org
  // admins read invitation rows, which the invitee isn't yet — the RPC
  // itself (SECURITY DEFINER) validates the token/status/expiry and raises
  // a descriptive error otherwise. Once it succeeds, the caller is a member
  // and can look up the org normally.
  const { data: orgId, error: rpcError } = await supabase.rpc("accept_org_invitation", { p_token: token });
  if (rpcError) return { error: toActionError(rpcError) };

  const { data: org } = await supabase.from("organizations").select("slug").eq("id", orgId!).single();
  return { data: { orgSlug: org!.slug } };
}

export async function updateMemberRoleAction(orgSlug: string, membershipId: string, roleId: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: before } = await supabase.from("memberships").select("role_id, org_id").eq("id", membershipId).single();
  const { error } = await supabase.from("memberships").update({ role_id: roleId }).eq("id", membershipId);
  if (error) return { error: toActionError(error) };

  if (before) {
    await recordAuditEntry(supabase, {
      orgId: before.org_id,
      actorId: user?.id ?? null,
      action: "member.role_changed",
      entityType: "membership",
      entityId: membershipId,
      before: { roleId: before.role_id },
      after: { roleId },
    });
  }

  revalidatePath(`/o/${orgSlug}/users`);
  return {};
}

export async function removeMemberAction(orgSlug: string, membershipId: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: before } = await supabase.from("memberships").select("org_id, user_id").eq("id", membershipId).single();
  const { error } = await supabase.from("memberships").delete().eq("id", membershipId);
  if (error) return { error: toActionError(error) };

  if (before) {
    await recordAuditEntry(supabase, {
      orgId: before.org_id,
      actorId: user?.id ?? null,
      action: "member.removed",
      entityType: "membership",
      entityId: membershipId,
      before: { userId: before.user_id },
    });
  }

  revalidatePath(`/o/${orgSlug}/users`);
  return {};
}

export async function createTeamAction(orgSlug: string, orgId: string, raw: unknown): Promise<ActionState> {
  const parsed = teamSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const supabase = await createClient();
  const { error } = await supabase.from("teams").insert({ org_id: orgId, name: parsed.data.name });
  if (error) return { error: toActionError(error) };

  revalidatePath(`/o/${orgSlug}/users`);
  return {};
}

export async function addTeamMemberAction(orgSlug: string, orgId: string, teamId: string, userId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("team_members").insert({ org_id: orgId, team_id: teamId, user_id: userId });
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/users`);
  return {};
}

export async function removeTeamMemberAction(orgSlug: string, teamId: string, userId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("team_members").delete().eq("team_id", teamId).eq("user_id", userId);
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/users`);
  return {};
}

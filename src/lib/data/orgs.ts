import "server-only";

import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/supabase-helpers";

export type MyMembership = {
  membershipId: string;
  orgId: string;
  orgName: string;
  orgSlug: string;
  roleKey: string;
  roleNameFr: string;
  roleNameEn: string;
};

/** Every active org membership for the signed-in user. Redirects to /login if not authenticated. */
export async function getMyMemberships(): Promise<MyMembership[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("memberships")
    .select("id, org_id, organizations(name, slug), roles(key, name_fr, name_en)")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error || !data) return [];

  return data
    .filter((row) => row.organizations && row.roles)
    .map((row) => ({
      membershipId: row.id,
      orgId: row.org_id,
      orgName: row.organizations!.name,
      orgSlug: row.organizations!.slug,
      roleKey: row.roles!.key,
      roleNameFr: row.roles!.name_fr,
      roleNameEn: row.roles!.name_en,
    }));
}

export type OrgContext = {
  org: Tables<"organizations">;
  membership: Tables<"memberships">;
  roleKey: string;
  permissions: Set<string>;
  userId: string;
};

/**
 * Resolves the org-scoped context for `/o/[orgSlug]/*` routes: verifies the
 * current user is an active member (defense-in-depth on top of RLS, and the
 * source of truth for what the UI conditionally renders) and loads their
 * effective permission set.
 *
 * `notFound()` on an unknown slug, `redirect("/login")` if unauthenticated.
 * A slug that exists but the user isn't a member of also renders as
 * `notFound()` (RLS makes the row invisible either way) rather than leaking
 * whether the org exists.
 */
export async function requireOrgAccess(orgSlug: string): Promise<OrgContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase.from("organizations").select("*").eq("slug", orgSlug).maybeSingle();
  if (!org) notFound();

  const { data: membership } = await supabase
    .from("memberships")
    .select("*")
    .eq("org_id", org.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!membership) notFound();

  const { data: role } = await supabase.from("roles").select("key").eq("id", membership.role_id).single();

  const { data: perms } = await supabase
    .from("role_permissions")
    .select("permissions(key)")
    .eq("role_id", membership.role_id);

  const permissions = new Set(
    (perms ?? []).map((p) => p.permissions?.key).filter((key): key is string => !!key),
  );

  return { org, membership, roleKey: role?.key ?? "", permissions, userId: user.id };
}

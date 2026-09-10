import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { InviteDialog } from "./invite-dialog";
import { MembersTable } from "./members-table";

export default async function UsersPage({ params }: PageProps<"/o/[orgSlug]/users">) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const [{ data: memberships }, { data: invitations }, { data: roles }] = await Promise.all([
    supabase
      .from("memberships")
      .select("id, role_id, profiles(full_name), roles(name_fr)")
      .eq("org_id", ctx.org.id)
      .eq("status", "active")
      .order("created_at"),
    supabase
      .from("org_invitations")
      .select("id, email, roles(name_fr)")
      .eq("org_id", ctx.org.id)
      .eq("status", "pending"),
    supabase.from("roles").select("id, name_fr").is("org_id", null).order("name_fr"),
  ]);

  const canManage = ctx.roleKey === "owner" || ctx.roleKey === "admin";

  const members = (memberships ?? []).map((m) => ({
    membershipId: m.id,
    fullName: m.profiles?.full_name || "Utilisateur",
    roleId: m.role_id,
    roleKeyLabel: m.roles?.name_fr ?? "",
  }));

  const invitationRows = (invitations ?? []).map((i) => ({
    id: i.id,
    email: i.email,
    roleLabel: i.roles?.name_fr ?? "",
  }));

  const roleOptions = (roles ?? []).map((r) => ({ id: r.id, nameFr: r.name_fr }));

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Utilisateurs et équipes</h1>
          <p className="text-muted-foreground">Gérez les membres de {ctx.org.name} et leurs rôles.</p>
        </div>
        {canManage && <InviteDialog orgSlug={orgSlug} orgId={ctx.org.id} roles={roleOptions} />}
      </div>

      <MembersTable
        orgSlug={orgSlug}
        members={members}
        invitations={invitationRows}
        roles={roleOptions}
        canManage={canManage}
        currentUserMembershipId={ctx.membership.id}
      />
    </div>
  );
}

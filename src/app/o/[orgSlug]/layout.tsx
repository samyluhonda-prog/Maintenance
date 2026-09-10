import { createClient } from "@/lib/supabase/server";
import { requireOrgAccess } from "@/lib/data/orgs";
import { OrgProvider } from "@/lib/org-context";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export default async function OrgLayout({
  children,
  params,
}: LayoutProps<"/o/[orgSlug]">) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);

  const supabase = await createClient();
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_path").eq("id", ctx.userId).single(),
    supabase
      .from("memberships")
      .select("org_id, organizations(name, slug)")
      .eq("user_id", ctx.userId)
      .eq("status", "active"),
  ]);

  const orgOptions = (memberships ?? [])
    .filter((m) => m.organizations)
    .map((m) => ({ orgId: m.org_id, orgSlug: m.organizations!.slug, orgName: m.organizations!.name }));

  return (
    <OrgProvider
      value={{
        orgId: ctx.org.id,
        orgSlug: ctx.org.slug,
        orgName: ctx.org.name,
        roleKey: ctx.roleKey,
        permissions: Array.from(ctx.permissions),
        userId: ctx.userId,
        userFullName: profile?.full_name || "Utilisateur",
        userAvatarPath: profile?.avatar_path ?? null,
      }}
    >
      <div className="flex min-h-svh">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar orgOptions={orgOptions} />
          <main className="flex-1 overflow-x-hidden pb-20 md:pb-0">{children}</main>
        </div>
        <MobileBottomNav />
      </div>
    </OrgProvider>
  );
}

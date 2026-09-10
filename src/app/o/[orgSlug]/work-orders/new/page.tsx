import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { WorkOrderForm } from "../work-order-form";

export default async function NewWorkOrderPage({
  params,
  searchParams,
}: PageProps<"/o/[orgSlug]/work-orders/new">) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const [{ data: equipment }, { data: memberships }] = await Promise.all([
    supabase.from("equipment").select("id, name").eq("org_id", ctx.org.id).order("name"),
    supabase
      .from("memberships")
      .select("user_id, profiles(full_name)")
      .eq("org_id", ctx.org.id)
      .eq("status", "active"),
  ]);

  const memberOptions = (memberships ?? []).map((m) => ({
    userId: m.user_id,
    fullName: m.profiles?.full_name || "Utilisateur",
  }));

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Nouveau bon de travail</h1>
      <WorkOrderForm
        orgSlug={orgSlug}
        orgId={ctx.org.id}
        equipmentOptions={equipment ?? []}
        memberOptions={memberOptions}
        defaultEquipmentId={typeof sp.equipmentId === "string" ? sp.equipmentId : undefined}
        defaultTitle={typeof sp.procedureRunId === "string" ? "Suivi — échec d'inspection" : undefined}
      />
    </div>
  );
}

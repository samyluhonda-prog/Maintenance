import { notFound } from "next/navigation";

import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { WorkOrderForm } from "../../work-order-form";

export default async function EditWorkOrderPage({ params }: PageProps<"/o/[orgSlug]/work-orders/[id]/edit">) {
  const { orgSlug, id } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const [{ data: workOrder }, { data: equipment }, { data: memberships }] = await Promise.all([
    supabase.from("work_orders").select("*").eq("id", id).eq("org_id", ctx.org.id).maybeSingle(),
    supabase.from("equipment").select("id, name").eq("org_id", ctx.org.id).order("name"),
    supabase
      .from("memberships")
      .select("user_id, profiles(full_name)")
      .eq("org_id", ctx.org.id)
      .eq("status", "active"),
  ]);

  if (!workOrder) notFound();

  const memberOptions = (memberships ?? []).map((m) => ({
    userId: m.user_id,
    fullName: m.profiles?.full_name || "Utilisateur",
  }));

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Modifier le bon de travail</h1>
      <WorkOrderForm
        orgSlug={orgSlug}
        orgId={ctx.org.id}
        workOrder={workOrder}
        equipmentOptions={equipment ?? []}
        memberOptions={memberOptions}
      />
    </div>
  );
}

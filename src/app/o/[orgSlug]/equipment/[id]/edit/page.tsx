import { notFound } from "next/navigation";

import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { EquipmentForm } from "../../equipment-form";

export default async function EditEquipmentPage({ params }: PageProps<"/o/[orgSlug]/equipment/[id]/edit">) {
  const { orgSlug, id } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const [{ data: equipment }, { data: locations }, { data: suppliers }] = await Promise.all([
    supabase.from("equipment").select("*").eq("id", id).eq("org_id", ctx.org.id).maybeSingle(),
    supabase.from("locations").select("*").eq("org_id", ctx.org.id).order("name"),
    supabase.from("suppliers").select("*").eq("org_id", ctx.org.id).order("name"),
  ]);

  if (!equipment) notFound();

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Modifier « {equipment.name} »</h1>
      <EquipmentForm
        orgSlug={orgSlug}
        orgId={ctx.org.id}
        equipment={equipment}
        locations={locations ?? []}
        suppliers={suppliers ?? []}
      />
    </div>
  );
}

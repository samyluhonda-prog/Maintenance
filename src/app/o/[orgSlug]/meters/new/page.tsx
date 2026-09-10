import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { MeterForm } from "../meter-form";

export default async function NewMeterPage({ params, searchParams }: PageProps<"/o/[orgSlug]/meters/new">) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const { data: equipment } = await supabase.from("equipment").select("id, name").eq("org_id", ctx.org.id).order("name");

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Nouveau compteur</h1>
      <MeterForm
        orgSlug={orgSlug}
        orgId={ctx.org.id}
        equipmentOptions={equipment ?? []}
        defaultEquipmentId={typeof sp.equipmentId === "string" ? sp.equipmentId : undefined}
      />
    </div>
  );
}

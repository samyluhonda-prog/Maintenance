import { notFound } from "next/navigation";

import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { MeterForm } from "../../meter-form";

export default async function EditMeterPage({ params }: PageProps<"/o/[orgSlug]/meters/[id]/edit">) {
  const { orgSlug, id } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const [{ data: meter }, { data: equipment }] = await Promise.all([
    supabase.from("meters").select("*").eq("id", id).eq("org_id", ctx.org.id).maybeSingle(),
    supabase.from("equipment").select("id, name").eq("org_id", ctx.org.id).order("name"),
  ]);

  if (!meter) notFound();

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Modifier « {meter.name} »</h1>
      <MeterForm orgSlug={orgSlug} orgId={ctx.org.id} meter={meter} equipmentOptions={equipment ?? []} />
    </div>
  );
}

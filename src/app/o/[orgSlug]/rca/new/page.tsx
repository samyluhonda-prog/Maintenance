import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { RcaForm } from "./rca-form";

export default async function NewRcaPage({ params, searchParams }: PageProps<"/o/[orgSlug]/rca/new">) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const { data: equipment } = await supabase.from("equipment").select("id, name").eq("org_id", ctx.org.id).order("name");

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <RcaForm
        orgSlug={orgSlug}
        orgId={ctx.org.id}
        equipmentOptions={equipment ?? []}
        defaultEquipmentId={typeof sp.equipmentId === "string" ? sp.equipmentId : undefined}
      />
    </div>
  );
}

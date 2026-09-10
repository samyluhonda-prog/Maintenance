import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { RequestForm } from "./request-form";

export default async function NewRequestPage({
  params,
  searchParams,
}: PageProps<"/o/[orgSlug]/requests/new">) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const { data: equipment } = await supabase
    .from("equipment")
    .select("id, name")
    .eq("org_id", ctx.org.id)
    .order("name");

  const defaultEquipmentId = typeof sp.equipmentId === "string" ? sp.equipmentId : undefined;

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <RequestForm
        orgSlug={orgSlug}
        orgId={ctx.org.id}
        equipmentOptions={equipment ?? []}
        defaultEquipmentId={defaultEquipmentId}
      />
    </div>
  );
}

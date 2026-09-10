import { requireOrgAccess } from "@/lib/data/orgs";

import { ProcedureRun } from "../../procedure-run";

export default async function RunProcedurePage({ params, searchParams }: PageProps<"/o/[orgSlug]/procedures/[id]/run">) {
  const { orgSlug, id } = await params;
  const sp = await searchParams;
  const ctx = await requireOrgAccess(orgSlug);
  const equipmentId = typeof sp.equipmentId === "string" ? sp.equipmentId : undefined;

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <ProcedureRun orgSlug={orgSlug} orgId={ctx.org.id} templateId={id} equipmentId={equipmentId} />
    </div>
  );
}

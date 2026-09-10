import { requireOrgAccess } from "@/lib/data/orgs";

import { NewProcedureTemplateForm } from "./new-procedure-template-form";

export default async function NewProcedureTemplatePage({ params }: PageProps<"/o/[orgSlug]/procedures/new">) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Nouvelle procédure</h1>
      <NewProcedureTemplateForm orgSlug={orgSlug} orgId={ctx.org.id} />
    </div>
  );
}

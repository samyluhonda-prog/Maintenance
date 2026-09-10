import { requireOrgAccess } from "@/lib/data/orgs";

import { AutomationRuleForm } from "../automation-rule-form";

export default async function NewAutomationRulePage({ params }: PageProps<"/o/[orgSlug]/automations/new">) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Nouvelle règle d’automatisation</h1>
      <AutomationRuleForm orgSlug={orgSlug} orgId={ctx.org.id} />
    </div>
  );
}

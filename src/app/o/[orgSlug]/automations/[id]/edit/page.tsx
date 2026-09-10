import { notFound } from "next/navigation";

import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { AutomationRuleForm } from "../../automation-rule-form";

export default async function EditAutomationRulePage({ params }: PageProps<"/o/[orgSlug]/automations/[id]/edit">) {
  const { orgSlug, id } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const { data: rule } = await supabase.from("automation_rules").select("*").eq("id", id).eq("org_id", ctx.org.id).maybeSingle();
  if (!rule) notFound();

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Modifier « {rule.name} »</h1>
      <AutomationRuleForm orgSlug={orgSlug} orgId={ctx.org.id} rule={rule} />
    </div>
  );
}

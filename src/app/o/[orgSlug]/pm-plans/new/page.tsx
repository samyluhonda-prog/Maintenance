import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { PmPlanForm } from "../pm-plan-form";

export default async function NewPmPlanPage({ params }: PageProps<"/o/[orgSlug]/pm-plans/new">) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const [{ data: equipment }, { data: procedureTemplates }, { data: memberships }] = await Promise.all([
    supabase.from("equipment").select("id, name").eq("org_id", ctx.org.id).order("name"),
    supabase
      .from("procedure_templates")
      .select("id, name")
      .eq("org_id", ctx.org.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("memberships")
      .select("user_id, profiles(full_name)")
      .eq("org_id", ctx.org.id)
      .eq("status", "active"),
  ]);

  const memberOptions = (memberships ?? []).map((m) => ({
    userId: m.user_id,
    fullName: m.profiles?.full_name || "Utilisateur",
  }));

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Nouveau plan de maintenance préventive</h1>
      <PmPlanForm
        orgSlug={orgSlug}
        orgId={ctx.org.id}
        equipmentOptions={equipment ?? []}
        procedureTemplateOptions={procedureTemplates ?? []}
        memberOptions={memberOptions}
      />
      <p className="mt-4 text-sm text-muted-foreground">
        Après la création, vous pourrez ajouter un ou plusieurs déclencheurs (calendrier, compteur ou condition) sur
        la page du plan.
      </p>
    </div>
  );
}

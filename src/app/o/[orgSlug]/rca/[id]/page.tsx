import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { AiCauseSuggestions } from "./ai-cause-suggestions";
import { CorrectiveActionsPanel, FishboneCausesPanel, FiveWhysPanel } from "./rca-panels";
import { StatusSelect } from "./status-select";

export default async function RcaDetailPage({ params }: PageProps<"/o/[orgSlug]/rca/[id]">) {
  const { orgSlug, id } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const [{ data: rca }, { data: whys }, { data: causes }, { data: actions }, { data: memberships }] = await Promise.all([
    supabase.from("rca_records").select("*, equipment(name)").eq("id", id).eq("org_id", ctx.org.id).maybeSingle(),
    supabase.from("rca_five_whys").select("*").eq("rca_id", id).order("order_index"),
    supabase.from("rca_causes").select("*").eq("rca_id", id),
    supabase.from("corrective_actions").select("*, profiles!owner_id(full_name)").eq("rca_id", id).order("created_at"),
    supabase.from("memberships").select("user_id, profiles(full_name)").eq("org_id", ctx.org.id).eq("status", "active"),
  ]);

  if (!rca) notFound();

  const memberOptions = (memberships ?? []).map((m) => ({ userId: m.user_id, fullName: m.profiles?.full_name || "Utilisateur" }));

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{rca.title}</h1>
            <Badge>{rca.equipment?.name}</Badge>
          </div>
          <p className="whitespace-pre-wrap text-muted-foreground">{rca.problem_statement}</p>
        </div>
        <StatusSelect orgSlug={orgSlug} rcaId={rca.id} status={rca.status} />
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Suggestions IA</CardTitle>
          </CardHeader>
          <CardContent>
            <AiCauseSuggestions equipmentName={rca.equipment?.name ?? ""} problemDescription={rca.problem_statement} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Méthode des 5 pourquoi</CardTitle>
          </CardHeader>
          <CardContent>
            <FiveWhysPanel orgSlug={orgSlug} orgId={ctx.org.id} rcaId={rca.id} whys={whys ?? []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Diagramme des causes (Ishikawa)</CardTitle>
          </CardHeader>
          <CardContent>
            <FishboneCausesPanel orgSlug={orgSlug} orgId={ctx.org.id} rcaId={rca.id} causes={causes ?? []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions correctives</CardTitle>
          </CardHeader>
          <CardContent>
            <CorrectiveActionsPanel
              orgSlug={orgSlug}
              orgId={ctx.org.id}
              rcaId={rca.id}
              actions={actions ?? []}
              memberOptions={memberOptions}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

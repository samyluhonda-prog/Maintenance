import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { PmTriggersPanel } from "../pm-triggers-panel";

const STATUS_LABELS: Record<string, string> = { active: "Actif", paused: "En pause", archived: "Archivé" };
const PRIORITY_LABELS: Record<string, string> = { low: "Faible", medium: "Moyenne", high: "Élevée", critical: "Critique" };
const WO_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  open: "Ouvert",
  planned: "Planifié",
  assigned: "Assigné",
  in_progress: "En cours",
  on_hold: "En attente",
  completed: "Complété",
  to_review: "À réviser",
  closed: "Clôturé",
  cancelled: "Annulé",
  skipped: "Sauté",
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value ?? "—"}</span>
    </div>
  );
}

export default async function PmPlanDetailPage({ params }: PageProps<"/o/[orgSlug]/pm-plans/[id]">) {
  const { orgSlug, id } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const { data: plan } = await supabase
    .from("pm_plans")
    .select("*, equipment(id, name), procedure_templates(name), profiles!pm_plans_default_assignee_id_fkey(full_name), pm_triggers(*, meters(name, unit))")
    .eq("id", id)
    .eq("org_id", ctx.org.id)
    .maybeSingle();

  if (!plan) notFound();

  const { data: planMeters } = await supabase.from("meters").select("*").eq("equipment_id", plan.equipment_id).order("name");

  const triggerIds = (plan.pm_triggers ?? []).map((t) => t.id);
  const { data: generated } =
    triggerIds.length > 0
      ? await supabase
          .from("pm_generated_work_orders")
          .select("*, work_orders(number, title, status, due_at, closed_at)")
          .in("pm_trigger_id", triggerIds)
          .order("occurrence_date", { ascending: false })
      : { data: [] };

  const totalGenerated = generated?.length ?? 0;
  const onTime = (generated ?? []).filter((g) => {
    const wo = g.work_orders;
    return wo?.closed_at && wo?.due_at && new Date(wo.closed_at) <= new Date(wo.due_at);
  }).length;
  const compliancePct = totalGenerated > 0 ? Math.round((onTime / totalGenerated) * 100) : null;

  const canEdit = ctx.roleKey === "owner" || ctx.roleKey === "admin" || ctx.permissions.has("pm_plans.edit");

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{plan.name}</h1>
            <Badge variant={plan.status === "active" ? "success" : plan.status === "paused" ? "secondary" : "outline"}>
              {STATUS_LABELS[plan.status] ?? plan.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {plan.equipment ? (
              <Link href={`/o/${orgSlug}/equipment/${plan.equipment.id}`} className="hover:underline">
                {plan.equipment.name}
              </Link>
            ) : (
              "Équipement inconnu"
            )}
          </p>
        </div>
        {canEdit && (
          <Button variant="outline" asChild>
            <Link href={`/o/${orgSlug}/pm-plans/${plan.id}/edit`}>
              <Pencil /> Modifier
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <PmTriggersPanel
            orgSlug={orgSlug}
            orgId={ctx.org.id}
            pmPlanId={plan.id}
            triggers={plan.pm_triggers ?? []}
            meters={planMeters ?? []}
            canEdit={canEdit}
          />

          <Card>
            <CardHeader>
              <CardTitle>Conformité</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {compliancePct == null ? (
                <p className="text-sm text-muted-foreground">Aucun bon de travail généré pour ce plan pour le moment.</p>
              ) : (
                <div className="grid gap-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-semibold">{compliancePct}%</span>
                    <span className="text-sm text-muted-foreground">
                      {onTime} / {totalGenerated} bons clôturés à temps
                    </span>
                  </div>
                  <Progress value={compliancePct} />
                  <p className="text-xs text-muted-foreground">
                    Taux de conformité = (bons de travail générés par ce plan et clôturés au plus tard à leur échéance)
                    ÷ (total des bons de travail générés par ce plan). Un bon non encore clôturé compte comme non
                    conforme tant qu’il ne l’est pas — mesure volontairement conservatrice.
                  </p>
                </div>
              )}

              {totalGenerated > 0 && (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Occurrence</TableHead>
                        <TableHead>Bon de travail</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Échéance</TableHead>
                        <TableHead>Clôturé le</TableHead>
                        <TableHead>Conforme</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(generated ?? []).map((g) => {
                        const wo = g.work_orders;
                        const compliant = !!(wo?.closed_at && wo?.due_at && new Date(wo.closed_at) <= new Date(wo.due_at));
                        return (
                          <TableRow key={`${g.pm_trigger_id}-${g.work_order_id}`}>
                            <TableCell>{new Date(g.occurrence_date).toLocaleDateString("fr-CA")}</TableCell>
                            <TableCell className="font-medium">{wo?.number ?? "—"}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {wo ? (WO_STATUS_LABELS[wo.status] ?? wo.status) : "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {wo?.due_at ? new Date(wo.due_at).toLocaleDateString("fr-CA") : "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {wo?.closed_at ? new Date(wo.closed_at).toLocaleDateString("fr-CA") : "—"}
                            </TableCell>
                            <TableCell>
                              {wo?.closed_at ? (
                                <Badge variant={compliant ? "success" : "destructive"}>{compliant ? "Oui" : "Non"}</Badge>
                              ) : (
                                <Badge variant="secondary">En cours</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Bon de travail généré</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="Titre" value={plan.wo_title} />
              <InfoRow label="Priorité" value={PRIORITY_LABELS[plan.wo_priority] ?? plan.wo_priority} />
              <InfoRow label="Heures estimées" value={plan.wo_estimate_hours} />
              <InfoRow label="Modèle de procédure" value={plan.procedure_templates?.name} />
              <InfoRow label="Assigné par défaut" value={plan.profiles?.full_name} />
              <InfoRow label="Délai de préparation" value={`${plan.lead_time_days} j`} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

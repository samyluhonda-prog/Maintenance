import Link from "next/link";
import { Plus, Repeat } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireOrgAccess } from "@/lib/data/orgs";
import { summarizePmTrigger } from "@/lib/pm/schedule";
import { createClient } from "@/lib/supabase/server";

import { RunAutomationsButton } from "./run-automations-button";

const STATUS_VARIANT: Record<string, "success" | "secondary" | "outline"> = {
  active: "success",
  paused: "secondary",
  archived: "outline",
};
const STATUS_LABELS: Record<string, string> = { active: "Actif", paused: "En pause", archived: "Archivé" };

export default async function PmPlansListPage({ params }: PageProps<"/o/[orgSlug]/pm-plans">) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const { data: plans } = await supabase
    .from("pm_plans")
    .select("*, equipment(name), pm_triggers(*, meters(unit))")
    .eq("org_id", ctx.org.id)
    .order("name");

  const canCreate = ctx.roleKey === "owner" || ctx.roleKey === "admin" || ctx.permissions.has("pm_plans.create");
  const canRunNow = ctx.roleKey === "owner" || ctx.roleKey === "admin";

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plans de maintenance préventive</h1>
          <p className="text-muted-foreground">Déclencheurs calendrier, compteur ou condition qui génèrent des bons de travail.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canRunNow && <RunAutomationsButton orgSlug={orgSlug} />}
          {canCreate && (
            <Button asChild>
              <Link href={`/o/${orgSlug}/pm-plans/new`}>
                <Plus /> Nouveau plan
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Équipement</TableHead>
              <TableHead>Déclencheur</TableHead>
              <TableHead>Prochaine échéance</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(plans ?? []).map((plan) => {
              const triggers = plan.pm_triggers ?? [];
              const primary = triggers.find((t) => t.is_active) ?? triggers[0];
              const nextDue = triggers
                .filter((t) => t.is_active && t.next_due_at)
                .map((t) => t.next_due_at as string)
                .sort()[0];

              return (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">
                    <Link href={`/o/${orgSlug}/pm-plans/${plan.id}`} className="hover:underline">
                      {plan.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{plan.equipment?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {primary ? summarizePmTrigger(primary, primary.meters?.unit) : "Aucun déclencheur"}
                    {triggers.length > 1 && ` (+${triggers.length - 1})`}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {nextDue ? new Date(nextDue).toLocaleDateString("fr-CA") : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[plan.status] ?? "outline"}>{STATUS_LABELS[plan.status] ?? plan.status}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {(plans ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  <Repeat className="mx-auto mb-2 size-6" />
                  Aucun plan de maintenance préventive pour le moment.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

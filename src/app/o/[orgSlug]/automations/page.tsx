import Link from "next/link";
import { FileClock, Plus, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";
import { TRIGGER_EVENT_LABELS } from "@/lib/validation/automations";

import { AutomationRuleRowActions } from "./automation-rule-row-actions";

export default async function AutomationsListPage({ params }: PageProps<"/o/[orgSlug]/automations">) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const { data: rules } = await supabase.from("automation_rules").select("*").eq("org_id", ctx.org.id).order("name");

  const canEdit =
    ctx.roleKey === "owner" || ctx.roleKey === "admin" || ctx.permissions.has("automations.edit") || ctx.permissions.has("automations.create");

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Automatisations</h1>
          <p className="text-muted-foreground">Règles « si un événement survient, alors… », évaluées côté serveur.</p>
        </div>
        {canEdit && (
          <Button asChild>
            <Link href={`/o/${orgSlug}/automations/new`}>
              <Plus /> Nouvelle règle
            </Link>
          </Button>
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Événement</TableHead>
              <TableHead>Actions</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rules ?? []).map((rule) => {
              const actionCount = Array.isArray(rule.actions) ? rule.actions.length : 0;
              return (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">
                    {canEdit ? (
                      <Link href={`/o/${orgSlug}/automations/${rule.id}/edit`} className="hover:underline">
                        {rule.name}
                      </Link>
                    ) : (
                      rule.name
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{TRIGGER_EVENT_LABELS[rule.trigger_event] ?? rule.trigger_event}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{actionCount} action(s)</TableCell>
                  <TableCell>
                    <AutomationRuleRowActions orgSlug={orgSlug} ruleId={rule.id} ruleName={rule.name} isActive={rule.is_active} canEdit={canEdit} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" asChild title="Journal">
                      <Link href={`/o/${orgSlug}/automations/${rule.id}/logs`}>
                        <FileClock className="size-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {(rules ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  <Zap className="mx-auto mb-2 size-6" />
                  Aucune règle d’automatisation pour le moment.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

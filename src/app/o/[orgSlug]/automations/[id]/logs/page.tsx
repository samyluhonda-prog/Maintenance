import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

export default async function AutomationRuleLogsPage({ params }: PageProps<"/o/[orgSlug]/automations/[id]/logs">) {
  const { orgSlug, id } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const { data: rule } = await supabase.from("automation_rules").select("id, name").eq("id", id).eq("org_id", ctx.org.id).maybeSingle();
  if (!rule) notFound();

  const { data: logs } = await supabase
    .from("automation_logs")
    .select("*")
    .eq("rule_id", id)
    .order("triggered_at", { ascending: false })
    .limit(200);

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href={`/o/${orgSlug}/automations`}>
          <ArrowLeft /> Retour aux automatisations
        </Link>
      </Button>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Journal — « {rule.name} »</h1>

      <div className="grid gap-3">
        {(logs ?? []).map((log) => (
          <Card key={log.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {new Date(log.triggered_at).toLocaleString("fr-CA")}
              </CardTitle>
              <Badge variant={log.success ? "success" : "destructive"}>{log.success ? "Succès" : "Échec"}</Badge>
            </CardHeader>
            <CardContent className="grid gap-3">
              {log.error && <p className="text-sm text-destructive">{log.error}</p>}
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Contexte</p>
                <pre className="overflow-x-auto rounded-md bg-muted p-2 text-xs">{JSON.stringify(log.context, null, 2)}</pre>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Actions exécutées</p>
                <pre className="overflow-x-auto rounded-md bg-muted p-2 text-xs">{JSON.stringify(log.actions_taken, null, 2)}</pre>
              </div>
            </CardContent>
          </Card>
        ))}
        {(logs ?? []).length === 0 && (
          <p className="py-10 text-center text-muted-foreground">Aucune exécution enregistrée pour cette règle.</p>
        )}
      </div>
    </div>
  );
}

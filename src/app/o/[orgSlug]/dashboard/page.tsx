import { createClient } from "@/lib/supabase/server";
import { requireOrgAccess } from "@/lib/data/orgs";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage({ params }: PageProps<"/o/[orgSlug]/dashboard">) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();
  const orgId = ctx.org.id;
  const nowIso = new Date().toISOString();

  const [openWorkOrders, overdueWorkOrders, pendingRequests, equipmentCount] = await Promise.all([
    supabase
      .from("work_orders")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .not("status", "in", "(closed,cancelled)"),
    supabase
      .from("work_orders")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .not("status", "in", "(closed,cancelled,completed)")
      .lt("due_at", nowIso),
    supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .in("status", ["submitted", "under_review"]),
    supabase.from("equipment").select("id", { count: "exact", head: true }).eq("org_id", orgId),
  ]);

  const kpis = [
    { label: "Bons de travail ouverts", value: openWorkOrders.count ?? 0 },
    { label: "Bons de travail en retard", value: overdueWorkOrders.count ?? 0 },
    { label: "Demandes en attente", value: pendingRequests.count ?? 0 },
    { label: "Équipements enregistrés", value: equipmentCount.count ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Tableau de bord</h1>
      <p className="mb-6 text-muted-foreground">
        Bienvenue, {ctx.org.name}. Voici l’état de votre maintenance en un coup d’œil.
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardDescription>{kpi.label}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{kpi.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

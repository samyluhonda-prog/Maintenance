import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  planned: "Planifié",
  assigned: "Assigné",
  in_progress: "En cours",
  on_hold: "En pause",
  to_review: "À vérifier",
};

export default async function MyWorkPage({ params }: PageProps<"/o/[orgSlug]/my-work">) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const { data: workOrders } = await supabase
    .from("work_orders")
    .select("id, number, title, status, priority, due_at, equipment(name)")
    .eq("org_id", ctx.org.id)
    .eq("primary_assignee_id", ctx.userId)
    .not("status", "in", "(closed,cancelled,completed)")
    .order("due_at", { ascending: true, nullsFirst: false });

  const dueToday = (workOrders ?? []).filter((w) => w.due_at && new Date(w.due_at) <= today);
  const upcoming = (workOrders ?? []).filter((w) => !w.due_at || new Date(w.due_at) > today);

  function WorkOrderCard({ wo }: { wo: NonNullable<typeof workOrders>[number] }) {
    return (
      <Link href={`/o/${orgSlug}/work-orders/${wo.id}`}>
        <Card className="transition-colors hover:border-primary/40">
          <CardContent className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="font-medium">{wo.title}</p>
              <p className="text-sm text-muted-foreground">
                {wo.number} · {wo.equipment?.name ?? "Aucun équipement"}
              </p>
            </div>
            <Badge variant={wo.priority === "critical" ? "destructive" : "outline"}>
              {STATUS_LABELS[wo.status] ?? wo.status}
            </Badge>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Mes travaux</h1>

      <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Travaux du jour</h2>
      <div className="mb-6 grid gap-2">
        {dueToday.map((wo) => (
          <WorkOrderCard key={wo.id} wo={wo} />
        ))}
        {dueToday.length === 0 && <p className="text-sm text-muted-foreground">Rien de prévu aujourd’hui.</p>}
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">À venir</h2>
      <div className="grid gap-2">
        {upcoming.map((wo) => (
          <WorkOrderCard key={wo.id} wo={wo} />
        ))}
        {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Aucun autre travail assigné.</p>}
      </div>
    </div>
  );
}

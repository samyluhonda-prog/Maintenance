import Link from "next/link";
import { LayoutGrid, List, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { KanbanBoard } from "./kanban-board";

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  open: "Ouvert",
  planned: "Planifié",
  assigned: "Assigné",
  in_progress: "En cours",
  on_hold: "En pause",
  completed: "Terminé",
  to_review: "À vérifier",
  closed: "Fermé",
  cancelled: "Annulé",
  skipped: "Sauté",
};
const PRIORITY_VARIANT: Record<string, "destructive" | "warning" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "warning",
  medium: "secondary",
  low: "outline",
};

export default async function WorkOrdersPage({ params, searchParams }: PageProps<"/o/[orgSlug]/work-orders">) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const view = sp.view === "kanban" ? "kanban" : "list";
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const { data: workOrders } = await supabase
    .from("work_orders")
    .select("id, number, title, status, priority, due_at, equipment(name), profiles:primary_assignee_id(full_name)")
    .eq("org_id", ctx.org.id)
    .not("status", "in", "(cancelled)")
    .order("created_at", { ascending: false });

  const canCreate = ctx.roleKey === "owner" || ctx.roleKey === "admin" || ctx.permissions.has("work_orders.create");

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bons de travail</h1>
          <p className="text-muted-foreground">Tous les travaux, préventifs et correctifs.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-md border">
            <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" asChild>
              <Link href={`/o/${orgSlug}/work-orders?view=list`}>
                <List className="size-4" />
              </Link>
            </Button>
            <Button variant={view === "kanban" ? "secondary" : "ghost"} size="icon" asChild>
              <Link href={`/o/${orgSlug}/work-orders?view=kanban`}>
                <LayoutGrid className="size-4" />
              </Link>
            </Button>
          </div>
          {canCreate && (
            <Button asChild>
              <Link href={`/o/${orgSlug}/work-orders/new`}>
                <Plus /> Nouveau bon de travail
              </Link>
            </Button>
          )}
        </div>
      </div>

      {view === "kanban" ? (
        <KanbanBoard
          orgSlug={orgSlug}
          workOrders={(workOrders ?? []).map((w) => ({
            id: w.id,
            number: w.number,
            title: w.title,
            priority: w.priority,
            status: w.status,
            equipmentName: w.equipment?.name ?? null,
          }))}
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Équipement</TableHead>
                <TableHead>Assigné à</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Échéance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(workOrders ?? []).map((wo) => (
                <TableRow key={wo.id}>
                  <TableCell className="font-mono text-xs">{wo.number}</TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/o/${orgSlug}/work-orders/${wo.id}`} className="hover:underline">
                      {wo.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{wo.equipment?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{wo.profiles?.full_name ?? "Non assigné"}</TableCell>
                  <TableCell>
                    <Badge variant={PRIORITY_VARIANT[wo.priority] ?? "outline"}>{wo.priority}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{STATUS_LABELS[wo.status] ?? wo.status}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {wo.due_at ? new Date(wo.due_at).toLocaleDateString("fr-CA") : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {(workOrders ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Aucun bon de travail.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

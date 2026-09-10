import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CacheWorkOrderSnapshot } from "@/components/offline/cache-work-order-snapshot";
import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { StatusBar } from "./status-bar";
import { AttachmentsPanel, CommentsPanel, PartsPanel, TasksPanel, TimePanel } from "./work-order-panels";

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

export default async function WorkOrderDetailPage({ params }: PageProps<"/o/[orgSlug]/work-orders/[id]">) {
  const { orgSlug, id } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const [
    { data: workOrder },
    { data: tasks },
    { data: usedParts },
    { data: availableParts },
    { data: timeLogs },
    { data: comments },
    { data: attachments },
  ] = await Promise.all([
    supabase
      .from("work_orders")
      .select("*, equipment(name), locations(name), profiles:primary_assignee_id(full_name)")
      .eq("id", id)
      .eq("org_id", ctx.org.id)
      .maybeSingle(),
    supabase.from("work_order_tasks").select("*").eq("work_order_id", id).order("order_index"),
    supabase.from("work_order_parts").select("*, parts(name)").eq("work_order_id", id),
    supabase
      .from("parts")
      .select("id, name, quantity_on_hand, unit")
      .eq("org_id", ctx.org.id)
      .order("name"),
    supabase
      .from("work_order_time_logs")
      .select("*, profiles(full_name)")
      .eq("work_order_id", id)
      .order("started_at", { ascending: false }),
    supabase
      .from("work_order_comments")
      .select("*, profiles(full_name)")
      .eq("work_order_id", id)
      .order("created_at"),
    supabase.from("work_order_attachments").select("*").eq("work_order_id", id).order("created_at"),
  ]);

  if (!workOrder) notFound();

  const canEdit =
    ctx.roleKey === "owner" ||
    ctx.roleKey === "admin" ||
    ctx.permissions.has("work_orders.edit") ||
    workOrder.primary_assignee_id === ctx.userId;
  const canClose = ctx.roleKey === "owner" || ctx.roleKey === "admin" || ctx.permissions.has("work_orders.close");

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <CacheWorkOrderSnapshot
        orgSlug={orgSlug}
        id={workOrder.id}
        number={workOrder.number}
        title={workOrder.title}
        status={workOrder.status}
        tasks={(tasks ?? []).map((t) => ({ id: t.id, label: t.label, is_done: t.is_done }))}
      />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{workOrder.title}</h1>
            <Badge>{STATUS_LABELS[workOrder.status] ?? workOrder.status}</Badge>
          </div>
          <p className="text-muted-foreground">
            {workOrder.number} · {workOrder.equipment?.name ?? "Aucun équipement"}
          </p>
        </div>
        <div className="flex gap-2">
          <StatusBar orgSlug={orgSlug} workOrderId={workOrder.id} status={workOrder.status} canEdit={canEdit} canClose={canClose} />
          {canEdit && (
            <Button variant="outline" size="icon" asChild>
              <Link href={`/o/${orgSlug}/work-orders/${workOrder.id}/edit`}>
                <Pencil className="size-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="grid grid-cols-2 gap-3 py-4 text-sm sm:grid-cols-4">
          <div>
            <div className="text-xs uppercase text-muted-foreground">Assigné à</div>
            <div>{workOrder.profiles?.full_name ?? "Non assigné"}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Priorité</div>
            <div className="capitalize">{workOrder.priority}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Échéance</div>
            <div>{workOrder.due_at ? new Date(workOrder.due_at).toLocaleString("fr-CA") : "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Heures (réel / estimé)</div>
            <div>
              {workOrder.actual_hours ?? 0} / {workOrder.estimate_hours ?? "—"}
            </div>
          </div>
        </CardContent>
      </Card>

      {workOrder.description && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{workOrder.description}</CardContent>
        </Card>
      )}

      {workOrder.status === "closed" && (
        <Card className="mb-6 border-success/40 bg-success/5">
          <CardHeader>
            <CardTitle>Clôture</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <p>
              <span className="font-medium">Cause : </span>
              {workOrder.failure_cause || "—"}
            </p>
            <p>
              <span className="font-medium">Solution : </span>
              {workOrder.resolution}
            </p>
            {workOrder.follow_up_required && (
              <p>
                <span className="font-medium">Suivi requis : </span>
                {workOrder.follow_up_notes || "Oui"}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Tâches</TabsTrigger>
          <TabsTrigger value="parts">Pièces</TabsTrigger>
          <TabsTrigger value="time">Temps</TabsTrigger>
          <TabsTrigger value="comments">Commentaires</TabsTrigger>
          <TabsTrigger value="files">Fichiers</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks">
          <TasksPanel orgSlug={orgSlug} orgId={ctx.org.id} workOrderId={workOrder.id} tasks={tasks ?? []} />
        </TabsContent>
        <TabsContent value="parts">
          <PartsPanel
            orgSlug={orgSlug}
            orgId={ctx.org.id}
            workOrderId={workOrder.id}
            usedParts={usedParts ?? []}
            availableParts={availableParts ?? []}
          />
        </TabsContent>
        <TabsContent value="time">
          <TimePanel orgSlug={orgSlug} orgId={ctx.org.id} workOrderId={workOrder.id} logs={timeLogs ?? []} />
        </TabsContent>
        <TabsContent value="comments">
          <CommentsPanel orgSlug={orgSlug} orgId={ctx.org.id} workOrderId={workOrder.id} comments={comments ?? []} />
        </TabsContent>
        <TabsContent value="files">
          <AttachmentsPanel orgSlug={orgSlug} orgId={ctx.org.id} workOrderId={workOrder.id} attachments={attachments ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

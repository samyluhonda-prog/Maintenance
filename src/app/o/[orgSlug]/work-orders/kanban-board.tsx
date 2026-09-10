"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { updateWorkOrderStatusAction } from "@/lib/actions/work-orders";
import { WORK_ORDER_STATUSES } from "@/lib/validation/work-orders";
import { cn } from "@/lib/utils";

const COLUMN_STATUSES = WORK_ORDER_STATUSES.filter((s) => s !== "cancelled" && s !== "skipped" && s !== "draft");

const STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  planned: "Planifié",
  assigned: "Assigné",
  in_progress: "En cours",
  on_hold: "En pause",
  completed: "Terminé",
  to_review: "À vérifier",
  closed: "Fermé",
};

const PRIORITY_VARIANT: Record<string, "destructive" | "warning" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "warning",
  medium: "secondary",
  low: "outline",
};

type WorkOrderCard = {
  id: string;
  number: string;
  title: string;
  priority: string;
  status: string;
  equipmentName: string | null;
};

export function KanbanBoard({ orgSlug, workOrders }: { orgSlug: string; workOrders: WorkOrderCard[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleDrop(e: React.DragEvent, status: string) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    startTransition(async () => {
      await updateWorkOrderStatusAction(orgSlug, id, status as (typeof WORK_ORDER_STATUSES)[number]);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {COLUMN_STATUSES.map((status) => {
        const cards = workOrders.filter((w) => w.status === status);
        return (
          <div
            key={status}
            className="w-64 shrink-0 rounded-lg bg-secondary/40 p-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-sm font-medium">{STATUS_LABELS[status] ?? status}</span>
              <span className="text-xs text-muted-foreground">{cards.length}</span>
            </div>
            <div className="grid gap-2">
              {cards.map((wo) => (
                <Link
                  key={wo.id}
                  href={`/o/${orgSlug}/work-orders/${wo.id}`}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", wo.id)}
                  className={cn(
                    "block rounded-md border bg-card p-2.5 text-sm shadow-xs hover:border-primary/40",
                  )}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{wo.number}</span>
                    <Badge variant={PRIORITY_VARIANT[wo.priority] ?? "outline"} className="text-[10px]">
                      {wo.priority}
                    </Badge>
                  </div>
                  <p className="line-clamp-2 font-medium">{wo.title}</p>
                  {wo.equipmentName && <p className="mt-1 text-xs text-muted-foreground">{wo.equipmentName}</p>}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

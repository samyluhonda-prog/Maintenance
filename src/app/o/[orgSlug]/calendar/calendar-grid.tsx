"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { rescheduleWorkOrderAction } from "@/lib/actions/calendar";
import { cn } from "@/lib/utils";

export type CalendarWorkOrder = {
  id: string;
  title: string;
  priority: string;
  dueAt: string;
  assigneeId: string | null;
  assigneeName: string | null;
};

const PRIORITY_VARIANT: Record<string, "destructive" | "warning" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "warning",
  medium: "secondary",
  low: "outline",
};

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function CalendarGrid({
  orgSlug,
  days,
  workOrdersByDay,
}: {
  orgSlug: string;
  days: Date[];
  workOrdersByDay: Map<string, CalendarWorkOrder[]>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const today = dayKey(new Date());

  function handleDrop(e: React.DragEvent, date: Date) {
    e.preventDefault();
    const workOrderId = e.dataTransfer.getData("text/plain");
    if (!workOrderId) return;
    startTransition(async () => {
      await rescheduleWorkOrderAction(orgSlug, workOrderId, date.toISOString());
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border text-sm">
      {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
        <div key={d} className="bg-secondary p-2 text-center text-xs font-medium text-muted-foreground">
          {d}
        </div>
      ))}
      {days.map((date) => {
        const key = dayKey(date);
        const items = workOrdersByDay.get(key) ?? [];
        const assigneeCounts = new Map<string, number>();
        for (const wo of items) {
          if (wo.assigneeId) assigneeCounts.set(wo.assigneeId, (assigneeCounts.get(wo.assigneeId) ?? 0) + 1);
        }

        return (
          <div
            key={key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, date)}
            className={cn("min-h-28 bg-card p-1.5", key === today && "bg-accent/10")}
          >
            <p className={cn("mb-1 text-xs text-muted-foreground", key === today && "font-bold text-accent-foreground")}>
              {date.getDate()}
            </p>
            <div className="grid gap-1">
              {items.map((wo) => {
                const conflict = wo.assigneeId ? (assigneeCounts.get(wo.assigneeId) ?? 0) > 1 : false;
                return (
                  <Link
                    key={wo.id}
                    href={`/o/${orgSlug}/work-orders/${wo.id}`}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", wo.id)}
                    className="flex items-center gap-1 rounded-sm border bg-background px-1.5 py-1 text-[11px] hover:border-primary/40"
                  >
                    {conflict && <AlertTriangle className="size-3 shrink-0 text-warning" />}
                    <span className="truncate">{wo.title}</span>
                    <Badge variant={PRIORITY_VARIANT[wo.priority] ?? "outline"} className="ml-auto shrink-0 px-1 text-[9px]">
                      {wo.priority[0].toUpperCase()}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

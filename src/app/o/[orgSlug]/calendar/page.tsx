import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { CalendarGrid, type CalendarWorkOrder } from "./calendar-grid";

const MONTH_LABEL = new Intl.DateTimeFormat("fr-CA", { month: "long", year: "numeric" });
const WEEKDAY_MONDAY_FIRST = (jsDay: number) => (jsDay === 0 ? 6 : jsDay - 1);

function buildMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  const start = new Date(firstOfMonth);
  start.setDate(start.getDate() - WEEKDAY_MONDAY_FIRST(firstOfMonth.getDay()));

  const end = new Date(lastOfMonth);
  end.setDate(end.getDate() + (6 - WEEKDAY_MONDAY_FIRST(lastOfMonth.getDay())));

  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));
  return days;
}

export default async function CalendarPage({ params, searchParams }: PageProps<"/o/[orgSlug]/calendar">) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const now = new Date();
  const monthParam = typeof sp.month === "string" ? sp.month : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [yearStr, monthStr] = monthParam.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;

  const days = buildMonthGrid(year, month);
  const rangeStart = days[0].toISOString();
  const rangeEnd = new Date(days[days.length - 1].getTime() + 86400000).toISOString();

  const technicianId = typeof sp.technicianId === "string" ? sp.technicianId : undefined;
  const equipmentId = typeof sp.equipmentId === "string" ? sp.equipmentId : undefined;

  let query = supabase
    .from("work_orders")
    .select("id, title, priority, due_at, primary_assignee_id, profiles:primary_assignee_id(full_name)")
    .eq("org_id", ctx.org.id)
    .not("due_at", "is", null)
    .gte("due_at", rangeStart)
    .lt("due_at", rangeEnd)
    .not("status", "in", "(cancelled)");

  if (technicianId) query = query.eq("primary_assignee_id", technicianId);
  if (equipmentId) query = query.eq("equipment_id", equipmentId);

  const [{ data: workOrders }, { data: memberships }] = await Promise.all([
    query,
    supabase.from("memberships").select("user_id, profiles(full_name)").eq("org_id", ctx.org.id).eq("status", "active"),
  ]);

  const workOrdersByDay = new Map<string, CalendarWorkOrder[]>();
  for (const wo of workOrders ?? []) {
    if (!wo.due_at) continue;
    const key = wo.due_at.slice(0, 10);
    const list = workOrdersByDay.get(key) ?? [];
    list.push({
      id: wo.id,
      title: wo.title,
      priority: wo.priority,
      dueAt: wo.due_at,
      assigneeId: wo.primary_assignee_id,
      assigneeName: wo.profiles?.full_name ?? null,
    });
    workOrdersByDay.set(key, list);
  }

  const prevMonthDate = new Date(year, month - 1, 1);
  const nextMonthDate = new Date(year, month + 1, 1);
  const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}`;

  function withParam(name: string, value: string | undefined) {
    const params = new URLSearchParams();
    params.set("month", monthParam);
    if (technicianId) params.set("technicianId", technicianId);
    if (equipmentId) params.set("equipmentId", equipmentId);
    if (value) params.set(name, value);
    else params.delete(name);
    return `?${params.toString()}`;
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight capitalize">{MONTH_LABEL.format(new Date(year, month, 1))}</h1>
          <p className="text-muted-foreground">Glissez un bon de travail vers une autre date pour le replanifier.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`?month=${prevMonth}`}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link href={`?month=${nextMonth}`}>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <span className="text-muted-foreground">Technicien :</span>
        <Link href={withParam("technicianId", undefined)} className={!technicianId ? "font-semibold" : "text-muted-foreground"}>
          Tous
        </Link>
        {(memberships ?? []).map((m) => (
          <Link
            key={m.user_id}
            href={withParam("technicianId", m.user_id)}
            className={technicianId === m.user_id ? "font-semibold" : "text-muted-foreground"}
          >
            {m.profiles?.full_name ?? "Utilisateur"}
          </Link>
        ))}
      </div>

      <CalendarGrid orgSlug={orgSlug} days={days} workOrdersByDay={workOrdersByDay} />

      <p className="mt-3 text-xs text-muted-foreground">
        <span className="font-medium text-warning">⚠</span> indique qu’un technicien a plus d’un bon de travail planifié ce jour-là.
      </p>
    </div>
  );
}

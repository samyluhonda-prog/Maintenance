import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ReportRange = { from: string; to: string };

export type ReportSnapshot = {
  range: ReportRange;
  openWorkOrders: number;
  overdueWorkOrders: number;
  workOrdersByStatus: { status: string; count: number }[];
  workOrdersByPriority: { priority: string; count: number }[];
  preventiveCount: number;
  correctiveCount: number;
  preventivePercent: number;
  mttrHours: number | null;
  mtbfHours: number | null;
  totalDowntimeMinutes: number;
  availabilityPercent: number | null;
  laborCost: number;
  partsCost: number;
  externalCost: number;
  totalCost: number;
  costByEquipment: { equipmentName: string; cost: number }[];
  partsConsumedUnits: number;
  inventoryValue: number;
  lowStockCount: number;
  recurringFailureEquipment: { equipmentName: string; failureCount: number }[];
  workloadByTechnician: { fullName: string; count: number }[];
  supplierSpend: { supplierName: string; orderCount: number; total: number }[];
  requestsByStatus: { status: string; count: number }[];
  failedInspections: number;
  pmComplianceRatePercent: number | null;
};

/**
 * All figures for the reports dashboard, computed for [range.from, range.to).
 * Deliberately a handful of straightforward sequential queries rather than
 * one mega-query — org data volumes for a CMMS are modest, and this keeps
 * each metric easy to audit against the schema.
 */
export async function getReportSnapshot(orgId: string, range: ReportRange): Promise<ReportSnapshot> {
  const supabase = await createClient();
  const { from, to } = range;

  const [
    { data: workOrders },
    { data: equipmentList },
    { data: parts },
    { data: requests },
    { data: procedureRuns },
    { data: pmGenerated },
    { data: purchaseOrders },
  ] = await Promise.all([
    supabase
      .from("work_orders")
      .select(
        "id, status, priority, type, created_at, due_at, closed_at, downtime_minutes, labor_cost, parts_cost, external_cost, equipment_id, primary_assignee_id, equipment(name), profiles:primary_assignee_id(full_name)",
      )
      .eq("org_id", orgId)
      .gte("created_at", from)
      .lt("created_at", to),
    supabase.from("equipment").select("id").eq("org_id", orgId),
    supabase.from("parts").select("quantity_on_hand, unit_cost, min_threshold").eq("org_id", orgId),
    supabase.from("requests").select("status").eq("org_id", orgId).gte("created_at", from).lt("created_at", to),
    supabase
      .from("procedure_runs")
      .select("status", { count: "exact", head: false })
      .eq("org_id", orgId)
      .eq("status", "failed")
      .gte("started_at", from)
      .lt("started_at", to),
    supabase
      .from("pm_generated_work_orders")
      .select("occurrence_date, work_orders(status, due_at, closed_at)")
      .eq("org_id", orgId)
      .gte("occurrence_date", from.slice(0, 10))
      .lt("occurrence_date", to.slice(0, 10)),
    supabase
      .from("purchase_orders")
      .select("total, suppliers(name)")
      .eq("org_id", orgId)
      .gte("created_at", from)
      .lt("created_at", to),
  ]);

  const wos = workOrders ?? [];
  const now = new Date();

  const openWorkOrders = wos.filter((w) => !["closed", "cancelled"].includes(w.status)).length;
  const overdueWorkOrders = wos.filter(
    (w) => w.due_at && new Date(w.due_at) < now && !["closed", "cancelled", "completed"].includes(w.status),
  ).length;

  const statusCounts = new Map<string, number>();
  const priorityCounts = new Map<string, number>();
  for (const w of wos) {
    statusCounts.set(w.status, (statusCounts.get(w.status) ?? 0) + 1);
    priorityCounts.set(w.priority, (priorityCounts.get(w.priority) ?? 0) + 1);
  }

  const preventiveCount = wos.filter((w) => w.type === "preventive").length;
  const correctiveCount = wos.filter((w) => w.type === "corrective").length;
  const totalTyped = preventiveCount + correctiveCount;
  const preventivePercent = totalTyped > 0 ? Math.round((preventiveCount / totalTyped) * 100) : 0;

  // MTTR: mean hours between creation and closure, corrective work orders only.
  const closedCorrective = wos.filter((w) => w.type === "corrective" && w.closed_at);
  const mttrHours =
    closedCorrective.length > 0
      ? closedCorrective.reduce((sum, w) => sum + (new Date(w.closed_at!).getTime() - new Date(w.created_at).getTime()) / 3600000, 0) /
        closedCorrective.length
      : null;

  // MTBF approximation: total observed hours in the range divided by the
  // number of corrective work orders raised — a fleet-wide proxy, not a
  // true per-asset MTBF (which needs continuous runtime/meter data this
  // schema doesn't track org-wide). Documented approximation.
  const rangeHours = (new Date(to).getTime() - new Date(from).getTime()) / 3600000;
  const equipmentCount = equipmentList?.length ?? 0;
  const mtbfHours = correctiveCount > 0 ? (rangeHours * equipmentCount) / correctiveCount : null;

  const totalDowntimeMinutes = wos.reduce((sum, w) => sum + (w.downtime_minutes ?? 0), 0);
  const availabilityPercent =
    equipmentCount > 0 && rangeHours > 0
      ? Math.max(0, 100 - (totalDowntimeMinutes / 60 / (equipmentCount * rangeHours)) * 100)
      : null;

  const laborCost = wos.reduce((sum, w) => sum + (w.labor_cost ?? 0), 0);
  const partsCost = wos.reduce((sum, w) => sum + (w.parts_cost ?? 0), 0);
  const externalCost = wos.reduce((sum, w) => sum + (w.external_cost ?? 0), 0);
  const totalCost = laborCost + partsCost + externalCost;

  const costByEquipmentMap = new Map<string, number>();
  for (const w of wos) {
    const name = w.equipment?.name;
    if (!name) continue;
    const cost = (w.labor_cost ?? 0) + (w.parts_cost ?? 0) + (w.external_cost ?? 0);
    costByEquipmentMap.set(name, (costByEquipmentMap.get(name) ?? 0) + cost);
  }
  const costByEquipment = Array.from(costByEquipmentMap, ([equipmentName, cost]) => ({ equipmentName, cost }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 8);

  const inventoryValue = (parts ?? []).reduce((sum, p) => sum + p.quantity_on_hand * p.unit_cost, 0);
  const lowStockCount = (parts ?? []).filter((p) => p.quantity_on_hand <= p.min_threshold).length;

  const { data: partUsage } = await supabase
    .from("part_transactions")
    .select("quantity")
    .eq("org_id", orgId)
    .eq("type", "usage")
    .gte("created_at", from)
    .lt("created_at", to);
  const partsConsumedUnits = (partUsage ?? []).reduce((sum, t) => sum + Math.abs(t.quantity), 0);

  const failureCountByEquipment = new Map<string, number>();
  for (const w of wos) {
    if (w.type !== "corrective") continue;
    const name = w.equipment?.name;
    if (!name) continue;
    failureCountByEquipment.set(name, (failureCountByEquipment.get(name) ?? 0) + 1);
  }
  const recurringFailureEquipment = Array.from(failureCountByEquipment, ([equipmentName, failureCount]) => ({
    equipmentName,
    failureCount,
  }))
    .filter((e) => e.failureCount >= 3)
    .sort((a, b) => b.failureCount - a.failureCount);

  const workloadMap = new Map<string, number>();
  for (const w of wos) {
    const name = w.profiles?.full_name;
    if (!name) continue;
    workloadMap.set(name, (workloadMap.get(name) ?? 0) + 1);
  }
  const workloadByTechnician = Array.from(workloadMap, ([fullName, count]) => ({ fullName, count })).sort(
    (a, b) => b.count - a.count,
  );

  const supplierSpendMap = new Map<string, { orderCount: number; total: number }>();
  for (const po of purchaseOrders ?? []) {
    const name = po.suppliers?.name ?? "Sans fournisseur";
    const entry = supplierSpendMap.get(name) ?? { orderCount: 0, total: 0 };
    entry.orderCount += 1;
    entry.total += po.total ?? 0;
    supplierSpendMap.set(name, entry);
  }
  const supplierSpend = Array.from(supplierSpendMap, ([supplierName, v]) => ({ supplierName, ...v })).sort(
    (a, b) => b.total - a.total,
  );

  const requestStatusCounts = new Map<string, number>();
  for (const r of requests ?? []) requestStatusCounts.set(r.status, (requestStatusCounts.get(r.status) ?? 0) + 1);

  const pmRows = pmGenerated ?? [];
  const pmClosedOnTime = pmRows.filter(
    (r) => r.work_orders?.closed_at && r.work_orders.due_at && new Date(r.work_orders.closed_at) <= new Date(r.work_orders.due_at),
  ).length;
  const pmComplianceRatePercent = pmRows.length > 0 ? Math.round((pmClosedOnTime / pmRows.length) * 100) : null;

  return {
    range,
    openWorkOrders,
    overdueWorkOrders,
    workOrdersByStatus: Array.from(statusCounts, ([status, count]) => ({ status, count })),
    workOrdersByPriority: Array.from(priorityCounts, ([priority, count]) => ({ priority, count })),
    preventiveCount,
    correctiveCount,
    preventivePercent,
    mttrHours,
    mtbfHours,
    totalDowntimeMinutes,
    availabilityPercent,
    laborCost,
    partsCost,
    externalCost,
    totalCost,
    costByEquipment,
    partsConsumedUnits,
    inventoryValue,
    lowStockCount,
    recurringFailureEquipment,
    workloadByTechnician,
    supplierSpend,
    requestsByStatus: Array.from(requestStatusCounts, ([status, count]) => ({ status, count })),
    failedInspections: procedureRuns?.length ?? 0,
    pmComplianceRatePercent,
  };
}

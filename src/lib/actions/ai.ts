"use server";

import { createClient } from "@/lib/supabase/server";
import { getAiProvider } from "@/lib/ai/provider";
import type { AiResult, FailureCauseSuggestion, FailureRiskEstimate } from "@/lib/ai/types";

export async function summarizeEquipmentHistoryAction(equipmentId: string): Promise<AiResult<{ summary: string }>> {
  const supabase = await createClient();
  const { data: equipment } = await supabase.from("equipment").select("name").eq("id", equipmentId).single();
  const { data: workOrders } = await supabase
    .from("work_orders")
    .select("title, type, status, closed_at, resolution")
    .eq("equipment_id", equipmentId)
    .order("created_at", { ascending: false })
    .limit(30);

  return getAiProvider().summarizeEquipmentHistory({
    equipmentName: equipment?.name ?? "Équipement",
    workOrders: (workOrders ?? []).map((w) => ({
      title: w.title,
      type: w.type,
      status: w.status,
      closedAt: w.closed_at,
      resolution: w.resolution,
    })),
  });
}

export async function estimateEquipmentRiskAction(equipmentId: string): Promise<AiResult<FailureRiskEstimate>> {
  const supabase = await createClient();
  const { data: equipment } = await supabase
    .from("equipment")
    .select("name, criticality")
    .eq("id", equipmentId)
    .single();

  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();
  const { count: recentFailureCount } = await supabase
    .from("work_orders")
    .select("id", { count: "exact", head: true })
    .eq("equipment_id", equipmentId)
    .eq("type", "corrective")
    .gte("created_at", ninetyDaysAgo);

  const { data: lastPm } = await supabase
    .from("work_orders")
    .select("closed_at")
    .eq("equipment_id", equipmentId)
    .eq("type", "preventive")
    .not("closed_at", "is", null)
    .order("closed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const daysSinceLastPm = lastPm?.closed_at
    ? Math.round((Date.now() - new Date(lastPm.closed_at).getTime()) / 86400000)
    : null;

  return getAiProvider().estimateFailureRisk({
    equipmentName: equipment?.name ?? "Équipement",
    recentFailureCount: recentFailureCount ?? 0,
    daysSinceLastPm,
    criticality: equipment?.criticality ?? "medium",
  });
}

export async function suggestFailureCausesAction(
  equipmentName: string,
  problemDescription: string,
): Promise<AiResult<{ suggestions: FailureCauseSuggestion[] }>> {
  if (!problemDescription.trim()) return { available: false, reason: "Aucun énoncé de problème à analyser." };
  return getAiProvider().suggestFailureCauses({ equipmentName, problemDescription, priorFailures: [] });
}

export async function structureRequestFromTextAction(
  orgId: string,
  rawText: string,
): Promise<
  AiResult<{
    title: string;
    description: string;
    urgency: "low" | "medium" | "high" | "critical";
    isEquipmentDown: boolean;
    matchedEquipmentName: string | null;
  }>
> {
  if (!rawText.trim()) return { available: false, reason: "Aucun texte à analyser." };

  const supabase = await createClient();
  const { data: equipment } = await supabase.from("equipment").select("name").eq("org_id", orgId).limit(200);

  return getAiProvider().structureRequestFromText({
    rawText,
    equipmentOptions: (equipment ?? []).map((e) => e.name),
  });
}

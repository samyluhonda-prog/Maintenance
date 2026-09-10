"use server";

import { revalidatePath } from "next/cache";

import { computeNextCalendarDueDate } from "@/lib/pm/schedule";
import { createClient } from "@/lib/supabase/server";
import { pmPlanSchema, pmTriggerSchema } from "@/lib/validation/pm-plans";
import type { Json } from "@/types/database";

import { toActionError, type ActionState } from "./action-utils";

export async function upsertPmPlanAction(
  orgSlug: string,
  orgId: string,
  raw: unknown,
): Promise<ActionState<{ id: string }>> {
  const parsed = pmPlanSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const payload = {
    org_id: orgId,
    name: input.name,
    equipment_id: input.equipmentId,
    procedure_template_id: input.procedureTemplateId || null,
    wo_title: input.woTitle,
    wo_description: input.woDescription || null,
    wo_priority: input.woPriority,
    wo_estimate_hours: input.woEstimateHours ?? null,
    default_assignee_id: input.defaultAssigneeId || null,
    lead_time_days: input.leadTimeDays,
    status: input.status,
  };

  if (input.id) {
    const { error } = await supabase.from("pm_plans").update(payload).eq("id", input.id);
    if (error) return { error: toActionError(error) };
    revalidatePath(`/o/${orgSlug}/pm-plans/${input.id}`);
    revalidatePath(`/o/${orgSlug}/pm-plans`);
    return { data: { id: input.id } };
  }

  const { data, error } = await supabase
    .from("pm_plans")
    .insert({ ...payload, created_by: user.id })
    .select("id")
    .single();
  if (error) return { error: toActionError(error) };

  revalidatePath(`/o/${orgSlug}/pm-plans`);
  return { data: { id: data.id } };
}

export async function deletePmPlanAction(orgSlug: string, pmPlanId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("pm_plans").delete().eq("id", pmPlanId);
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/pm-plans`);
  return {};
}

export async function upsertPmTriggerAction(
  orgSlug: string,
  orgId: string,
  pmPlanId: string,
  raw: unknown,
): Promise<ActionState<{ id: string }>> {
  const parsed = pmTriggerSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const input = parsed.data;

  let conditionExpression: Json | null = null;
  if (input.kind === "condition" && input.conditionExpression) {
    try {
      conditionExpression = JSON.parse(input.conditionExpression);
    } catch {
      return { error: "L’expression JSON n’est pas valide." };
    }
  }

  const supabase = await createClient();
  const basePayload = {
    org_id: orgId,
    pm_plan_id: pmPlanId,
    kind: input.kind,
    frequency_unit: input.kind === "calendar" ? input.frequencyUnit : null,
    frequency_value: input.kind === "calendar" ? input.frequencyValue : null,
    days_of_week: input.kind === "calendar" && input.daysOfWeek && input.daysOfWeek.length > 0 ? input.daysOfWeek : null,
    fixed_interval: input.kind === "calendar" ? input.fixedInterval : true,
    tolerance_days: input.kind === "calendar" ? input.toleranceDays : 0,
    meter_id: input.kind === "meter" ? input.meterId || null : null,
    meter_interval: input.kind === "meter" ? input.meterInterval : null,
    meter_operator: input.kind === "meter" ? input.meterOperator : null,
    condition_expression: input.kind === "condition" ? conditionExpression : null,
    is_active: input.isActive,
  };

  if (input.id) {
    const { error } = await supabase.from("pm_triggers").update(basePayload).eq("id", input.id);
    if (error) return { error: toActionError(error) };
    revalidatePath(`/o/${orgSlug}/pm-plans/${pmPlanId}`);
    revalidatePath(`/o/${orgSlug}/pm-plans/${pmPlanId}/edit`);
    return { data: { id: input.id } };
  }

  // Seed next_due_at so the scheduled evaluation route (api/automations/run)
  // has something to compare against right away — the first occurrence is one
  // interval out from creation, not immediately due.
  const next_due_at =
    input.kind === "calendar" && input.frequencyUnit && input.frequencyValue
      ? computeNextCalendarDueDate(new Date(), input.frequencyUnit, input.frequencyValue, input.daysOfWeek).toISOString()
      : null;

  const { data, error } = await supabase
    .from("pm_triggers")
    .insert({ ...basePayload, next_due_at })
    .select("id")
    .single();
  if (error) return { error: toActionError(error) };

  revalidatePath(`/o/${orgSlug}/pm-plans/${pmPlanId}`);
  revalidatePath(`/o/${orgSlug}/pm-plans/${pmPlanId}/edit`);
  return { data: { id: data.id } };
}

export async function deletePmTriggerAction(orgSlug: string, pmPlanId: string, triggerId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("pm_triggers").delete().eq("id", triggerId);
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/pm-plans/${pmPlanId}`);
  revalidatePath(`/o/${orgSlug}/pm-plans/${pmPlanId}/edit`);
  return {};
}

export async function togglePmTriggerActiveAction(
  orgSlug: string,
  pmPlanId: string,
  triggerId: string,
  isActive: boolean,
): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("pm_triggers").update({ is_active: isActive }).eq("id", triggerId);
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/pm-plans/${pmPlanId}`);
  revalidatePath(`/o/${orgSlug}/pm-plans/${pmPlanId}/edit`);
  return {};
}

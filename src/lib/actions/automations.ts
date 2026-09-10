"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { automationRuleSchema } from "@/lib/validation/automations";
import type { Database } from "@/types/database";

import { toActionError, type ActionState } from "./action-utils";

export async function upsertAutomationRuleAction(
  orgSlug: string,
  orgId: string,
  raw: unknown,
): Promise<ActionState<{ id: string }>> {
  const parsed = automationRuleSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const conditions: Database["public"]["Tables"]["automation_rules"]["Insert"]["conditions"] = input.conditionField
    ? { field: input.conditionField, operator: input.conditionOperator ?? "eq", value: input.conditionValue ?? "" }
    : {};

  const actions = input.actions.map((a) => {
    let params: Record<string, unknown> = {};
    if (a.paramsJson) {
      try {
        params = JSON.parse(a.paramsJson);
      } catch {
        params = {};
      }
    }
    return { type: a.type, params };
  }) as Database["public"]["Tables"]["automation_rules"]["Insert"]["actions"];

  const payload = {
    org_id: orgId,
    name: input.name,
    description: input.description || null,
    is_active: input.isActive,
    trigger_event: input.triggerEvent,
    conditions,
    actions,
  };

  if (input.id) {
    const { error } = await supabase.from("automation_rules").update(payload).eq("id", input.id);
    if (error) return { error: toActionError(error) };
    revalidatePath(`/o/${orgSlug}/automations/${input.id}/edit`);
    revalidatePath(`/o/${orgSlug}/automations`);
    return { data: { id: input.id } };
  }

  const { data, error } = await supabase
    .from("automation_rules")
    .insert({ ...payload, created_by: user.id })
    .select("id")
    .single();
  if (error) return { error: toActionError(error) };

  revalidatePath(`/o/${orgSlug}/automations`);
  return { data: { id: data.id } };
}

export async function deleteAutomationRuleAction(orgSlug: string, ruleId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("automation_rules").delete().eq("id", ruleId);
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/automations`);
  return {};
}

export async function toggleAutomationRuleActiveAction(
  orgSlug: string,
  ruleId: string,
  isActive: boolean,
): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("automation_rules").update({ is_active: isActive }).eq("id", ruleId);
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/automations`);
  return {};
}

/**
 * Manually fires the scheduled PM evaluation (normally invoked hourly by an
 * external cron hitting POST /api/automations/run — see that route's header
 * comment). This calls the route handler itself, server-side, so the shared
 * secret (AUTOMATIONS_CRON_SECRET) never has to be shipped to the browser —
 * it never appears in a client component or a NEXT_PUBLIC_ env var.
 */
export async function runAutomationsNowAction(
  orgSlug: string,
): Promise<ActionState<{ evaluated: number; generated: number; errors: string[] }>> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.AUTOMATIONS_CRON_SECRET;
  if (!siteUrl || !secret) return { error: "AUTOMATIONS_CRON_SECRET ou NEXT_PUBLIC_SITE_URL n’est pas configuré." };

  try {
    const res = await fetch(new URL("/api/automations/run", siteUrl), {
      method: "POST",
      headers: { "x-automations-secret": secret },
      cache: "no-store",
    });
    const body = await res.json();
    if (!res.ok) return { error: typeof body?.error === "string" ? body.error : "Échec de l’exécution des automatisations." };
    revalidatePath(`/o/${orgSlug}/pm-plans`);
    return { data: body };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Échec de l’exécution des automatisations." };
  }
}

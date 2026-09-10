"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { meterReadingSchema, meterSchema } from "@/lib/validation/meters";

import { toActionError, type ActionState } from "./action-utils";

export async function upsertMeterAction(
  orgSlug: string,
  orgId: string,
  raw: unknown,
): Promise<ActionState<{ id: string }>> {
  const parsed = meterSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const input = parsed.data;

  const supabase = await createClient();
  const payload = {
    org_id: orgId,
    equipment_id: input.equipmentId,
    name: input.name,
    unit: input.unit,
    kind: input.kind,
    source: input.source,
    is_cumulative: input.isCumulative,
  };

  if (input.id) {
    const { error } = await supabase.from("meters").update(payload).eq("id", input.id);
    if (error) return { error: toActionError(error) };
    revalidatePath(`/o/${orgSlug}/meters/${input.id}`);
    revalidatePath(`/o/${orgSlug}/meters`);
    revalidatePath(`/o/${orgSlug}/equipment/${input.equipmentId}`);
    return { data: { id: input.id } };
  }

  const { data, error } = await supabase.from("meters").insert(payload).select("id").single();
  if (error) return { error: toActionError(error) };

  revalidatePath(`/o/${orgSlug}/meters`);
  revalidatePath(`/o/${orgSlug}/equipment/${input.equipmentId}`);
  return { data: { id: data.id } };
}

export async function deleteMeterAction(orgSlug: string, meterId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { data: meter } = await supabase.from("meters").select("equipment_id").eq("id", meterId).maybeSingle();

  const { error } = await supabase.from("meters").delete().eq("id", meterId);
  if (error) return { error: toActionError(error) };

  revalidatePath(`/o/${orgSlug}/meters`);
  if (meter) revalidatePath(`/o/${orgSlug}/equipment/${meter.equipment_id}`);
  return {};
}

export async function recordMeterReadingAction(
  orgSlug: string,
  orgId: string,
  meterId: string,
  raw: unknown,
): Promise<ActionState> {
  const parsed = meterReadingSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const { data: meter } = await supabase.from("meters").select("equipment_id").eq("id", meterId).maybeSingle();
  if (!meter) return { error: "Compteur introuvable." };

  const { error } = await supabase.from("meter_readings").insert({
    org_id: orgId,
    meter_id: meterId,
    value: input.value,
    recorded_at: new Date(input.recordedAt).toISOString(),
    recorded_by: user.id,
    source: "manual",
    note: input.note || null,
  });
  if (error) return { error: toActionError(error) };

  revalidatePath(`/o/${orgSlug}/meters/${meterId}`);
  revalidatePath(`/o/${orgSlug}/meters`);
  revalidatePath(`/o/${orgSlug}/equipment/${meter.equipment_id}`);
  return {};
}

"use server";

import { revalidatePath } from "next/cache";

import { evaluateAutomations } from "@/lib/automations/evaluate";
import { createClient } from "@/lib/supabase/server";
import { generateShortCode } from "@/lib/short-code";
import { partCsvRowSchema, partSchema, partTransactionSchema, type PartCsvRow } from "@/lib/validation/parts";

import { toActionError, type ActionState } from "./action-utils";

/** Postgres names the `unique (org_id, number)` table constraint this way. */
const NUMBER_CONFLICT_CONSTRAINT = "parts_org_id_number_key";

export async function upsertPartAction(
  orgSlug: string,
  orgId: string,
  raw: unknown,
): Promise<ActionState<{ id: string }>> {
  const parsed = partSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const input = parsed.data;

  const supabase = await createClient();
  const payload = {
    org_id: orgId,
    number: input.number,
    name: input.name,
    description: input.description || null,
    category: input.category || null,
    manufacturer: input.manufacturer || null,
    manufacturer_part_number: input.manufacturerPartNumber || null,
    unit: input.unit,
    unit_cost: input.unitCost,
    storage_location_id: input.storageLocationId || null,
    min_threshold: input.minThreshold,
    optimal_level: input.optimalLevel ?? null,
    lead_time_days: input.leadTimeDays ?? null,
    primary_supplier_id: input.primarySupplierId || null,
  };

  if (input.id) {
    const { error } = await supabase.from("parts").update(payload).eq("id", input.id);
    if (error) {
      if (error.code === "23505" && error.message.includes(NUMBER_CONFLICT_CONSTRAINT)) {
        return { error: "Ce numéro de pièce existe déjà dans cette organisation." };
      }
      return { error: toActionError(error) };
    }
    revalidatePath(`/o/${orgSlug}/parts/${input.id}`);
    revalidatePath(`/o/${orgSlug}/parts`);
    return { data: { id: input.id } };
  }

  // Retry on the rare qr_code collision (32^8 space, but the unique
  // constraint is the real guarantee — this just makes the 1-in-a-billion
  // case self-healing instead of a hard failure).
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from("parts")
      .insert({ ...payload, qr_code: generateShortCode("PC") })
      .select("id")
      .single();

    if (!error) {
      revalidatePath(`/o/${orgSlug}/parts`);
      return { data: { id: data.id } };
    }
    if (error.code === "23505" && error.message.includes(NUMBER_CONFLICT_CONSTRAINT)) {
      return { error: "Ce numéro de pièce existe déjà dans cette organisation." };
    }
    if (error.code !== "23505") return { error: toActionError(error) };
  }
  return { error: "Impossible de générer un code QR unique. Réessayez." };
}

export async function deletePartAction(orgSlug: string, partId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("parts").delete().eq("id", partId);
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/parts`);
  return {};
}

export async function importPartsCsvAction(
  orgSlug: string,
  orgId: string,
  rows: unknown[],
): Promise<ActionState<{ imported: number; failed: number }>> {
  const supabase = await createClient();
  let imported = 0;
  let failed = 0;

  for (const raw of rows) {
    const parsed = partCsvRowSchema.safeParse(raw);
    if (!parsed.success) {
      failed++;
      continue;
    }
    const row: PartCsvRow = parsed.data;
    const { error } = await supabase.from("parts").insert({
      org_id: orgId,
      number: row.number,
      name: row.name,
      description: row.description || null,
      category: row.category || null,
      manufacturer: row.manufacturer || null,
      manufacturer_part_number: row.manufacturer_part_number || null,
      unit: row.unit || "unit",
      unit_cost: row.unit_cost ?? 0,
      min_threshold: row.min_threshold ?? 0,
      optimal_level: row.optimal_level ?? null,
      lead_time_days: row.lead_time_days ?? null,
      qr_code: generateShortCode("PC"),
    });
    if (error) failed++;
    else imported++;
  }

  revalidatePath(`/o/${orgSlug}/parts`);
  return { data: { imported, failed } };
}

export async function recordPartTransactionAction(
  orgSlug: string,
  orgId: string,
  partId: string,
  raw: unknown,
): Promise<ActionState> {
  const parsed = partTransactionSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const { error } = await supabase.from("part_transactions").insert({
    org_id: orgId,
    part_id: partId,
    type: parsed.data.type,
    quantity: parsed.data.quantity,
    note: parsed.data.note || null,
    performed_by: user.id,
  });
  if (error) return { error: toActionError(error) };

  // part.below_min hook: the app.apply_part_transaction trigger just updated
  // the running quantity_on_hand balance — re-read it and fire the
  // automation event if stock is now under the reorder threshold.
  // Fire-and-forget: a notification/automation failure must never block the
  // transaction that was just successfully recorded.
  const { data: updatedPart } = await supabase.from("parts").select("quantity_on_hand, min_threshold").eq("id", partId).maybeSingle();
  if (updatedPart && updatedPart.quantity_on_hand < updatedPart.min_threshold) {
    void evaluateAutomations(orgId, "part.below_min", { partId }).catch(() => {});
  }

  revalidatePath(`/o/${orgSlug}/parts/${partId}`);
  revalidatePath(`/o/${orgSlug}/parts`);
  return {};
}

export async function linkEquipmentPartAction(
  orgSlug: string,
  orgId: string,
  partId: string,
  equipmentId: string,
): Promise<ActionState> {
  if (!equipmentId) return { error: "Choisissez un équipement." };
  const supabase = await createClient();
  const { error } = await supabase.from("equipment_parts").insert({ org_id: orgId, equipment_id: equipmentId, part_id: partId });
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/parts/${partId}`);
  return {};
}

export async function unlinkEquipmentPartAction(
  orgSlug: string,
  partId: string,
  equipmentId: string,
): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("equipment_parts")
    .delete()
    .eq("part_id", partId)
    .eq("equipment_id", equipmentId);
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/parts/${partId}`);
  return {};
}

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_PHOTO_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

export async function uploadPartPhotoAction(
  orgSlug: string,
  orgId: string,
  partId: string,
  formData: FormData,
): Promise<ActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Aucun fichier sélectionné." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Le fichier dépasse la taille maximale de 15 Mo." };
  if (!ALLOWED_PHOTO_MIME.has(file.type)) return { error: "Type de fichier non autorisé (images seulement)." };

  const supabase = await createClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${orgId}/parts/${partId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return { error: uploadError.message };

  const { error: updateError } = await supabase.from("parts").update({ photo_path: path }).eq("id", partId);
  if (updateError) {
    await supabase.storage.from("documents").remove([path]);
    return { error: toActionError(updateError) };
  }

  revalidatePath(`/o/${orgSlug}/parts/${partId}`);
  return {};
}

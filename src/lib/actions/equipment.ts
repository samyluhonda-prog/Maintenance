"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { generateShortCode } from "@/lib/short-code";
import { equipmentCsvRowSchema, equipmentSchema, type EquipmentCsvRow } from "@/lib/validation/equipment";

import { toActionError, type ActionState } from "./action-utils";

export async function upsertEquipmentAction(
  orgSlug: string,
  orgId: string,
  raw: unknown,
): Promise<ActionState<{ id: string }>> {
  const parsed = equipmentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const input = parsed.data;

  const supabase = await createClient();
  const payload = {
    org_id: orgId,
    name: input.name,
    internal_code: input.internalCode || null,
    category: input.category || null,
    status: input.status,
    criticality: input.criticality,
    manufacturer: input.manufacturer || null,
    model: input.model || null,
    serial_number: input.serialNumber || null,
    location_id: input.locationId || null,
    parent_equipment_id: input.parentEquipmentId || null,
    supplier_id: input.supplierId || null,
    commissioned_at: input.commissionedAt || null,
    warranty_expires_at: input.warrantyExpiresAt || null,
    acquisition_cost: input.acquisitionCost ?? null,
    expected_lifetime_months: input.expectedLifetimeMonths ?? null,
  };

  if (input.id) {
    const { error } = await supabase.from("equipment").update(payload).eq("id", input.id);
    if (error) return { error: toActionError(error) };
    revalidatePath(`/o/${orgSlug}/equipment/${input.id}`);
    revalidatePath(`/o/${orgSlug}/equipment`);
    return { data: { id: input.id } };
  }

  // Retry on the rare qr_code collision (32^8 space, but the unique
  // constraint is the real guarantee — this just makes the 1-in-a-billion
  // case self-healing instead of a hard failure).
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from("equipment")
      .insert({ ...payload, qr_code: generateShortCode("EQ") })
      .select("id")
      .single();

    if (!error) {
      revalidatePath(`/o/${orgSlug}/equipment`);
      return { data: { id: data.id } };
    }
    if (error.code !== "23505") return { error: toActionError(error) };
  }
  return { error: "Impossible de générer un code QR unique. Réessayez." };
}

export async function deleteEquipmentAction(orgSlug: string, equipmentId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("equipment").delete().eq("id", equipmentId);
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/equipment`);
  return {};
}

export async function importEquipmentCsvAction(
  orgSlug: string,
  orgId: string,
  rows: unknown[],
): Promise<ActionState<{ imported: number; failed: number }>> {
  const supabase = await createClient();
  let imported = 0;
  let failed = 0;

  for (const raw of rows) {
    const parsed = equipmentCsvRowSchema.safeParse(raw);
    if (!parsed.success) {
      failed++;
      continue;
    }
    const row: EquipmentCsvRow = parsed.data;
    const { error } = await supabase.from("equipment").insert({
      org_id: orgId,
      name: row.name,
      internal_code: row.internal_code || null,
      category: row.category || null,
      manufacturer: row.manufacturer || null,
      model: row.model || null,
      serial_number: row.serial_number || null,
      criticality: row.criticality ?? "medium",
      status: row.status ?? "operational",
      qr_code: generateShortCode("EQ"),
    });
    if (error) failed++;
    else imported++;
  }

  revalidatePath(`/o/${orgSlug}/equipment`);
  return { data: { imported, failed } };
}

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

export async function uploadEquipmentDocumentAction(
  orgSlug: string,
  orgId: string,
  equipmentId: string,
  kind: "photo" | "manual" | "plan" | "document",
  formData: FormData,
): Promise<ActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Aucun fichier sélectionné." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Le fichier dépasse la taille maximale de 15 Mo." };
  if (!ALLOWED_MIME.has(file.type)) {
    return { error: "Type de fichier non autorisé (images ou PDF seulement)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${orgId}/${equipmentId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("equipment-media")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return { error: uploadError.message };

  const { error: insertError } = await supabase.from("equipment_documents").insert({
    org_id: orgId,
    equipment_id: equipmentId,
    kind,
    storage_path: path,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    uploaded_by: user.id,
  });
  if (insertError) {
    await supabase.storage.from("equipment-media").remove([path]);
    return { error: toActionError(insertError) };
  }

  revalidatePath(`/o/${orgSlug}/equipment/${equipmentId}`);
  return {};
}

export async function deleteEquipmentDocumentAction(orgSlug: string, documentId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("equipment_documents")
    .select("equipment_id, storage_path")
    .eq("id", documentId)
    .single();
  if (!doc) return { error: "Document introuvable." };

  await supabase.storage.from("equipment-media").remove([doc.storage_path]);
  const { error } = await supabase.from("equipment_documents").delete().eq("id", documentId);
  if (error) return { error: toActionError(error) };

  revalidatePath(`/o/${orgSlug}/equipment/${doc.equipment_id}`);
  return {};
}

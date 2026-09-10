"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { supplierDocumentSchema, supplierSchema } from "@/lib/validation/suppliers";

import { toActionError, type ActionState } from "./action-utils";

export async function upsertSupplierAction(
  orgSlug: string,
  orgId: string,
  raw: unknown,
): Promise<ActionState<{ id: string }>> {
  const parsed = supplierSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const input = parsed.data;

  const supabase = await createClient();
  const payload = {
    org_id: orgId,
    name: input.name,
    contact_name: input.contactName || null,
    email: input.email || null,
    phone: input.phone || null,
    address: input.address || null,
    notes: input.notes || null,
    rating: input.rating ?? null,
  };

  if (input.id) {
    const { error } = await supabase.from("suppliers").update(payload).eq("id", input.id);
    if (error) return { error: toActionError(error) };
    revalidatePath(`/o/${orgSlug}/suppliers/${input.id}`);
    revalidatePath(`/o/${orgSlug}/suppliers`);
    return { data: { id: input.id } };
  }

  const { data, error } = await supabase.from("suppliers").insert(payload).select("id").single();
  if (error) return { error: toActionError(error) };

  revalidatePath(`/o/${orgSlug}/suppliers`);
  return { data: { id: data.id } };
}

export async function deleteSupplierAction(orgSlug: string, supplierId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").delete().eq("id", supplierId);
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/suppliers`);
  return {};
}

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function uploadSupplierDocumentAction(
  orgSlug: string,
  orgId: string,
  supplierId: string,
  formData: FormData,
): Promise<ActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Aucun fichier sélectionné." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Le fichier dépasse la taille maximale de 15 Mo." };
  if (!ALLOWED_MIME.has(file.type)) return { error: "Type de fichier non autorisé." };

  const parsed = supplierDocumentSchema.safeParse({
    title: formData.get("title"),
    kind: formData.get("kind"),
    startDate: formData.get("startDate") ?? "",
    endDate: formData.get("endDate") ?? "",
    value: formData.get("value") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const input = parsed.data;

  const supabase = await createClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${orgId}/suppliers/${supplierId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return { error: uploadError.message };

  const { error: insertError } = await supabase.from("supplier_documents").insert({
    org_id: orgId,
    supplier_id: supplierId,
    title: input.title,
    kind: input.kind,
    storage_path: path,
    start_date: input.startDate || null,
    end_date: input.endDate || null,
    value: input.value ?? null,
  });
  if (insertError) {
    await supabase.storage.from("documents").remove([path]);
    return { error: toActionError(insertError) };
  }

  revalidatePath(`/o/${orgSlug}/suppliers/${supplierId}`);
  return {};
}

export async function deleteSupplierDocumentAction(orgSlug: string, documentId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("supplier_documents")
    .select("supplier_id, storage_path")
    .eq("id", documentId)
    .single();
  if (!doc) return { error: "Document introuvable." };

  await supabase.storage.from("documents").remove([doc.storage_path]);
  const { error } = await supabase.from("supplier_documents").delete().eq("id", documentId);
  if (error) return { error: toActionError(error) };

  revalidatePath(`/o/${orgSlug}/suppliers/${doc.supplier_id}`);
  return {};
}

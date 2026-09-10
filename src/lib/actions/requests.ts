"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { reviewRequestSchema, requestSchema } from "@/lib/validation/requests";

import { toActionError, type ActionState } from "./action-utils";

export async function createRequestAction(
  orgSlug: string,
  orgId: string,
  raw: unknown,
): Promise<ActionState<{ id: string }>> {
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const { data: number, error: numberError } = await supabase.rpc("next_number", {
    p_org_id: orgId,
    p_key: "request",
    p_prefix: "REQ",
  });
  if (numberError) return { error: toActionError(numberError) };

  const { data, error } = await supabase
    .from("requests")
    .insert({
      org_id: orgId,
      number: number!,
      title: input.title,
      description: input.description || null,
      equipment_id: input.equipmentId || null,
      location_id: input.locationId || null,
      category: input.category || null,
      urgency: input.urgency,
      is_equipment_down: input.isEquipmentDown,
      status: input.submit ? "submitted" : "draft",
      requested_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: toActionError(error) };

  revalidatePath(`/o/${orgSlug}/requests`);
  return { data: { id: data.id } };
}

export async function submitDraftRequestAction(orgSlug: string, requestId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("requests").update({ status: "submitted" }).eq("id", requestId);
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/requests/${requestId}`);
  return {};
}

export async function reviewRequestAction(
  orgSlug: string,
  requestId: string,
  raw: unknown,
): Promise<ActionState> {
  const parsed = reviewRequestSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const { error } = await supabase
    .from("requests")
    .update({
      status: parsed.data.decision,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: parsed.data.note || null,
    })
    .eq("id", requestId)
    .eq("status", "submitted");

  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/requests/${requestId}`);
  revalidatePath(`/o/${orgSlug}/requests`);
  return {};
}

/**
 * Converts an approved request into a work order without re-keying any data
 * (title/description/equipment/location/urgency-as-priority carry over
 * directly), then links the two records both ways.
 */
export async function convertRequestToWorkOrderAction(
  orgSlug: string,
  orgId: string,
  requestId: string,
): Promise<ActionState<{ workOrderId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const { data: request } = await supabase
    .from("requests")
    .select("*")
    .eq("id", requestId)
    .eq("status", "approved")
    .maybeSingle();
  if (!request) return { error: "Demande introuvable ou non approuvée." };

  const { data: number, error: numberError } = await supabase.rpc("next_number", {
    p_org_id: orgId,
    p_key: "work_order",
    p_prefix: "WO",
  });
  if (numberError) return { error: toActionError(numberError) };

  const { data: workOrder, error: woError } = await supabase
    .from("work_orders")
    .insert({
      org_id: orgId,
      number: number!,
      title: request.title,
      description: request.description,
      type: "corrective",
      priority: request.urgency,
      status: "open",
      equipment_id: request.equipment_id,
      location_id: request.location_id,
      request_id: request.id,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (woError) return { error: toActionError(woError) };

  const { error: linkError } = await supabase
    .from("requests")
    .update({ status: "converted", converted_work_order_id: workOrder.id })
    .eq("id", requestId);
  if (linkError) return { error: toActionError(linkError) };

  revalidatePath(`/o/${orgSlug}/requests/${requestId}`);
  revalidatePath(`/o/${orgSlug}/work-orders`);
  return { data: { workOrderId: workOrder.id } };
}

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf", "video/mp4", "video/quicktime"]);

export async function uploadRequestAttachmentAction(
  orgSlug: string,
  orgId: string,
  requestId: string,
  formData: FormData,
): Promise<ActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Aucun fichier sélectionné." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Le fichier dépasse la taille maximale de 15 Mo." };
  if (!ALLOWED_MIME.has(file.type)) return { error: "Type de fichier non autorisé." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${orgId}/${requestId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("request-media")
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const { error } = await supabase.from("request_attachments").insert({
    org_id: orgId,
    request_id: requestId,
    storage_path: path,
    file_name: file.name,
    mime_type: file.type,
    uploaded_by: user.id,
  });
  if (error) {
    await supabase.storage.from("request-media").remove([path]);
    return { error: toActionError(error) };
  }

  revalidatePath(`/o/${orgSlug}/requests/${requestId}`);
  return {};
}

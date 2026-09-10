"use server";

import { revalidatePath } from "next/cache";

import { evaluateAutomations } from "@/lib/automations/evaluate";
import { createClient } from "@/lib/supabase/server";
import {
  closeWorkOrderSchema,
  timeLogSchema,
  workOrderSchema,
  WORK_ORDER_STATUSES,
} from "@/lib/validation/work-orders";

import { toActionError, type ActionState } from "./action-utils";

export async function upsertWorkOrderAction(
  orgSlug: string,
  orgId: string,
  raw: unknown,
): Promise<ActionState<{ id: string }>> {
  const parsed = workOrderSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const payload = {
    org_id: orgId,
    title: input.title,
    description: input.description || null,
    type: input.type,
    priority: input.priority,
    equipment_id: input.equipmentId || null,
    location_id: input.locationId || null,
    primary_assignee_id: input.primaryAssigneeId || null,
    scheduled_start: input.scheduledStart || null,
    due_at: input.dueAt || null,
    estimate_hours: input.estimateHours ?? null,
    requires_lockout: input.requiresLockout,
    safety_notes: input.safetyNotes || null,
  };

  if (input.id) {
    const { error } = await supabase
      .from("work_orders")
      .update({
        ...payload,
        status: input.primaryAssigneeId ? "assigned" : undefined,
      })
      .eq("id", input.id);
    if (error) return { error: toActionError(error) };
    revalidatePath(`/o/${orgSlug}/work-orders/${input.id}`);
    return { data: { id: input.id } };
  }

  const { data: number, error: numberError } = await supabase.rpc("next_number", {
    p_org_id: orgId,
    p_key: "work_order",
    p_prefix: "WO",
  });
  if (numberError) return { error: toActionError(numberError) };

  const { data, error } = await supabase
    .from("work_orders")
    .insert({
      ...payload,
      number: number!,
      status: input.primaryAssigneeId ? "assigned" : "open",
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) return { error: toActionError(error) };

  revalidatePath(`/o/${orgSlug}/work-orders`);
  return { data: { id: data.id } };
}

export async function updateWorkOrderStatusAction(
  orgSlug: string,
  workOrderId: string,
  status: (typeof WORK_ORDER_STATUSES)[number],
): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("work_orders").update({ status }).eq("id", workOrderId);
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/work-orders/${workOrderId}`);
  revalidatePath(`/o/${orgSlug}/work-orders`);
  return {};
}

export async function closeWorkOrderAction(
  orgSlug: string,
  workOrderId: string,
  raw: unknown,
): Promise<ActionState> {
  const parsed = closeWorkOrderSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const { error } = await supabase
    .from("work_orders")
    .update({
      status: "closed",
      failure_cause: parsed.data.failureCause || null,
      resolution: parsed.data.resolution,
      follow_up_required: parsed.data.followUpRequired,
      follow_up_notes: parsed.data.followUpNotes || null,
      closed_at: new Date().toISOString(),
      closed_by: user.id,
    })
    .eq("id", workOrderId);
  if (error) return { error: toActionError(error) };

  revalidatePath(`/o/${orgSlug}/work-orders/${workOrderId}`);
  return {};
}

export async function addWorkOrderTaskAction(orgSlug: string, orgId: string, workOrderId: string, label: string): Promise<ActionState> {
  if (!label.trim()) return { error: "Le libellé est requis." };
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("work_order_tasks")
    .select("order_index")
    .eq("work_order_id", workOrderId)
    .order("order_index", { ascending: false })
    .limit(1);

  const { error } = await supabase.from("work_order_tasks").insert({
    org_id: orgId,
    work_order_id: workOrderId,
    label: label.trim(),
    order_index: (existing?.[0]?.order_index ?? 0) + 1,
  });
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/work-orders/${workOrderId}`);
  return {};
}

export async function toggleWorkOrderTaskAction(orgSlug: string, taskId: string, isDone: boolean): Promise<ActionState> {
  const supabase = await createClient();
  const { data: task, error } = await supabase
    .from("work_order_tasks")
    .update({ is_done: isDone })
    .eq("id", taskId)
    .select("work_order_id")
    .single();
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/work-orders/${task.work_order_id}`);
  return {};
}

export async function addWorkOrderPartAction(
  orgSlug: string,
  orgId: string,
  workOrderId: string,
  partId: string,
  quantity: number,
): Promise<ActionState> {
  if (quantity <= 0) return { error: "La quantité doit être supérieure à zéro." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const { data: part } = await supabase.from("parts").select("unit_cost").eq("id", partId).single();

  const { error: woPartError } = await supabase.from("work_order_parts").insert({
    org_id: orgId,
    work_order_id: workOrderId,
    part_id: partId,
    quantity_used: quantity,
    unit_cost: part?.unit_cost ?? 0,
  });
  if (woPartError) return { error: toActionError(woPartError) };

  const { error: txError } = await supabase.from("part_transactions").insert({
    org_id: orgId,
    part_id: partId,
    type: "usage",
    quantity,
    unit_cost: part?.unit_cost ?? 0,
    work_order_id: workOrderId,
    performed_by: user.id,
    note: "Utilisée sur bon de travail",
  });
  if (txError) return { error: toActionError(txError) };

  // part.below_min hook: re-read the running balance the "usage" insert just
  // decremented (via the app.apply_part_transaction trigger) and fire the
  // automation event if stock is now under the reorder threshold.
  // Fire-and-forget: a notification/automation failure must never block the
  // technician from recording parts used on a work order.
  const { data: updatedPart } = await supabase.from("parts").select("quantity_on_hand, min_threshold").eq("id", partId).maybeSingle();
  if (updatedPart && updatedPart.quantity_on_hand < updatedPart.min_threshold) {
    void evaluateAutomations(orgId, "part.below_min", { partId }).catch(() => {});
  }

  revalidatePath(`/o/${orgSlug}/work-orders/${workOrderId}`);
  return {};
}

export async function addTimeLogAction(
  orgSlug: string,
  orgId: string,
  workOrderId: string,
  raw: unknown,
): Promise<ActionState> {
  const parsed = timeLogSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const started = new Date(parsed.data.startedAt);
  const ended = new Date(parsed.data.endedAt);
  const minutes = Math.max(0, Math.round((ended.getTime() - started.getTime()) / 60000));

  const { error } = await supabase.from("work_order_time_logs").insert({
    org_id: orgId,
    work_order_id: workOrderId,
    user_id: user.id,
    started_at: started.toISOString(),
    ended_at: ended.toISOString(),
    minutes,
    note: parsed.data.note || null,
  });
  if (error) return { error: toActionError(error) };

  const { data: totalMinutes } = await supabase
    .from("work_order_time_logs")
    .select("minutes")
    .eq("work_order_id", workOrderId);
  const sumHours = (totalMinutes ?? []).reduce((acc, r) => acc + (r.minutes ?? 0), 0) / 60;
  await supabase.from("work_orders").update({ actual_hours: sumHours }).eq("id", workOrderId);

  revalidatePath(`/o/${orgSlug}/work-orders/${workOrderId}`);
  return {};
}

export async function addWorkOrderCommentAction(
  orgSlug: string,
  orgId: string,
  workOrderId: string,
  body: string,
): Promise<ActionState> {
  if (!body.trim()) return { error: "Le commentaire est vide." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const { error } = await supabase.from("work_order_comments").insert({
    org_id: orgId,
    work_order_id: workOrderId,
    user_id: user.id,
    body: body.trim(),
  });
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/work-orders/${workOrderId}`);
  return {};
}

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
  "video/mp4",
  "video/quicktime",
]);

export async function uploadWorkOrderAttachmentAction(
  orgSlug: string,
  orgId: string,
  workOrderId: string,
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
  const path = `${orgId}/${workOrderId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("work-order-media")
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const { error } = await supabase.from("work_order_attachments").insert({
    org_id: orgId,
    work_order_id: workOrderId,
    storage_path: path,
    file_name: file.name,
    mime_type: file.type,
    uploaded_by: user.id,
  });
  if (error) {
    await supabase.storage.from("work-order-media").remove([path]);
    return { error: toActionError(error) };
  }

  revalidatePath(`/o/${orgSlug}/work-orders/${workOrderId}`);
  return {};
}

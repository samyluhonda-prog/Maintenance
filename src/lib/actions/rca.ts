"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  correctiveActionSchema,
  fiveWhySchema,
  rcaCauseSchema,
  rcaRecordSchema,
} from "@/lib/validation/rca";

import { toActionError, type ActionState } from "./action-utils";

export async function createRcaAction(
  orgSlug: string,
  orgId: string,
  raw: unknown,
): Promise<ActionState<{ id: string }>> {
  const parsed = rcaRecordSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const { data, error } = await supabase
    .from("rca_records")
    .insert({
      org_id: orgId,
      title: parsed.data.title,
      problem_statement: parsed.data.problemStatement,
      equipment_id: parsed.data.equipmentId,
      work_order_id: parsed.data.workOrderId || null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) return { error: toActionError(error) };

  revalidatePath(`/o/${orgSlug}/rca`);
  return { data: { id: data.id } };
}

export async function updateRcaStatusAction(
  orgSlug: string,
  rcaId: string,
  status: "open" | "in_progress" | "completed",
): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("rca_records").update({ status }).eq("id", rcaId);
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/rca/${rcaId}`);
  return {};
}

export async function addFiveWhyAction(
  orgSlug: string,
  orgId: string,
  rcaId: string,
  orderIndex: number,
  raw: unknown,
): Promise<ActionState> {
  const parsed = fiveWhySchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const supabase = await createClient();
  const { error } = await supabase.from("rca_five_whys").insert({
    org_id: orgId,
    rca_id: rcaId,
    order_index: orderIndex,
    question: parsed.data.question,
    answer: parsed.data.answer,
  });
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/rca/${rcaId}`);
  return {};
}

export async function addRcaCauseAction(
  orgSlug: string,
  orgId: string,
  rcaId: string,
  raw: unknown,
): Promise<ActionState> {
  const parsed = rcaCauseSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const supabase = await createClient();
  const { error } = await supabase.from("rca_causes").insert({
    org_id: orgId,
    rca_id: rcaId,
    category: parsed.data.category,
    description: parsed.data.description,
  });
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/rca/${rcaId}`);
  return {};
}

export async function deleteRcaCauseAction(orgSlug: string, causeId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { data: cause, error } = await supabase
    .from("rca_causes")
    .delete()
    .eq("id", causeId)
    .select("rca_id")
    .single();
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/rca/${cause.rca_id}`);
  return {};
}

export async function addCorrectiveActionAction(
  orgSlug: string,
  orgId: string,
  rcaId: string,
  raw: unknown,
): Promise<ActionState> {
  const parsed = correctiveActionSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const supabase = await createClient();
  const { error } = await supabase.from("corrective_actions").insert({
    org_id: orgId,
    rca_id: rcaId,
    description: parsed.data.description,
    owner_id: parsed.data.ownerId || null,
    due_date: parsed.data.dueDate || null,
  });
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/rca/${rcaId}`);
  return {};
}

export async function updateCorrectiveActionStatusAction(
  orgSlug: string,
  actionId: string,
  status: "open" | "in_progress" | "done" | "verified",
): Promise<ActionState> {
  const supabase = await createClient();
  const supabaseUser = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("corrective_actions")
    .update(
      status === "verified"
        ? { status, verified_by: supabaseUser.data.user?.id ?? null, verified_at: new Date().toISOString() }
        : { status },
    )
    .eq("id", actionId)
    .select("rca_id")
    .single();
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/rca/${data.rca_id}`);
  return {};
}

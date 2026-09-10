"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

import { toActionError, type ActionState } from "./action-utils";

/** Drag-and-drop reschedule from the calendar view — moves due_at to the target day, keeping the time-of-day. */
export async function rescheduleWorkOrderAction(
  orgSlug: string,
  workOrderId: string,
  newDateIso: string,
): Promise<ActionState> {
  const supabase = await createClient();
  const { data: existing } = await supabase.from("work_orders").select("due_at").eq("id", workOrderId).single();

  const newDate = new Date(newDateIso);
  if (existing?.due_at) {
    const previous = new Date(existing.due_at);
    newDate.setHours(previous.getHours(), previous.getMinutes());
  } else {
    newDate.setHours(9, 0);
  }

  const { error } = await supabase.from("work_orders").update({ due_at: newDate.toISOString() }).eq("id", workOrderId);
  if (error) return { error: toActionError(error) };

  revalidatePath(`/o/${orgSlug}/calendar`);
  return {};
}

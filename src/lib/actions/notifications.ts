"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

import { toActionError, type ActionState } from "./action-utils";

export async function markNotificationReadAction(orgSlug: string, notificationId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/notifications`);
  return {};
}

export async function markAllNotificationsReadAction(orgSlug: string, orgId: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .eq("is_read", false);
  if (error) return { error: toActionError(error) };
  revalidatePath(`/o/${orgSlug}/notifications`);
  return {};
}

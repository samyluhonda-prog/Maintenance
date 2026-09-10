"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { locationSchema } from "@/lib/validation/locations";

import { toActionError, type ActionState } from "./action-utils";

export async function upsertLocationAction(
  orgSlug: string,
  orgId: string,
  raw: unknown,
): Promise<ActionState> {
  const parsed = locationSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const input = parsed.data;

  const supabase = await createClient();
  const payload = {
    org_id: orgId,
    parent_id: input.parentId || null,
    type: input.type,
    name: input.name,
    code: input.code || null,
    address: input.address || null,
    notes: input.notes || null,
  };

  const { error } = input.id
    ? await supabase.from("locations").update(payload).eq("id", input.id)
    : await supabase.from("locations").insert(payload);

  if (error) return { error: toActionError(error) };

  revalidatePath(`/o/${orgSlug}/locations`);
  return {};
}

export async function deleteLocationAction(orgSlug: string, locationId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("locations").delete().eq("id", locationId);
  if (error) return { error: toActionError(error) };

  revalidatePath(`/o/${orgSlug}/locations`);
  return {};
}

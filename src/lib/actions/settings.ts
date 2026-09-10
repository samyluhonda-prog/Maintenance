"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { recordAuditEntry } from "@/lib/audit";
import { LOCALE_COOKIE } from "@/i18n/request";
import { createClient } from "@/lib/supabase/server";
import { organizationSettingsSchema, profileSchema } from "@/lib/validation/users";
import { updatePasswordSchema } from "@/lib/validation/auth";

import { toActionError, type ActionState } from "./action-utils";

export async function updateProfileAction(raw: unknown): Promise<ActionState> {
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, locale: parsed.data.locale, phone: parsed.data.phone || null })
    .eq("id", user.id);
  if (error) return { error: toActionError(error) };

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, parsed.data.locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });

  revalidatePath("/", "layout");
  return {};
}

export async function updateOwnPasswordAction(raw: unknown): Promise<ActionState> {
  const parsed = updatePasswordSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };
  return {};
}

export async function updateOrganizationSettingsAction(
  orgSlug: string,
  orgId: string,
  raw: unknown,
): Promise<ActionState> {
  const parsed = organizationSettingsSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: before } = await supabase.from("organizations").select("name, locale_default, timezone").eq("id", orgId).single();

  const { error } = await supabase
    .from("organizations")
    .update({ name: parsed.data.name, locale_default: parsed.data.localeDefault, timezone: parsed.data.timezone })
    .eq("id", orgId);
  if (error) return { error: toActionError(error) };

  await recordAuditEntry(supabase, {
    orgId,
    actorId: user?.id ?? null,
    action: "organization.updated",
    entityType: "organization",
    entityId: orgId,
    before,
    after: parsed.data,
  });

  revalidatePath(`/o/${orgSlug}`, "layout");
  return {};
}

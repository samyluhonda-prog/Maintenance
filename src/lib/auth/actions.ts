"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  createOrganizationSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  updatePasswordSchema,
} from "@/lib/validation/auth";

export type ActionResult = { error: string } | { error?: undefined };

function firstFieldError(flatten: { fieldErrors: Record<string, string[] | undefined> }) {
  for (const key in flatten.fieldErrors) {
    const messages = flatten.fieldErrors[key];
    if (messages?.length) return messages[0];
  }
  return "Formulaire invalide.";
}

/** Only ever redirect to a same-origin relative path — never follow an absolute/external `next` value. */
function safeNextPath(next: FormDataEntryValue | null): string | null {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export async function signInAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstFieldError(parsed.error.flatten()) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Courriel ou mot de passe invalide." };

  redirect(safeNextPath(formData.get("next")) ?? "/onboarding");
}

export async function signUpAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: firstFieldError(parsed.error.flatten()) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, locale: "fr" },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });
  if (error) return { error: error.message };

  redirect("/login?confirmEmail=1");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordResetAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: firstFieldError(parsed.error.flatten()) };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/update-password`,
  });

  // Always report success, regardless of whether the address is registered —
  // do not leak account existence through this endpoint.
  return {};
}

export async function updatePasswordAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: firstFieldError(parsed.error.flatten()) };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };

  redirect("/onboarding");
}

function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function createOrganizationAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = createOrganizationSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: firstFieldError(parsed.error.flatten()) };

  const supabase = await createClient();
  const baseSlug = slugify(parsed.data.name) || "organisation";

  let slug = baseSlug;
  let orgId: string | null = null;
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase.rpc("create_organization_with_owner", {
      p_name: parsed.data.name,
      p_slug: candidate,
    });
    if (!error) {
      orgId = data as unknown as string;
      slug = candidate;
      break;
    }
    lastError = error.message;
    if (!error.message.includes("duplicate key")) break;
  }

  if (!orgId) return { error: lastError ?? "Impossible de créer l’organisation." };

  revalidatePath("/onboarding");
  redirect(`/o/${slug}/dashboard`);
}

import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Service-role Supabase client. BYPASSES RLS ENTIRELY — never expose this to
 * the browser, never call it on behalf of a specific user's request without
 * first re-deriving and re-checking that user's permissions in application
 * code. Reserved for: automation rule execution, PM work-order generation,
 * webhook/cron handlers, and admin-only maintenance scripts.
 *
 * The `server-only` import makes any accidental client-bundle import a build
 * error rather than a silent key leak.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — required for admin/service-role Supabase operations.",
    );
  }

  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

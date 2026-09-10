"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

/**
 * Browser-side Supabase client. Uses the anon key — every table access it
 * makes is still gated by RLS (see supabase/migrations), so this key being
 * public is safe by design.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";

/**
 * Server-side Supabase client (Server Components, Server Actions, Route
 * Handlers). Still uses the anon key and is still subject to RLS — the
 * caller's identity comes from the session cookie, not from any elevated
 * privilege.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component render, which can't set
            // cookies. Harmless as long as middleware.ts is refreshing the
            // session on every request (it is — see middleware.ts).
          }
        },
      },
    },
  );
}

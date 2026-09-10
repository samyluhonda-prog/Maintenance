import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

export type ActionState<T = undefined> = { error?: string; data?: T };

/**
 * Every mutation still goes through RLS (see supabase/migrations) — that's
 * the real permission boundary, not this function. This just turns a Postgres
 * RLS rejection (42501) into a message a user can act on, instead of a raw
 * "new row violates row-level security policy" string.
 */
export function toActionError(error: PostgrestError): string {
  if (error.code === "42501") {
    return "Vous n’avez pas la permission nécessaire pour effectuer cette action.";
  }
  if (error.code === "23505") {
    return "Cette valeur existe déjà (doublon).";
  }
  if (error.code === "23503") {
    return "Impossible : d’autres éléments dépendent de cet enregistrement.";
  }
  return error.message;
}

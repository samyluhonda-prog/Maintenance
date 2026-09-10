import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Records an admin/sensitive action to the append-only audit_log table.
 * Best-effort: a logging failure must never block the action it's
 * describing, so callers should fire this after their own mutation
 * succeeds and can safely ignore its result.
 */
export async function recordAuditEntry(
  supabase: SupabaseClient<Database>,
  entry: {
    orgId: string;
    actorId: string | null;
    action: string;
    entityType: string;
    entityId?: string;
    before?: unknown;
    after?: unknown;
  },
) {
  await supabase.from("audit_log").insert({
    org_id: entry.orgId,
    actor_id: entry.actorId,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    before: (entry.before ?? null) as never,
    after: (entry.after ?? null) as never,
  });
}

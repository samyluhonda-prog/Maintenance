import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

export type TriggerEvent = Database["public"]["Tables"]["automation_rules"]["Row"]["trigger_event"];

type AdminClient = ReturnType<typeof createAdminClient>;

/** The simple {field, operator, value} shape written by automation-rule-form.tsx (see validation/automations.ts). */
type RuleCondition = { field?: string; operator?: string; value?: string };
type RuleAction = { type: string; params?: Record<string, unknown> };
type ActionTaken = { type: string; status: "done" | "not_implemented" | "error"; detail?: string };

/** No condition (empty `field`) always matches. Comparisons are done as strings unless the operator is numeric. */
function matchesCondition(condition: RuleCondition | null | undefined, context: Record<string, unknown>): boolean {
  if (!condition || !condition.field) return true;
  const actual = context[condition.field];
  const expected = condition.value;
  switch (condition.operator) {
    case "neq":
      return String(actual) !== String(expected);
    case "gt":
      return Number(actual) > Number(expected);
    case "gte":
      return Number(actual) >= Number(expected);
    case "lt":
      return Number(actual) < Number(expected);
    case "lte":
      return Number(actual) <= Number(expected);
    case "contains":
      return typeof actual === "string" && typeof expected === "string" && actual.includes(expected);
    case "eq":
    default:
      return String(actual) === String(expected);
  }
}

/** Replaces `{key}` tokens in `template` with `context[key]` (e.g. {title}, {equipment}, {number} — any field the caller put in context). Unknown keys are left as-is. */
function interpolate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = context[key];
    return value == null ? match : String(value);
  });
}

/**
 * Evaluates every active automation rule for `orgId` matching `event`, running
 * their actions when the (optional, single) condition matches `context`.
 *
 * Uses the service-role client because rules must be able to act across
 * tables (e.g. notify a role's members, create a purchase order) regardless
 * of the triggering user's own RLS visibility — see migration 0012's comment.
 *
 * Judgment call: rules whose condition does NOT match are skipped silently
 * (no automation_logs row) to avoid log spam from rules that rarely apply;
 * only rules that actually ran are logged.
 */
export async function evaluateAutomations(
  orgId: string,
  event: TriggerEvent,
  context: Record<string, unknown>,
): Promise<void> {
  const admin = createAdminClient();

  const { data: rules, error } = await admin
    .from("automation_rules")
    .select("*")
    .eq("org_id", orgId)
    .eq("trigger_event", event)
    .eq("is_active", true);
  if (error || !rules) return;

  for (const rule of rules) {
    const condition = (rule.conditions ?? {}) as RuleCondition;
    if (!matchesCondition(condition, context)) continue;

    const actions = Array.isArray(rule.actions) ? (rule.actions as unknown as RuleAction[]) : [];
    const actionsTaken: ActionTaken[] = [];
    let success = true;
    let errorMessage: string | null = null;

    for (const action of actions) {
      try {
        if (action.type === "notify") {
          await runNotifyAction(admin, orgId, rule.name, action.params ?? {}, context);
          actionsTaken.push({ type: "notify", status: "done" });
        } else if (action.type === "create_purchase_request") {
          await runCreatePurchaseRequestAction(admin, orgId, context);
          actionsTaken.push({ type: "create_purchase_request", status: "done" });
        } else {
          // Forward-compatible: unknown action types are recorded, not thrown,
          // so one bad action doesn't stop the rest of the rule's actions.
          actionsTaken.push({ type: action.type, status: "not_implemented" });
        }
      } catch (err) {
        success = false;
        errorMessage = err instanceof Error ? err.message : "Erreur inconnue.";
        actionsTaken.push({ type: action.type, status: "error", detail: errorMessage });
      }
    }

    await admin.from("automation_logs").insert({
      org_id: orgId,
      rule_id: rule.id,
      context: context as Database["public"]["Tables"]["automation_logs"]["Insert"]["context"],
      actions_taken: actionsTaken as unknown as Database["public"]["Tables"]["automation_logs"]["Insert"]["actions_taken"],
      success,
      error: errorMessage,
    });
  }
}

/** Supported placeholders in `params.message`: any key present in `context` (e.g. {title}, {equipment}, {number}). */
async function runNotifyAction(
  admin: AdminClient,
  orgId: string,
  ruleName: string,
  params: Record<string, unknown>,
  context: Record<string, unknown>,
) {
  const messageTemplate = typeof params.message === "string" ? params.message : ruleName;
  const body = interpolate(messageTemplate, context);

  let userIds: string[] = [];
  if (typeof params.user_id === "string" && params.user_id) {
    userIds = [params.user_id];
  } else if (typeof params.role === "string" && params.role) {
    const { data: members } = await admin
      .from("memberships")
      .select("user_id, roles!inner(key)")
      .eq("org_id", orgId)
      .eq("status", "active")
      .eq("roles.key", params.role);
    userIds = (members ?? []).map((m) => m.user_id);
  }
  if (userIds.length === 0) return;

  await admin.from("notifications").insert(
    userIds.map((userId) => ({
      org_id: orgId,
      user_id: userId,
      type: "automation",
      title: ruleName,
      body,
    })),
  );
}

/**
 * Only meaningful for the `part.below_min` event, where `context.partId` is
 * set by the caller (see the hook in lib/actions/work-orders.ts). Creates a
 * minimal draft purchase order + one line for the part so a buyer just has to
 * pick a supplier and approve it.
 */
async function runCreatePurchaseRequestAction(admin: AdminClient, orgId: string, context: Record<string, unknown>) {
  const partId = context.partId;
  if (typeof partId !== "string") return;

  const { data: part } = await admin.from("parts").select("*").eq("id", partId).maybeSingle();
  if (!part) return;

  const { data: number, error: numberError } = await admin.rpc("next_number", {
    p_org_id: orgId,
    p_key: "purchase_order",
    p_prefix: "PO",
  });
  if (numberError || !number) throw new Error(numberError?.message ?? "Impossible de générer un numéro de bon d’achat.");

  const quantity =
    part.optimal_level != null
      ? Math.max(part.optimal_level - part.quantity_on_hand, 1)
      : Math.max(part.min_threshold * 2, 1);

  const { data: po, error: poError } = await admin
    .from("purchase_orders")
    .insert({
      org_id: orgId,
      number,
      status: "draft",
      notes: `Généré automatiquement — stock de « ${part.name} » sous le seuil minimum.`,
    })
    .select("id")
    .single();
  if (poError) throw new Error(poError.message);

  const { error: lineError } = await admin.from("purchase_order_lines").insert({
    org_id: orgId,
    purchase_order_id: po.id,
    part_id: part.id,
    description: part.name,
    quantity,
    unit_cost: part.unit_cost,
  });
  if (lineError) throw new Error(lineError.message);
}

// NOTE — part.below_min hook locations: this event is fired from two places,
// each right after a part_transactions insert that can decrease
// quantity_on_hand, by re-reading the part and comparing to min_threshold:
//   - lib/actions/work-orders.ts's addWorkOrderPartAction ("usage" from a work order)
//   - lib/actions/parts.ts's recordPartTransactionAction (manual usage/scrap/etc.)
// Any future part-transaction entry point should add the same one-line check.

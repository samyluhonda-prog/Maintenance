"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { PURCHASE_ORDER_STATUSES, purchaseOrderSchema } from "@/lib/validation/purchasing";
import type { TablesUpdate } from "@/types/supabase-helpers";

import { toActionError, type ActionState } from "./action-utils";

export async function createPurchaseOrderAction(
  orgSlug: string,
  orgId: string,
  raw: unknown,
): Promise<ActionState<{ id: string }>> {
  const parsed = purchaseOrderSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const subtotal = input.lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0);
  const total = subtotal + input.tax + input.shipping;

  const { data: number, error: numberError } = await supabase.rpc("next_number", {
    p_org_id: orgId,
    p_key: "purchase_order",
    p_prefix: "PO",
  });
  if (numberError) return { error: toActionError(numberError) };

  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .insert({
      org_id: orgId,
      number: number!,
      supplier_id: input.supplierId || null,
      status: "draft",
      requested_by: user.id,
      expected_at: input.expectedAt || null,
      subtotal,
      tax: input.tax,
      shipping: input.shipping,
      total,
      notes: input.notes || null,
    })
    .select("id")
    .single();
  if (poError) return { error: toActionError(poError) };

  const { error: linesError } = await supabase.from("purchase_order_lines").insert(
    input.lines.map((line) => ({
      org_id: orgId,
      purchase_order_id: po.id,
      part_id: line.partId || null,
      description: line.description,
      quantity: line.quantity,
      unit_cost: line.unitCost,
    })),
  );
  if (linesError) {
    // Best-effort cleanup — don't leave an empty PO behind.
    await supabase.from("purchase_orders").delete().eq("id", po.id);
    return { error: toActionError(linesError) };
  }

  revalidatePath(`/o/${orgSlug}/purchasing`);
  return { data: { id: po.id } };
}

export async function updatePurchaseOrderStatusAction(
  orgSlug: string,
  poId: string,
  status: (typeof PURCHASE_ORDER_STATUSES)[number],
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const patch: TablesUpdate<"purchase_orders"> = { status };
  if (status === "approved") {
    patch.approved_at = new Date().toISOString();
    patch.approved_by = user?.id ?? null;
  }
  if (status === "ordered") {
    patch.ordered_at = new Date().toISOString();
  }

  const { error } = await supabase.from("purchase_orders").update(patch).eq("id", poId);
  if (error) return { error: toActionError(error) };

  revalidatePath(`/o/${orgSlug}/purchasing/${poId}`);
  revalidatePath(`/o/${orgSlug}/purchasing`);
  return {};
}

export async function cancelPurchaseOrderAction(orgSlug: string, poId: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("purchase_orders").update({ status: "cancelled" }).eq("id", poId);
  if (error) return { error: toActionError(error) };

  revalidatePath(`/o/${orgSlug}/purchasing/${poId}`);
  revalidatePath(`/o/${orgSlug}/purchasing`);
  return {};
}

/**
 * Thin wrapper around the `receive_purchase_order_line` RPC (see
 * supabase/migrations/0008 and 0015) — kept as a server action rather than a
 * direct client-side `.rpc()` call so it can reuse `toActionError` and
 * `revalidatePath` like every other mutation in this module. The RPC itself
 * records the receipt transaction (which the DB trigger applies to
 * `parts.quantity_on_hand`) and advances the PO's status — none of that logic
 * is reimplemented here.
 */
export async function receivePurchaseOrderLineAction(
  orgSlug: string,
  poId: string,
  lineId: string,
  quantity: number,
): Promise<ActionState> {
  if (quantity <= 0) return { error: "La quantité doit être supérieure à zéro." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("receive_purchase_order_line", { p_line_id: lineId, p_quantity: quantity });
  if (error) return { error: toActionError(error) };

  revalidatePath(`/o/${orgSlug}/purchasing/${poId}`);
  revalidatePath(`/o/${orgSlug}/purchasing`);
  revalidatePath(`/o/${orgSlug}/parts`);
  return {};
}

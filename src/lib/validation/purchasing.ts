import { z } from "zod";

export const PURCHASE_ORDER_STATUSES = [
  "draft",
  "requested",
  "pending_approval",
  "approved",
  "ordered",
  "partially_received",
  "received",
  "closed",
  "cancelled",
] as const;

const optionalUuid = z.uuid().optional().or(z.literal("")).nullable();

export const purchaseOrderLineSchema = z.object({
  partId: optionalUuid,
  description: z.string().trim().min(1, "La description est requise.").max(300),
  quantity: z.coerce.number().positive("La quantité doit être supérieure à zéro."),
  unitCost: z.coerce.number().nonnegative("Doit être positif ou nul."),
});

export const purchaseOrderSchema = z.object({
  supplierId: optionalUuid,
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  expectedAt: z.string().optional().or(z.literal("")),
  tax: z.coerce.number().nonnegative("Doit être positif ou nul."),
  shipping: z.coerce.number().nonnegative("Doit être positif ou nul."),
  lines: z.array(purchaseOrderLineSchema).min(1, "Au moins une ligne est requise."),
});
/** What the form collects (pre-coercion) — use for `useForm<PurchaseOrderFormValues>`. */
export type PurchaseOrderFormValues = z.input<typeof purchaseOrderSchema>;
/** What the server action receives after zod coercion/validation. */
export type PurchaseOrderInput = z.output<typeof purchaseOrderSchema>;

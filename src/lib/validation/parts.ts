import { z } from "zod";

export const PART_TRANSACTION_TYPES = [
  "receipt",
  "usage",
  "reservation",
  "return",
  "transfer",
  "adjustment",
  "cycle_count",
  "scrap",
] as const;

const optionalText = z.string().trim().max(500).optional().or(z.literal(""));
const optionalUuid = z.uuid().optional().or(z.literal("")).nullable();

export const partSchema = z.object({
  id: z.uuid().optional(),
  number: z.string().trim().min(1, "Le numéro est requis.").max(100),
  name: z.string().trim().min(1, "Le nom est requis.").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  category: optionalText,
  manufacturer: optionalText,
  manufacturerPartNumber: optionalText,
  unit: z.string().trim().min(1, "L’unité est requise.").max(30),
  unitCost: z.coerce.number().nonnegative("Doit être positif ou nul."),
  storageLocationId: optionalUuid,
  minThreshold: z.coerce.number().nonnegative("Doit être positif ou nul."),
  optimalLevel: z.coerce.number().nonnegative().optional().nullable(),
  leadTimeDays: z.coerce.number().int().nonnegative().optional().nullable(),
  primarySupplierId: optionalUuid,
});
/** What the form collects (pre-coercion) — use for `useForm<PartFormValues>`. */
export type PartFormValues = z.input<typeof partSchema>;
/** What the server action receives after zod coercion/validation. */
export type PartInput = z.output<typeof partSchema>;

export const partCsvRowSchema = z.object({
  number: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  category: z.string().trim().optional(),
  manufacturer: z.string().trim().optional(),
  manufacturer_part_number: z.string().trim().optional(),
  unit: z.string().trim().optional(),
  unit_cost: z.coerce.number().nonnegative().optional(),
  min_threshold: z.coerce.number().nonnegative().optional(),
  optimal_level: z.coerce.number().nonnegative().optional(),
  lead_time_days: z.coerce.number().int().nonnegative().optional(),
});
export type PartCsvRow = z.infer<typeof partCsvRowSchema>;

export const partTransactionSchema = z.object({
  type: z.enum(PART_TRANSACTION_TYPES),
  quantity: z.coerce.number().positive("La quantité doit être supérieure à zéro."),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});
/** What the form collects (pre-coercion) — use for `useForm<PartTransactionFormValues>`. */
export type PartTransactionFormValues = z.input<typeof partTransactionSchema>;
/** What the server action receives after zod coercion/validation. */
export type PartTransactionInput = z.output<typeof partTransactionSchema>;

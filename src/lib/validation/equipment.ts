import { z } from "zod";

export const EQUIPMENT_STATUSES = ["operational", "down", "in_repair", "decommissioned", "standby"] as const;
export const EQUIPMENT_CRITICALITY = ["low", "medium", "high", "critical"] as const;

const optionalText = z.string().trim().max(500).optional().or(z.literal(""));
const optionalUuid = z.uuid().optional().or(z.literal("")).nullable();

export const equipmentSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Le nom est requis.").max(200),
  internalCode: optionalText,
  category: optionalText,
  status: z.enum(EQUIPMENT_STATUSES),
  criticality: z.enum(EQUIPMENT_CRITICALITY),
  manufacturer: optionalText,
  model: optionalText,
  serialNumber: optionalText,
  locationId: optionalUuid,
  parentEquipmentId: optionalUuid,
  supplierId: optionalUuid,
  commissionedAt: z.string().optional().or(z.literal("")),
  warrantyExpiresAt: z.string().optional().or(z.literal("")),
  acquisitionCost: z.coerce.number().nonnegative().optional().nullable(),
  expectedLifetimeMonths: z.coerce.number().int().nonnegative().optional().nullable(),
});
/** What the form collects (pre-coercion) — use for `useForm<EquipmentFormValues>`. */
export type EquipmentFormValues = z.input<typeof equipmentSchema>;
/** What the server action receives after zod coercion/validation. */
export type EquipmentInput = z.output<typeof equipmentSchema>;

export const equipmentCsvRowSchema = z.object({
  name: z.string().trim().min(1),
  internal_code: z.string().trim().optional(),
  category: z.string().trim().optional(),
  manufacturer: z.string().trim().optional(),
  model: z.string().trim().optional(),
  serial_number: z.string().trim().optional(),
  criticality: z.enum(EQUIPMENT_CRITICALITY).optional(),
  status: z.enum(EQUIPMENT_STATUSES).optional(),
});
export type EquipmentCsvRow = z.infer<typeof equipmentCsvRowSchema>;

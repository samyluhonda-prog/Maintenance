import { z } from "zod";

export const METER_KINDS = [
  "hours",
  "kilometers",
  "cycles",
  "pressure",
  "temperature",
  "vibration",
  "energy",
  "weight",
  "production",
  "custom",
] as const;
export const METER_SOURCES = ["manual", "api", "sensor"] as const;

export const meterSchema = z.object({
  id: z.uuid().optional(),
  equipmentId: z.uuid("L’équipement est requis."),
  name: z.string().trim().min(1, "Le nom est requis.").max(200),
  unit: z.string().trim().min(1, "L’unité est requise.").max(50),
  kind: z.enum(METER_KINDS),
  source: z.enum(METER_SOURCES),
  isCumulative: z.boolean(),
});
/** What the form collects — use for `useForm<MeterFormValues>`. */
export type MeterFormValues = z.input<typeof meterSchema>;
/** What the server action receives after zod validation. */
export type MeterInput = z.output<typeof meterSchema>;

export const meterReadingSchema = z.object({
  value: z.coerce.number("La valeur est requise."),
  recordedAt: z.string().min(1, "La date est requise."),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});
/** What the form collects (pre-coercion) — use for `useForm<MeterReadingFormValues>`. */
export type MeterReadingFormValues = z.input<typeof meterReadingSchema>;
/** What the server action receives after zod coercion/validation. */
export type MeterReadingInput = z.output<typeof meterReadingSchema>;

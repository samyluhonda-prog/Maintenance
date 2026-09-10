import { z } from "zod";

import { WORK_ORDER_PRIORITIES } from "@/lib/validation/work-orders";

export const PM_PLAN_STATUSES = ["active", "paused", "archived"] as const;
export const PM_TRIGGER_KINDS = ["calendar", "meter", "condition"] as const;
export const PM_FREQUENCY_UNITS = ["day", "week", "month", "year", "custom"] as const;
export const METER_OPERATORS = ["gte", "lte", "eq"] as const;

const optionalUuid = z.uuid().optional().or(z.literal("")).nullable();

export const pmPlanSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Le nom est requis.").max(200),
  equipmentId: z.uuid("L’équipement est requis."),
  procedureTemplateId: optionalUuid,
  woTitle: z.string().trim().min(1, "Le titre du bon de travail est requis.").max(200),
  woDescription: z.string().trim().max(4000).optional().or(z.literal("")),
  woPriority: z.enum(WORK_ORDER_PRIORITIES),
  woEstimateHours: z.coerce.number().nonnegative().optional().nullable(),
  defaultAssigneeId: optionalUuid,
  leadTimeDays: z.coerce.number().int().min(0),
  status: z.enum(PM_PLAN_STATUSES),
});
/** What the form collects (pre-coercion) — use for `useForm<PmPlanFormValues>`. */
export type PmPlanFormValues = z.input<typeof pmPlanSchema>;
/** What the server action receives after zod coercion/validation. */
export type PmPlanInput = z.output<typeof pmPlanSchema>;

export const pmTriggerSchema = z
  .object({
    id: z.uuid().optional(),
    kind: z.enum(PM_TRIGGER_KINDS),
    // calendar
    frequencyUnit: z.enum(PM_FREQUENCY_UNITS).optional().nullable(),
    frequencyValue: z.coerce.number().int().positive().optional().nullable(),
    daysOfWeek: z.array(z.coerce.number().int().min(0).max(6)).optional().nullable(),
    fixedInterval: z.boolean(),
    toleranceDays: z.coerce.number().int().min(0),
    // meter
    meterId: optionalUuid,
    meterInterval: z.coerce.number().positive().optional().nullable(),
    meterOperator: z.enum(METER_OPERATORS).optional().nullable(),
    // condition — raw JSON text from the advanced textarea
    conditionExpression: z.string().trim().optional().or(z.literal("")),
    isActive: z.boolean(),
  })
  .superRefine((val, ctx) => {
    if (val.kind === "calendar") {
      if (!val.frequencyUnit) {
        ctx.addIssue({ code: "custom", message: "L’unité de fréquence est requise.", path: ["frequencyUnit"] });
      }
      if (!val.frequencyValue) {
        ctx.addIssue({ code: "custom", message: "La valeur de fréquence est requise.", path: ["frequencyValue"] });
      }
    }
    if (val.kind === "meter") {
      if (!val.meterId) ctx.addIssue({ code: "custom", message: "Le compteur est requis.", path: ["meterId"] });
      if (!val.meterInterval) {
        ctx.addIssue({ code: "custom", message: "L’intervalle est requis.", path: ["meterInterval"] });
      }
      if (!val.meterOperator) {
        ctx.addIssue({ code: "custom", message: "L’opérateur est requis.", path: ["meterOperator"] });
      }
    }
    if (val.kind === "condition" && val.conditionExpression) {
      try {
        JSON.parse(val.conditionExpression);
      } catch {
        ctx.addIssue({ code: "custom", message: "Le JSON n’est pas valide.", path: ["conditionExpression"] });
      }
    }
  });
/** What the form collects (pre-coercion) — use for `useForm<PmTriggerFormValues>`. */
export type PmTriggerFormValues = z.input<typeof pmTriggerSchema>;
/** What the server action receives after zod coercion/validation. */
export type PmTriggerInput = z.output<typeof pmTriggerSchema>;

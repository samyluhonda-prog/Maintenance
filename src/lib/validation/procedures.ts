import { z } from "zod";

import { PROCEDURE_FIELD_TYPES } from "@/lib/procedures/field-logic";

export const procedureTemplateSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Le nom est requis.").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  category: z.string().trim().max(100).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});
export type ProcedureTemplateFormValues = z.input<typeof procedureTemplateSchema>;
export type ProcedureTemplateInput = z.output<typeof procedureTemplateSchema>;

export const conditionOperators = ["eq", "neq"] as const;

const fieldConditionSchema = z.object({
  fieldId: z.uuid(),
  operator: z.enum(conditionOperators),
  value: z.string().trim().min(1),
});

/**
 * The builder form's own inputs — not a full per-type schema for `config`
 * (deliberately, per spec: config is too type-dependent to be worth a
 * discriminated union here). We validate only what the builder UI directly
 * collects: label/type/required, multiple_choice's options (>= 2 non-empty),
 * number-ish min/max/unit, and the optional condition mini-form.
 */
export const procedureFieldSchema = z
  .object({
    id: z.uuid().optional(),
    type: z.enum(PROCEDURE_FIELD_TYPES),
    label: z.string().trim().min(1, "Le libellé est requis.").max(300),
    isRequired: z.boolean(),
    options: z.array(z.string().trim().max(200)).optional(),
    unit: z.string().trim().max(50).optional().or(z.literal("")),
    min: z.coerce.number().optional().nullable(),
    max: z.coerce.number().optional().nullable(),
    condition: fieldConditionSchema.optional().nullable(),
  })
  .refine(
    (data) => data.type !== "multiple_choice" || (data.options ?? []).filter((o) => o.trim()).length >= 2,
    { message: "Au moins deux options sont requises.", path: ["options"] },
  )
  .refine((data) => data.min == null || data.max == null || data.min <= data.max, {
    message: "Le minimum doit être inférieur ou égal au maximum.",
    path: ["max"],
  });
/** What the builder form collects (pre-coercion) — use for `useForm<ProcedureFieldFormValues>`. */
export type ProcedureFieldFormValues = z.input<typeof procedureFieldSchema>;
/** What the server action receives after zod coercion/validation. */
export type ProcedureFieldInput = z.output<typeof procedureFieldSchema>;

/**
 * The scalar subset of `procedureFieldSchema` that the field-form dialog
 * drives through react-hook-form + zodResolver. `options` (a dynamic
 * add/remove list) and `condition` (an optional nested mini-form) are managed
 * as plain component state instead — RHF's array/nested-conditional plumbing
 * added little here — and merged back in right before the full
 * `procedureFieldSchema` (with its cross-field refinements) validates the
 * combined payload client-side, mirroring exactly what the server re-validates.
 */
export const procedureFieldCoreSchema = z.object({
  type: z.enum(PROCEDURE_FIELD_TYPES),
  label: z.string().trim().min(1, "Le libellé est requis.").max(300),
  isRequired: z.boolean(),
  unit: z.string().trim().max(50).optional().or(z.literal("")),
  min: z.coerce.number().optional().nullable(),
  max: z.coerce.number().optional().nullable(),
});
export type ProcedureFieldCoreFormValues = z.input<typeof procedureFieldCoreSchema>;
export type ProcedureFieldCoreInput = z.output<typeof procedureFieldCoreSchema>;

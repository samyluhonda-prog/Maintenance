import { z } from "zod";

export const REQUEST_URGENCY = ["low", "medium", "high", "critical"] as const;

const optionalUuid = z.uuid().optional().or(z.literal("")).nullable();

export const requestSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis.").max(200),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  equipmentId: optionalUuid,
  locationId: optionalUuid,
  category: z.string().trim().max(100).optional().or(z.literal("")),
  urgency: z.enum(REQUEST_URGENCY),
  isEquipmentDown: z.boolean(),
  submit: z.boolean(), // false = save as draft, true = submit immediately
});
export type RequestFormValues = z.input<typeof requestSchema>;
export type RequestInput = z.output<typeof requestSchema>;

export const reviewRequestSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type ReviewRequestInput = z.infer<typeof reviewRequestSchema>;

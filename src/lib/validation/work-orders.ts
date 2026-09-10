import { z } from "zod";

export const WORK_ORDER_TYPES = [
  "preventive",
  "corrective",
  "inspection",
  "safety",
  "improvement",
  "other",
] as const;
export const WORK_ORDER_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export const WORK_ORDER_STATUSES = [
  "draft",
  "open",
  "planned",
  "assigned",
  "in_progress",
  "on_hold",
  "completed",
  "to_review",
  "closed",
  "cancelled",
  "skipped",
] as const;

const optionalUuid = z.uuid().optional().or(z.literal("")).nullable();

export const workOrderSchema = z.object({
  id: z.uuid().optional(),
  title: z.string().trim().min(1, "Le titre est requis.").max(200),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  type: z.enum(WORK_ORDER_TYPES),
  priority: z.enum(WORK_ORDER_PRIORITIES),
  equipmentId: optionalUuid,
  locationId: optionalUuid,
  primaryAssigneeId: optionalUuid,
  scheduledStart: z.string().optional().or(z.literal("")),
  dueAt: z.string().optional().or(z.literal("")),
  estimateHours: z.coerce.number().nonnegative().optional().nullable(),
  requiresLockout: z.boolean(),
  safetyNotes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type WorkOrderFormValues = z.input<typeof workOrderSchema>;
export type WorkOrderInput = z.output<typeof workOrderSchema>;

export const timeLogSchema = z.object({
  startedAt: z.string().min(1, "Requis."),
  endedAt: z.string().min(1, "Requis."),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type TimeLogInput = z.infer<typeof timeLogSchema>;

export const closeWorkOrderSchema = z.object({
  failureCause: z.string().trim().max(2000).optional().or(z.literal("")),
  resolution: z.string().trim().min(1, "La résolution est requise pour clôturer.").max(4000),
  followUpRequired: z.boolean(),
  followUpNotes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type CloseWorkOrderInput = z.infer<typeof closeWorkOrderSchema>;

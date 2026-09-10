import { z } from "zod";

export const RCA_CAUSE_CATEGORIES = ["method", "machine", "material", "man", "measurement", "environment"] as const;

export const rcaRecordSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis.").max(200),
  problemStatement: z.string().trim().min(1, "L’énoncé du problème est requis.").max(4000),
  equipmentId: z.uuid("Sélectionnez un équipement."),
  workOrderId: z.uuid().optional().or(z.literal("")).nullable(),
});
export type RcaRecordInput = z.infer<typeof rcaRecordSchema>;

export const fiveWhySchema = z.object({
  question: z.string().trim().min(1, "Requis."),
  answer: z.string().trim().min(1, "Requis."),
});
export type FiveWhyInput = z.infer<typeof fiveWhySchema>;

export const rcaCauseSchema = z.object({
  category: z.enum(RCA_CAUSE_CATEGORIES),
  description: z.string().trim().min(1, "Requis.").max(1000),
});
export type RcaCauseInput = z.infer<typeof rcaCauseSchema>;

export const correctiveActionSchema = z.object({
  description: z.string().trim().min(1, "Requis.").max(1000),
  ownerId: z.uuid().optional().or(z.literal("")).nullable(),
  dueDate: z.string().optional().or(z.literal("")),
});
export type CorrectiveActionInput = z.infer<typeof correctiveActionSchema>;

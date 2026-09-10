import { z } from "zod";

export const LOCATION_TYPES = ["site", "building", "zone", "production_line", "system", "other"] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export const locationSchema = z.object({
  id: z.uuid().optional(),
  parentId: z.uuid().nullable().optional(),
  type: z.enum(LOCATION_TYPES),
  name: z.string().trim().min(1, "Le nom est requis.").max(200),
  code: z.string().trim().max(50).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type LocationInput = z.infer<typeof locationSchema>;

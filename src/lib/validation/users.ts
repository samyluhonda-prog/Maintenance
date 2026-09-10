import { z } from "zod";

export const inviteMemberSchema = z.object({
  email: z.email("Adresse courriel invalide."),
  roleId: z.uuid("Sélectionnez un rôle."),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Le nom complet doit contenir au moins 2 caractères.").max(200),
  locale: z.enum(["fr", "en"]),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const organizationSettingsSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères.").max(200),
  localeDefault: z.enum(["fr", "en"]),
  timezone: z.string().trim().min(1).max(100),
});
export type OrganizationSettingsInput = z.infer<typeof organizationSettingsSchema>;

export const teamSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis.").max(200),
});
export type TeamInput = z.infer<typeof teamSchema>;

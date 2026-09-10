import { z } from "zod";

export const loginSchema = z.object({
  email: z.email({ message: "Adresse courriel invalide." }),
  password: z.string().min(1, "Le mot de passe est requis."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Le nom complet doit contenir au moins 2 caractères."),
    email: z.email({ message: "Adresse courriel invalide." }),
    password: z
      .string()
      .min(10, "Le mot de passe doit contenir au moins 10 caractères.")
      .regex(/[a-z]/, "Le mot de passe doit contenir une minuscule.")
      .regex(/[A-Z]/, "Le mot de passe doit contenir une majuscule.")
      .regex(/[0-9]/, "Le mot de passe doit contenir un chiffre."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });
export type SignupInput = z.infer<typeof signupSchema>;

export const resetPasswordSchema = z.object({
  email: z.email({ message: "Adresse courriel invalide." }),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const updatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(10, "Le mot de passe doit contenir au moins 10 caractères.")
      .regex(/[a-z]/, "Le mot de passe doit contenir une minuscule.")
      .regex(/[A-Z]/, "Le mot de passe doit contenir une majuscule.")
      .regex(/[0-9]/, "Le mot de passe doit contenir un chiffre."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Le nom de l’organisation doit contenir au moins 2 caractères."),
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

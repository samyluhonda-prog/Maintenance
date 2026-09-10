import { z } from "zod";

const optionalText = z.string().trim().max(1000).optional().or(z.literal(""));

export const supplierSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Le nom est requis.").max(200),
  contactName: optionalText,
  email: z.email("Courriel invalide.").max(200).optional().or(z.literal("")),
  phone: optionalText,
  address: optionalText,
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
  rating: z.coerce.number().min(0, "Entre 0 et 5.").max(5, "Entre 0 et 5.").optional().nullable(),
});
/** What the form collects (pre-coercion) — use for `useForm<SupplierFormValues>`. */
export type SupplierFormValues = z.input<typeof supplierSchema>;
/** What the server action receives after zod coercion/validation. */
export type SupplierInput = z.output<typeof supplierSchema>;

export const SUPPLIER_DOCUMENT_KINDS = ["contract", "document"] as const;

export const supplierDocumentSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis.").max(200),
  kind: z.enum(SUPPLIER_DOCUMENT_KINDS),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
  value: z.coerce.number().nonnegative().optional().nullable(),
});
/** What the form collects (pre-coercion) — use for `useForm<SupplierDocumentFormValues>`. */
export type SupplierDocumentFormValues = z.input<typeof supplierDocumentSchema>;
/** What the server action receives after zod coercion/validation. */
export type SupplierDocumentInput = z.output<typeof supplierDocumentSchema>;

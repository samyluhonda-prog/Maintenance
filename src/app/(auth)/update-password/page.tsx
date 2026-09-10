import type { Metadata } from "next";

import { UpdatePasswordForm } from "./update-password-form";

export const metadata: Metadata = { title: "Nouveau mot de passe — Intervia" };

export default function UpdatePasswordPage() {
  return <UpdatePasswordForm />;
}

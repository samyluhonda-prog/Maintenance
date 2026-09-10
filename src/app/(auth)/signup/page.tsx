import type { Metadata } from "next";

import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Créer un compte — Intervia" };

export default function SignupPage() {
  return <SignupForm />;
}

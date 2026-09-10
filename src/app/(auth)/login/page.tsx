import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion — Intervia" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmEmail?: string }>;
}) {
  const { confirmEmail } = await searchParams;
  return <LoginForm confirmEmail={confirmEmail === "1"} />;
}

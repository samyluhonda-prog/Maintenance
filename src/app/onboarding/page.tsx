import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoMark } from "@/components/auth/logo-mark";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMyMemberships } from "@/lib/data/orgs";

import { CreateOrgForm } from "./create-org-form";

export const metadata: Metadata = { title: "Bienvenue — Intervia" };

export default async function OnboardingPage() {
  const memberships = await getMyMemberships();

  if (memberships.length === 1) {
    redirect(`/o/${memberships[0].orgSlug}/dashboard`);
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="flex items-center gap-2">
        <LogoMark className="size-8" />
        <span className="text-xl font-semibold tracking-tight">Intervia</span>
      </div>

      {memberships.length === 0 ? (
        <div className="w-full max-w-sm">
          <CreateOrgForm />
        </div>
      ) : (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Choisissez une organisation</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {memberships.map((m) => (
              <Link
                key={m.membershipId}
                href={`/o/${m.orgSlug}/dashboard`}
                className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-secondary"
              >
                <span className="font-medium">{m.orgName}</span>
                <span className="text-muted-foreground">{m.roleNameFr}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

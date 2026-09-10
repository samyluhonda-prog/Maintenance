import { notFound } from "next/navigation";

import { requireOrgAccess } from "@/lib/data/orgs";

import { OrganizationForm } from "./organization-form";

export default async function OrganizationSettingsPage({ params }: PageProps<"/o/[orgSlug]/settings/organization">) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);

  if (ctx.roleKey !== "owner" && ctx.roleKey !== "admin") notFound();

  return (
    <div className="mx-auto max-w-xl p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Paramètres de l’organisation</h1>
      <OrganizationForm orgSlug={orgSlug} org={ctx.org} />
    </div>
  );
}

import { requireOrgAccess } from "@/lib/data/orgs";

import { SupplierForm } from "../supplier-form";

export default async function NewSupplierPage({ params }: PageProps<"/o/[orgSlug]/suppliers/new">) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Nouveau fournisseur</h1>
      <SupplierForm orgSlug={orgSlug} orgId={ctx.org.id} />
    </div>
  );
}

import { notFound } from "next/navigation";

import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { SupplierForm } from "../../supplier-form";

export default async function EditSupplierPage({ params }: PageProps<"/o/[orgSlug]/suppliers/[id]/edit">) {
  const { orgSlug, id } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .eq("org_id", ctx.org.id)
    .maybeSingle();

  if (!supplier) notFound();

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Modifier « {supplier.name} »</h1>
      <SupplierForm orgSlug={orgSlug} orgId={ctx.org.id} supplier={supplier} />
    </div>
  );
}

import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { PurchaseOrderForm } from "../purchase-order-form";

export default async function NewPurchaseOrderPage({
  params,
  searchParams,
}: PageProps<"/o/[orgSlug]/purchasing/new">) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const partId = typeof sp.partId === "string" ? sp.partId : undefined;

  const [{ data: suppliers }, { data: parts }, prefillResult] = await Promise.all([
    supabase.from("suppliers").select("*").eq("org_id", ctx.org.id).order("name"),
    supabase.from("parts").select("id, name, unit_cost").eq("org_id", ctx.org.id).order("name"),
    partId
      ? supabase
          .from("parts")
          .select("id, name, unit_cost, quantity_on_hand, optimal_level, primary_supplier_id")
          .eq("id", partId)
          .eq("org_id", ctx.org.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const prefillPart = prefillResult.data;
  const defaultLine = prefillPart
    ? {
        partId: prefillPart.id,
        description: prefillPart.name,
        quantity:
          prefillPart.optimal_level != null
            ? Math.max(1, Math.ceil(prefillPart.optimal_level - prefillPart.quantity_on_hand))
            : 1,
        unitCost: prefillPart.unit_cost,
      }
    : undefined;

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Nouveau bon de commande</h1>
      <PurchaseOrderForm
        orgSlug={orgSlug}
        orgId={ctx.org.id}
        suppliers={suppliers ?? []}
        parts={parts ?? []}
        defaultSupplierId={prefillPart?.primary_supplier_id ?? null}
        defaultLine={defaultLine}
      />
    </div>
  );
}

import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";
import type { PURCHASE_ORDER_STATUSES } from "@/lib/validation/purchasing";

import { LineItemsTable } from "./line-items-table";
import { PurchaseOrderActions } from "./purchase-order-actions";

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  requested: "Demandée",
  pending_approval: "En attente d'approbation",
  approved: "Approuvée",
  ordered: "Commandée",
  partially_received: "Partiellement reçue",
  received: "Reçue",
  closed: "Fermée",
  cancelled: "Annulée",
};
const STATUS_VARIANT: Record<string, "success" | "destructive" | "warning" | "secondary" | "outline" | "info"> = {
  draft: "secondary",
  requested: "info",
  pending_approval: "warning",
  approved: "info",
  ordered: "info",
  partially_received: "warning",
  received: "success",
  closed: "outline",
  cancelled: "destructive",
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value ?? "—"}</span>
    </div>
  );
}

export default async function PurchaseOrderDetailPage({ params }: PageProps<"/o/[orgSlug]/purchasing/[id]">) {
  const { orgSlug, id } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const [{ data: po }, { data: lines }] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select("*, suppliers(name, contact_name, email, phone), profiles:requested_by(full_name)")
      .eq("id", id)
      .eq("org_id", ctx.org.id)
      .maybeSingle(),
    supabase
      .from("purchase_order_lines")
      .select("*, parts(name)")
      .eq("purchase_order_id", id)
      .order("created_at"),
  ]);

  if (!po) notFound();

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{po.number}</h1>
            <Badge variant={STATUS_VARIANT[po.status] ?? "outline"}>{STATUS_LABELS[po.status] ?? po.status}</Badge>
          </div>
          <p className="text-muted-foreground">{po.suppliers?.name ?? "Aucun fournisseur"}</p>
        </div>
        <PurchaseOrderActions orgSlug={orgSlug} poId={po.id} status={po.status as (typeof PURCHASE_ORDER_STATUSES)[number]} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Articles</CardTitle>
            </CardHeader>
            <CardContent>
              <LineItemsTable orgSlug={orgSlug} poId={po.id} lines={lines ?? []} />
            </CardContent>
          </Card>

          {po.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{po.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Résumé</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="Sous-total" value={`${po.subtotal.toFixed(2)} $`} />
              <InfoRow label="Taxes" value={`${po.tax.toFixed(2)} $`} />
              <InfoRow label="Transport" value={`${po.shipping.toFixed(2)} $`} />
              <InfoRow label="Total" value={<span className="font-semibold">{po.total.toFixed(2)} $</span>} />
              <InfoRow label="Demandé par" value={po.profiles?.full_name} />
              <InfoRow
                label="Livraison prévue"
                value={po.expected_at ? new Date(po.expected_at).toLocaleDateString("fr-CA") : null}
              />
              <InfoRow label="Créé le" value={new Date(po.created_at).toLocaleDateString("fr-CA")} />
            </CardContent>
          </Card>

          {po.suppliers && (
            <Card>
              <CardHeader>
                <CardTitle>Fournisseur</CardTitle>
              </CardHeader>
              <CardContent>
                <InfoRow label="Contact" value={po.suppliers.contact_name} />
                <InfoRow label="Courriel" value={po.suppliers.email} />
                <InfoRow label="Téléphone" value={po.suppliers.phone} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

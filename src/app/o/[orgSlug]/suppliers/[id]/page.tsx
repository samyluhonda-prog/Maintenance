import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { DeleteSupplierButton } from "./delete-supplier-button";
import { DocumentsPanel } from "./documents-panel";

const PO_STATUS_LABELS: Record<string, string> = {
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
const PO_STATUS_VARIANT: Record<string, "success" | "destructive" | "warning" | "secondary" | "outline" | "info"> = {
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

export default async function SupplierDetailPage({ params }: PageProps<"/o/[orgSlug]/suppliers/[id]">) {
  const { orgSlug, id } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const [{ data: supplier }, { data: documents }, { data: equipmentList }, { data: partsList }, { data: purchaseOrders }] =
    await Promise.all([
      supabase.from("suppliers").select("*").eq("id", id).eq("org_id", ctx.org.id).maybeSingle(),
      supabase.from("supplier_documents").select("*").eq("supplier_id", id).order("created_at", { ascending: false }),
      supabase.from("equipment").select("id, name").eq("org_id", ctx.org.id).eq("supplier_id", id).order("name"),
      supabase.from("parts").select("id, name, number").eq("org_id", ctx.org.id).eq("primary_supplier_id", id).order("name"),
      supabase
        .from("purchase_orders")
        .select("id, number, status, total, created_at")
        .eq("org_id", ctx.org.id)
        .eq("supplier_id", id)
        .order("created_at", { ascending: false }),
    ]);

  if (!supplier) notFound();

  const canEdit = ctx.roleKey === "owner" || ctx.roleKey === "admin" || ctx.permissions.has("suppliers.edit");
  const canDelete = ctx.roleKey === "owner" || ctx.roleKey === "admin" || ctx.permissions.has("suppliers.delete");

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{supplier.name}</h1>
          <p className="text-muted-foreground">{supplier.contact_name ?? "Aucun contact désigné"}</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline" asChild>
              <Link href={`/o/${orgSlug}/suppliers/${supplier.id}/edit`}>
                <Pencil /> Modifier
              </Link>
            </Button>
          )}
          {canDelete && <DeleteSupplierButton orgSlug={orgSlug} supplierId={supplier.id} supplierName={supplier.name} />}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Coordonnées</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="Contact" value={supplier.contact_name} />
              <InfoRow label="Courriel" value={supplier.email} />
              <InfoRow label="Téléphone" value={supplier.phone} />
              <InfoRow label="Adresse" value={supplier.address} />
              <InfoRow
                label="Évaluation"
                value={
                  supplier.rating != null ? (
                    <span className="inline-flex items-center gap-1">
                      <Star className="size-3.5 fill-current text-warning" /> {supplier.rating.toFixed(1)} / 5
                    </span>
                  ) : null
                }
              />
              <InfoRow label="Notes" value={supplier.notes} />
            </CardContent>
          </Card>

          <DocumentsPanel orgSlug={orgSlug} orgId={ctx.org.id} supplierId={supplier.id} documents={documents ?? []} />

          <Card>
            <CardHeader>
              <CardTitle>Historique des commandes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numéro</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(purchaseOrders ?? []).map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono text-xs">
                        <Link href={`/o/${orgSlug}/purchasing/${po.id}`} className="hover:underline">
                          {po.number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={PO_STATUS_VARIANT[po.status] ?? "outline"}>{PO_STATUS_LABELS[po.status] ?? po.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{po.total.toFixed(2)} $</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(po.created_at).toLocaleDateString("fr-CA")}</TableCell>
                    </TableRow>
                  ))}
                  {(purchaseOrders ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        Aucune commande pour ce fournisseur.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Équipements fournis</CardTitle>
            </CardHeader>
            <CardContent>
              {(equipmentList ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun équipement.</p>
              ) : (
                <ul className="grid gap-1 text-sm">
                  {(equipmentList ?? []).map((eq) => (
                    <li key={eq.id}>
                      <Link href={`/o/${orgSlug}/equipment/${eq.id}`} className="hover:underline">
                        {eq.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pièces fournies</CardTitle>
            </CardHeader>
            <CardContent>
              {(partsList ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune pièce.</p>
              ) : (
                <ul className="grid gap-1 text-sm">
                  {(partsList ?? []).map((p) => (
                    <li key={p.id}>
                      <Link href={`/o/${orgSlug}/parts/${p.id}`} className="hover:underline">
                        {p.name}
                      </Link>{" "}
                      <span className="text-muted-foreground">({p.number})</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

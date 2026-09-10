import Link from "next/link";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";
import { PURCHASE_ORDER_STATUSES } from "@/lib/validation/purchasing";

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
const OPEN_STATUSES = [
  "draft",
  "requested",
  "pending_approval",
  "approved",
  "ordered",
  "partially_received",
] as const satisfies readonly (typeof PURCHASE_ORDER_STATUSES)[number][];

export default async function PurchasingListPage({
  params,
  searchParams,
}: PageProps<"/o/[orgSlug]/purchasing">) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "open";
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  let query = supabase
    .from("purchase_orders")
    .select("id, number, status, total, expected_at, created_at, suppliers(name)")
    .eq("org_id", ctx.org.id)
    .order("created_at", { ascending: false });

  if (status === "open") query = query.in("status", OPEN_STATUSES);
  else if (status !== "all" && (PURCHASE_ORDER_STATUSES as readonly string[]).includes(status)) {
    query = query.eq("status", status as (typeof PURCHASE_ORDER_STATUSES)[number]);
  }

  const { data: orders } = await query;
  const canCreate = ctx.roleKey === "owner" || ctx.roleKey === "admin" || ctx.permissions.has("purchasing.create");

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Achats</h1>
          <p className="text-muted-foreground">Demandes d’achat et bons de commande.</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href={`/o/${orgSlug}/purchasing/new`}>
              <Plus /> Nouveau bon de commande
            </Link>
          </Button>
        )}
      </div>

      <Tabs value={status} className="mb-4">
        <TabsList>
          <TabsTrigger value="open" asChild>
            <Link href={`/o/${orgSlug}/purchasing?status=open`}>En cours</Link>
          </TabsTrigger>
          <TabsTrigger value="received" asChild>
            <Link href={`/o/${orgSlug}/purchasing?status=received`}>Reçues</Link>
          </TabsTrigger>
          <TabsTrigger value="closed" asChild>
            <Link href={`/o/${orgSlug}/purchasing?status=closed`}>Fermées</Link>
          </TabsTrigger>
          <TabsTrigger value="cancelled" asChild>
            <Link href={`/o/${orgSlug}/purchasing?status=cancelled`}>Annulées</Link>
          </TabsTrigger>
          <TabsTrigger value="all" asChild>
            <Link href={`/o/${orgSlug}/purchasing?status=all`}>Toutes</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Fournisseur</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Livraison prévue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(orders ?? []).map((po) => (
              <TableRow key={po.id}>
                <TableCell className="font-mono text-xs">
                  <Link href={`/o/${orgSlug}/purchasing/${po.id}`} className="hover:underline">
                    {po.number}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{po.suppliers?.name ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[po.status] ?? "outline"}>{STATUS_LABELS[po.status] ?? po.status}</Badge>
                </TableCell>
                <TableCell className="text-right">{po.total.toFixed(2)} $</TableCell>
                <TableCell className="text-muted-foreground">
                  {po.expected_at ? new Date(po.expected_at).toLocaleDateString("fr-CA") : "—"}
                </TableCell>
              </TableRow>
            ))}
            {(orders ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Aucun bon de commande.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

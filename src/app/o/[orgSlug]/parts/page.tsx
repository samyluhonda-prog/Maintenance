import Link from "next/link";
import { AlertTriangle, Download, Plus, QrCode } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { ImportCsvDialog } from "./import-csv-dialog";

export default async function PartsListPage({
  params,
  searchParams,
}: PageProps<"/o/[orgSlug]/parts">) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const view = sp.view === "low" ? "low" : "all";
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  let query = supabase
    .from("parts")
    .select(
      "id, number, name, category, manufacturer, unit, unit_cost, quantity_on_hand, quantity_reserved, quantity_on_order, min_threshold, locations(name)",
    )
    .eq("org_id", ctx.org.id)
    .order("name");
  if (q) query = query.or(`name.ilike.%${q}%,number.ilike.%${q}%`);
  if (category) query = query.eq("category", category);

  const [{ data: parts }, { data: categoryRows }] = await Promise.all([
    query,
    supabase.from("parts").select("category").eq("org_id", ctx.org.id).not("category", "is", null),
  ]);

  const categories = Array.from(new Set((categoryRows ?? []).map((r) => r.category).filter((c): c is string => !!c))).sort();

  const allRows = parts ?? [];
  const lowStockRows = allRows.filter((p) => p.quantity_on_hand <= p.min_threshold);
  const rows = view === "low" ? lowStockRows : allRows;

  const canCreate = ctx.roleKey === "owner" || ctx.roleKey === "admin" || ctx.permissions.has("parts.create");

  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (category) baseParams.set("category", category);
  const qs = baseParams.toString();

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pièces et inventaire</h1>
          <p className="text-muted-foreground">Catalogue des pièces et suivi des stocks.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href={`/o/${orgSlug}/parts/export`}>
              <Download /> Exporter CSV
            </a>
          </Button>
          {canCreate && <ImportCsvDialog orgSlug={orgSlug} orgId={ctx.org.id} />}
          {canCreate && (
            <Button asChild>
              <Link href={`/o/${orgSlug}/parts/new`}>
                <Plus /> Nouvelle pièce
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Tabs value={view} className="mb-4">
        <TabsList>
          <TabsTrigger value="all" asChild>
            <Link href={`/o/${orgSlug}/parts?view=all${qs ? `&${qs}` : ""}`}>Toutes</Link>
          </TabsTrigger>
          <TabsTrigger value="low" asChild>
            <Link href={`/o/${orgSlug}/parts?view=low${qs ? `&${qs}` : ""}`}>Stock faible ({lowStockRows.length})</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <form className="mb-4 flex flex-wrap gap-2">
        <input type="hidden" name="view" value={view} />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Rechercher par nom ou numéro…"
          className="h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm shadow-xs"
        />
        <select
          name="category"
          defaultValue={category}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
        >
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Filtrer
        </Button>
      </form>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Emplacement</TableHead>
              <TableHead className="text-right">En stock</TableHead>
              <TableHead className="text-right">Réservé</TableHead>
              <TableHead className="text-right">Coût unitaire</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => {
              const isLow = p.quantity_on_hand <= p.min_threshold;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.number}</TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/o/${orgSlug}/parts/${p.id}`} className="hover:underline">
                      {p.name}
                    </Link>
                    {isLow && (
                      <Badge variant="destructive" className="ml-2">
                        <AlertTriangle /> Stock faible
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.category ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.locations?.name ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {p.quantity_on_hand} {p.unit}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{p.quantity_reserved}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{p.unit_cost.toFixed(2)} $</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {isLow && (
                        <Button variant="ghost" size="icon" asChild title="Créer une commande">
                          <Link href={`/o/${orgSlug}/purchasing/new?partId=${p.id}`}>
                            <Plus className="size-4" />
                          </Link>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" asChild title="Code QR">
                        <Link href={`/o/${orgSlug}/parts/${p.id}#qr`}>
                          <QrCode className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Aucune pièce trouvée.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Download, Plus, QrCode } from "lucide-react";

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
import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { ImportCsvDialog } from "./import-csv-dialog";

const STATUS_VARIANT: Record<string, "success" | "destructive" | "warning" | "secondary" | "outline"> = {
  operational: "success",
  down: "destructive",
  in_repair: "warning",
  decommissioned: "secondary",
  standby: "outline",
};
const STATUS_LABELS: Record<string, string> = {
  operational: "En service",
  down: "Arrêté",
  in_repair: "En réparation",
  decommissioned: "Hors service",
  standby: "En attente",
};
const CRITICALITY_LABELS: Record<string, string> = {
  low: "Faible",
  medium: "Moyenne",
  high: "Élevée",
  critical: "Critique",
};

export default async function EquipmentListPage({
  params,
  searchParams,
}: PageProps<"/o/[orgSlug]/equipment">) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  let query = supabase
    .from("equipment")
    .select("id, name, internal_code, category, status, criticality, manufacturer, model, locations(name)")
    .eq("org_id", ctx.org.id)
    .order("name");

  if (q) query = query.ilike("name", `%${q}%`);

  const { data: equipment } = await query;
  const canCreate = ctx.roleKey === "owner" || ctx.roleKey === "admin" || ctx.permissions.has("equipment.create");

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Équipements</h1>
          <p className="text-muted-foreground">Registre complet de vos actifs industriels.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href={`/o/${orgSlug}/equipment/export`}>
              <Download /> Exporter CSV
            </a>
          </Button>
          {canCreate && <ImportCsvDialog orgSlug={orgSlug} orgId={ctx.org.id} />}
          {canCreate && (
            <Button asChild>
              <Link href={`/o/${orgSlug}/equipment/new`}>
                <Plus /> Nouvel équipement
              </Link>
            </Button>
          )}
        </div>
      </div>

      <form className="mb-4 max-w-sm">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Rechercher un équipement…"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs"
        />
      </form>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Emplacement</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Criticité</TableHead>
              <TableHead>Fabricant / Modèle</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(equipment ?? []).map((eq) => (
              <TableRow key={eq.id}>
                <TableCell className="font-medium">
                  <Link href={`/o/${orgSlug}/equipment/${eq.id}`} className="hover:underline">
                    {eq.name}
                  </Link>
                  {eq.internal_code && (
                    <span className="ml-2 text-xs text-muted-foreground">{eq.internal_code}</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{eq.locations?.name ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[eq.status] ?? "outline"}>
                    {STATUS_LABELS[eq.status] ?? eq.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{CRITICALITY_LABELS[eq.criticality] ?? eq.criticality}</TableCell>
                <TableCell className="text-muted-foreground">
                  {[eq.manufacturer, eq.model].filter(Boolean).join(" / ") || "—"}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" asChild title="Code QR">
                    <Link href={`/o/${orgSlug}/equipment/${eq.id}#qr`}>
                      <QrCode className="size-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(equipment ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Aucun équipement trouvé.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

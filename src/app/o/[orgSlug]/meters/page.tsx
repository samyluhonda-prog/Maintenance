import Link from "next/link";
import { Gauge, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

const KIND_LABELS: Record<string, string> = {
  hours: "Heures",
  kilometers: "Kilomètres",
  cycles: "Cycles",
  pressure: "Pression",
  temperature: "Température",
  vibration: "Vibration",
  energy: "Énergie",
  weight: "Poids",
  production: "Production",
  custom: "Personnalisé",
};

export default async function MetersListPage({ params }: PageProps<"/o/[orgSlug]/meters">) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const { data: meters } = await supabase
    .from("meters")
    .select("*, equipment(name)")
    .eq("org_id", ctx.org.id)
    .order("name");

  const meterIds = (meters ?? []).map((m) => m.id);
  const { data: readings } =
    meterIds.length > 0
      ? await supabase
          .from("meter_readings")
          .select("meter_id, value, recorded_at")
          .in("meter_id", meterIds)
          .order("recorded_at", { ascending: false })
      : { data: [] as { meter_id: string; value: number; recorded_at: string }[] };

  const latestByMeter = new Map<string, { value: number; recorded_at: string }>();
  for (const r of readings ?? []) {
    if (!latestByMeter.has(r.meter_id)) latestByMeter.set(r.meter_id, r);
  }

  const canCreate = ctx.roleKey === "owner" || ctx.roleKey === "admin" || ctx.permissions.has("meters.create");

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Compteurs</h1>
          <p className="text-muted-foreground">Relevés de compteurs (heures, km, cycles…) sur vos équipements.</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href={`/o/${orgSlug}/meters/new`}>
              <Plus /> Nouveau compteur
            </Link>
          </Button>
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Équipement</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Unité</TableHead>
              <TableHead>Dernier relevé</TableHead>
              <TableHead>Quand</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(meters ?? []).map((meter) => {
              const latest = latestByMeter.get(meter.id);
              return (
                <TableRow key={meter.id}>
                  <TableCell className="font-medium">
                    <Link href={`/o/${orgSlug}/meters/${meter.id}`} className="hover:underline">
                      {meter.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{meter.equipment?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{KIND_LABELS[meter.kind] ?? meter.kind}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{meter.unit}</TableCell>
                  <TableCell className="font-medium">{latest ? `${latest.value} ${meter.unit}` : "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {latest ? new Date(latest.recorded_at).toLocaleString("fr-CA") : "Aucun relevé"}
                  </TableCell>
                </TableRow>
              );
            })}
            {(meters ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  <Gauge className="mx-auto mb-2 size-6" />
                  Aucun compteur pour le moment.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

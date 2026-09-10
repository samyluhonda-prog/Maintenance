import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireOrgAccess } from "@/lib/data/orgs";
import { createClient } from "@/lib/supabase/server";

import { ReadingForm } from "./reading-form";
import { ReadingsChart } from "./readings-chart";

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
const SOURCE_LABELS: Record<string, string> = { manual: "Manuelle", api: "API", sensor: "Capteur" };

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value ?? "—"}</span>
    </div>
  );
}

export default async function MeterDetailPage({ params }: PageProps<"/o/[orgSlug]/meters/[id]">) {
  const { orgSlug, id } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const [{ data: meter }, { data: readings }] = await Promise.all([
    supabase.from("meters").select("*, equipment(id, name)").eq("id", id).eq("org_id", ctx.org.id).maybeSingle(),
    supabase
      .from("meter_readings")
      .select("*, profiles(full_name)")
      .eq("meter_id", id)
      .order("recorded_at", { ascending: false }),
  ]);

  if (!meter) notFound();

  const canEdit = ctx.roleKey === "owner" || ctx.roleKey === "admin" || ctx.permissions.has("meters.edit");
  const latest = readings?.[0];

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{meter.name}</h1>
            <Badge variant="outline">{KIND_LABELS[meter.kind] ?? meter.kind}</Badge>
          </div>
          <p className="text-muted-foreground">
            {meter.equipment ? (
              <Link href={`/o/${orgSlug}/equipment/${meter.equipment.id}`} className="hover:underline">
                {meter.equipment.name}
              </Link>
            ) : (
              "Équipement inconnu"
            )}
          </p>
        </div>
        {canEdit && (
          <Button variant="outline" asChild>
            <Link href={`/o/${orgSlug}/meters/${meter.id}/edit`}>
              <Pencil /> Modifier
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Historique des relevés</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <ReadingsChart data={readings ?? []} unit={meter.unit} />
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Valeur</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Enregistré par</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(readings ?? []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{new Date(r.recorded_at).toLocaleString("fr-CA")}</TableCell>
                        <TableCell className="font-medium">
                          {r.value} {meter.unit}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{SOURCE_LABELS[r.source] ?? r.source}</TableCell>
                        <TableCell className="text-muted-foreground">{r.profiles?.full_name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{r.note ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                    {(readings ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                          Aucun relevé pour le moment.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <ReadingForm orgSlug={orgSlug} orgId={ctx.org.id} meterId={meter.id} unit={meter.unit} />
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Détails</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="Unité" value={meter.unit} />
              <InfoRow label="Source" value={SOURCE_LABELS[meter.source] ?? meter.source} />
              <InfoRow label="Cumulatif" value={meter.is_cumulative ? "Oui" : "Non"} />
              <InfoRow label="Dernière valeur" value={latest ? `${latest.value} ${meter.unit}` : null} />
              <InfoRow label="Dernier relevé" value={latest ? new Date(latest.recorded_at).toLocaleString("fr-CA") : null} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

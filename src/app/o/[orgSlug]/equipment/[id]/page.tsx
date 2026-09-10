import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgAccess } from "@/lib/data/orgs";
import { generateQrSvg } from "@/lib/qr";
import { createClient } from "@/lib/supabase/server";

import { AiInsightsCard } from "./ai-insights-card";
import { DocumentsPanel } from "./documents-panel";
import { MetersPanel } from "./meters-panel";
import { QrCard } from "./qr-card";

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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value ?? "—"}</span>
    </div>
  );
}

export default async function EquipmentDetailPage({ params }: PageProps<"/o/[orgSlug]/equipment/[id]">) {
  const { orgSlug, id } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const [{ data: equipment }, { data: documents }, { data: meters }] = await Promise.all([
    supabase
      .from("equipment")
      .select("*, locations(name), suppliers(name)")
      .eq("id", id)
      .eq("org_id", ctx.org.id)
      .maybeSingle(),
    supabase.from("equipment_documents").select("*").eq("equipment_id", id).order("created_at", { ascending: false }),
    supabase.from("meters").select("id, name, unit").eq("equipment_id", id).order("name"),
  ]);

  if (!equipment) notFound();

  const meterIds = (meters ?? []).map((m) => m.id);
  const { data: meterReadings } =
    meterIds.length > 0
      ? await supabase
          .from("meter_readings")
          .select("meter_id, value, recorded_at")
          .in("meter_id", meterIds)
          .order("recorded_at", { ascending: false })
      : { data: [] as { meter_id: string; value: number; recorded_at: string }[] };
  const latestByMeter = new Map<string, { value: number; recorded_at: string }>();
  for (const r of meterReadings ?? []) {
    if (!latestByMeter.has(r.meter_id)) latestByMeter.set(r.meter_id, r);
  }
  const meterRows = (meters ?? []).map((m) => ({ ...m, latest: latestByMeter.get(m.id) ?? null }));

  const qrSvg = equipment.qr_code ? await generateQrSvg(equipment.qr_code) : null;
  const canEdit = ctx.roleKey === "owner" || ctx.roleKey === "admin" || ctx.permissions.has("equipment.edit");

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{equipment.name}</h1>
            <Badge variant={equipment.status === "down" ? "destructive" : "success"}>
              {STATUS_LABELS[equipment.status] ?? equipment.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {equipment.internal_code ?? "Sans identifiant interne"} · {equipment.locations?.name ?? "Aucun emplacement"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/o/${orgSlug}/requests/new?equipmentId=${equipment.id}`}>
              <AlertTriangle /> Signaler un problème
            </Link>
          </Button>
          {canEdit && (
            <Button variant="outline" asChild>
              <Link href={`/o/${orgSlug}/equipment/${equipment.id}/edit`}>
                <Pencil /> Modifier
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Détails</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="Catégorie" value={equipment.category} />
              <InfoRow label="Criticité" value={CRITICALITY_LABELS[equipment.criticality] ?? equipment.criticality} />
              <InfoRow label="Fabricant" value={equipment.manufacturer} />
              <InfoRow label="Modèle" value={equipment.model} />
              <InfoRow label="Numéro de série" value={equipment.serial_number} />
              <InfoRow label="Fournisseur" value={equipment.suppliers?.name} />
              <InfoRow label="Date de mise en service" value={equipment.commissioned_at} />
              <InfoRow label="Fin de garantie" value={equipment.warranty_expires_at} />
              <InfoRow
                label="Coût d’acquisition"
                value={equipment.acquisition_cost != null ? `${equipment.acquisition_cost} $` : null}
              />
              <InfoRow
                label="Coût cumulatif"
                value={equipment.cumulative_cost != null ? `${equipment.cumulative_cost} $` : null}
              />
              <InfoRow
                label="Temps d’arrêt cumulatif"
                value={
                  equipment.cumulative_downtime_minutes != null
                    ? `${Math.round(equipment.cumulative_downtime_minutes / 60)} h`
                    : null
                }
              />
            </CardContent>
          </Card>

          <MetersPanel orgSlug={orgSlug} orgId={ctx.org.id} equipmentId={equipment.id} meters={meterRows} />

          <DocumentsPanel orgSlug={orgSlug} orgId={ctx.org.id} equipmentId={equipment.id} documents={documents ?? []} />
        </div>

        <div className="grid gap-6">
          {qrSvg && <QrCard svg={qrSvg} code={equipment.qr_code!} name={equipment.name} internalCode={equipment.internal_code} />}
          <AiInsightsCard equipmentId={equipment.id} />
        </div>
      </div>
    </div>
  );
}

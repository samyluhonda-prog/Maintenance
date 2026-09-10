import Papa from "papaparse";

import { requireOrgAccess } from "@/lib/data/orgs";
import { getReportSnapshot } from "@/lib/data/reports";

export async function GET(request: Request, { params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await requireOrgAccess(orgSlug);
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const to = url.searchParams.get("to") ?? new Date().toISOString().slice(0, 10);

  const snapshot = await getReportSnapshot(ctx.org.id, {
    from: new Date(from).toISOString(),
    to: new Date(new Date(to).getTime() + 86400000).toISOString(),
  });

  const rows = [
    { indicateur: "Période", valeur: `${from} au ${to}` },
    { indicateur: "Bons de travail ouverts", valeur: snapshot.openWorkOrders },
    { indicateur: "Bons de travail en retard", valeur: snapshot.overdueWorkOrders },
    { indicateur: "% préventif", valeur: `${snapshot.preventivePercent}%` },
    { indicateur: "Conformité préventive", valeur: snapshot.pmComplianceRatePercent ?? "—" },
    { indicateur: "MTTR (h)", valeur: snapshot.mttrHours?.toFixed(1) ?? "—" },
    { indicateur: "MTBF estimé (h)", valeur: snapshot.mtbfHours?.toFixed(0) ?? "—" },
    { indicateur: "Disponibilité (%)", valeur: snapshot.availabilityPercent?.toFixed(1) ?? "—" },
    { indicateur: "Temps d'arrêt total (h)", valeur: Math.round(snapshot.totalDowntimeMinutes / 60) },
    { indicateur: "Coût main-d'œuvre ($)", valeur: snapshot.laborCost.toFixed(0) },
    { indicateur: "Coût pièces ($)", valeur: snapshot.partsCost.toFixed(0) },
    { indicateur: "Coût externe ($)", valeur: snapshot.externalCost.toFixed(0) },
    { indicateur: "Coût total ($)", valeur: snapshot.totalCost.toFixed(0) },
    { indicateur: "Valeur de l'inventaire ($)", valeur: snapshot.inventoryValue.toFixed(0) },
    { indicateur: "Pièces sous le seuil minimal", valeur: snapshot.lowStockCount },
    { indicateur: "Unités de pièces consommées", valeur: snapshot.partsConsumedUnits },
    { indicateur: "Inspections échouées", valeur: snapshot.failedInspections },
  ];

  const csv = Papa.unparse(rows);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rapport-${orgSlug}-${from}-${to}.csv"`,
    },
  });
}

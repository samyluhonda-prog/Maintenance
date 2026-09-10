import { Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireOrgAccess } from "@/lib/data/orgs";
import { getReportSnapshot } from "@/lib/data/reports";

import { CostByEquipmentChart, PreventiveCorrectiveChart, WorkOrdersByStatusChart } from "./report-charts";

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {hint && <CardContent className="pt-0 text-xs text-muted-foreground">{hint}</CardContent>}
    </Card>
  );
}

export default async function ReportsPage({ params, searchParams }: PageProps<"/o/[orgSlug]/reports">) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const ctx = await requireOrgAccess(orgSlug);

  const nowDate = new Date();
  const thirtyDaysAgo = new Date(nowDate);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const to = typeof sp.to === "string" ? sp.to : nowDate.toISOString().slice(0, 10);
  const from = typeof sp.from === "string" ? sp.from : thirtyDaysAgo.toISOString().slice(0, 10);

  const snapshot = await getReportSnapshot(ctx.org.id, {
    from: new Date(from).toISOString(),
    to: new Date(new Date(to).getTime() + 86400000).toISOString(),
  });

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rapports et analyses</h1>
          <p className="text-muted-foreground">Fiabilité, coûts et conformité — {from} au {to}.</p>
        </div>
        <div className="flex items-center gap-2">
          <form className="flex items-center gap-2">
            <input type="date" name="from" defaultValue={from} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
            <span className="text-muted-foreground">à</span>
            <input type="date" name="to" defaultValue={to} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
            <Button type="submit" variant="outline" size="sm">
              Appliquer
            </Button>
          </form>
          <Button variant="outline" asChild>
            <a href={`/o/${orgSlug}/reports/export?from=${from}&to=${to}`}>
              <Download /> Exporter CSV
            </a>
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Bons de travail ouverts" value={String(snapshot.openWorkOrders)} />
        <Kpi label="Bons de travail en retard" value={String(snapshot.overdueWorkOrders)} />
        <Kpi label="% préventif" value={`${snapshot.preventivePercent}%`} hint={`${snapshot.preventiveCount} préventifs / ${snapshot.correctiveCount} correctifs`} />
        <Kpi
          label="Conformité préventive"
          value={snapshot.pmComplianceRatePercent != null ? `${snapshot.pmComplianceRatePercent}%` : "—"}
        />
        <Kpi label="MTTR (temps moyen de réparation)" value={snapshot.mttrHours != null ? `${snapshot.mttrHours.toFixed(1)} h` : "—"} />
        <Kpi
          label="MTBF (estimé)"
          value={snapshot.mtbfHours != null ? `${snapshot.mtbfHours.toFixed(0)} h` : "—"}
          hint="Estimation à l’échelle du parc, pas par équipement"
        />
        <Kpi
          label="Disponibilité"
          value={snapshot.availabilityPercent != null ? `${snapshot.availabilityPercent.toFixed(1)}%` : "—"}
        />
        <Kpi label="Temps d’arrêt total" value={`${Math.round(snapshot.totalDowntimeMinutes / 60)} h`} />
        <Kpi label="Coût total" value={`${snapshot.totalCost.toFixed(0)} $`} hint={`Main-d’œuvre ${snapshot.laborCost.toFixed(0)} $ · Pièces ${snapshot.partsCost.toFixed(0)} $ · Externe ${snapshot.externalCost.toFixed(0)} $`} />
        <Kpi label="Valeur de l’inventaire" value={`${snapshot.inventoryValue.toFixed(0)} $`} />
        <Kpi label="Pièces sous le seuil minimal" value={String(snapshot.lowStockCount)} />
        <Kpi label="Inspections échouées" value={String(snapshot.failedInspections)} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bons de travail par statut</CardTitle>
          </CardHeader>
          <CardContent>
            <WorkOrdersByStatusChart data={snapshot.workOrdersByStatus} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Préventif vs correctif</CardTitle>
          </CardHeader>
          <CardContent>
            <PreventiveCorrectiveChart preventive={snapshot.preventiveCount} corrective={snapshot.correctiveCount} />
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Coût par équipement (top 8)</CardTitle>
        </CardHeader>
        <CardContent>
          <CostByEquipmentChart data={snapshot.costByEquipment} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pannes récurrentes</CardTitle>
            <CardDescription>Équipements avec 3 pannes correctives ou plus sur la période</CardDescription>
          </CardHeader>
          <CardContent>
            {snapshot.recurringFailureEquipment.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun équipement en pannes récurrentes.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Équipement</TableHead>
                    <TableHead>Pannes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshot.recurringFailureEquipment.map((e) => (
                    <TableRow key={e.equipmentName}>
                      <TableCell>{e.equipmentName}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{e.failureCount}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Charge de travail par technicien</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Technicien</TableHead>
                  <TableHead>Bons de travail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.workloadByTechnician.map((t) => (
                  <TableRow key={t.fullName}>
                    <TableCell>{t.fullName}</TableCell>
                    <TableCell>{t.count}</TableCell>
                  </TableRow>
                ))}
                {snapshot.workloadByTechnician.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      Aucune donnée.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance des fournisseurs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Commandes</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.supplierSpend.map((s) => (
                  <TableRow key={s.supplierName}>
                    <TableCell>{s.supplierName}</TableCell>
                    <TableCell>{s.orderCount}</TableCell>
                    <TableCell>{s.total.toFixed(0)} $</TableCell>
                  </TableRow>
                ))}
                {snapshot.supplierSpend.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Aucune commande sur la période.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demandes par statut</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Statut</TableHead>
                  <TableHead>Nombre</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.requestsByStatus.map((r) => (
                  <TableRow key={r.status}>
                    <TableCell className="capitalize">{r.status}</TableCell>
                    <TableCell>{r.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

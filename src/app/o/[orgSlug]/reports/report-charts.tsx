"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { ReportSnapshot } from "@/lib/data/reports";

const COLORS = ["#2c4a7c", "#f5a524", "#2f9e6e", "#dc4f4f", "#7a5ac0"];

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  open: "Ouvert",
  planned: "Planifié",
  assigned: "Assigné",
  in_progress: "En cours",
  on_hold: "En pause",
  completed: "Terminé",
  to_review: "À vérifier",
  closed: "Fermé",
  cancelled: "Annulé",
  skipped: "Sauté",
};

export function WorkOrdersByStatusChart({ data }: { data: ReportSnapshot["workOrdersByStatus"] }) {
  const chartData = data.map((d) => ({ name: STATUS_LABELS[d.status] ?? d.status, count: d.count }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="count" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PreventiveCorrectiveChart({ preventive, corrective }: { preventive: number; corrective: number }) {
  const data = [
    { name: "Préventif", value: preventive },
    { name: "Correctif", value: corrective },
  ];
  if (preventive === 0 && corrective === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Aucune donnée pour cette période.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={80} label>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CostByEquipmentChart({ data }: { data: ReportSnapshot["costByEquipment"] }) {
  if (data.length === 0) return <p className="py-10 text-center text-sm text-muted-foreground">Aucun coût enregistré.</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="equipmentName" width={140} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => `${Number(v).toFixed(0)} $`} />
        <Bar dataKey="cost" fill={COLORS[1]} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ReadingsChart({
  data,
  unit,
}: {
  data: { recorded_at: string; value: number }[];
  unit: string;
}) {
  const chartData = data
    .slice()
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
    .map((r) => ({ date: new Date(r.recorded_at).toLocaleDateString("fr-CA"), value: r.value }));

  if (chartData.length < 2) {
    return <p className="text-sm text-muted-foreground">Au moins deux relevés sont nécessaires pour afficher un graphique.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={48}
          unit={` ${unit}`}
        />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 13,
            color: "var(--card-foreground)",
          }}
          formatter={(value) => [`${value} ${unit}`, "Valeur"]}
        />
        <Line type="monotone" dataKey="value" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";

interface WaterfallData {
  month: string;
  newMrr: number;
  expansionMrr: number;
  contractionMrr: number;
  churnMrr: number;
  netMrr: number;
  totalMrr: number | null;
}

function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(parseInt(year), parseInt(m) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toFixed(0)}`;
}

export function MrrWaterfallChart({ data }: { data: WaterfallData[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatMonth(d.month),
    contractionMrrNeg: -d.contractionMrr,
    churnMrrNeg: -d.churnMrr,
  }));

  if (chartData.every((d) => d.newMrr === 0 && d.churnMrr === 0)) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p>No MRR data yet. Connect Stripe to start tracking.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="label"
          className="text-xs"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis
          tickFormatter={formatCurrency}
          className="text-xs"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
        />
        <Tooltip
          formatter={(value, name) => {
            const labels: Record<string, string> = {
              newMrr: "New",
              expansionMrr: "Expansion",
              contractionMrrNeg: "Contraction",
              churnMrrNeg: "Churn",
              totalMrr: "Total MRR",
            };
            return [formatCurrency(Math.abs(Number(value ?? 0))), labels[String(name)] ?? String(name)];
          }}
          labelFormatter={(label) => String(label)}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            color: "hsl(var(--card-foreground))",
          }}
        />
        <Legend
          formatter={(value: string) => {
            const labels: Record<string, string> = {
              newMrr: "New",
              expansionMrr: "Expansion",
              contractionMrrNeg: "Contraction",
              churnMrrNeg: "Churn",
              totalMrr: "Total MRR",
            };
            return labels[value] ?? value;
          }}
        />
        <Bar dataKey="newMrr" stackId="a" fill="hsl(142, 76%, 36%)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="expansionMrr" stackId="a" fill="hsl(142, 76%, 56%)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="contractionMrrNeg" stackId="a" fill="hsl(0, 84%, 60%)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="churnMrrNeg" stackId="a" fill="hsl(0, 84%, 40%)" radius={[0, 0, 0, 0]} />
        <Line
          type="monotone"
          dataKey="totalMrr"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ fill: "hsl(var(--primary))", r: 3 }}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

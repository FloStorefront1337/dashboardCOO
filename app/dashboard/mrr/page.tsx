"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Users, DollarSign, Activity, AlertTriangle } from "lucide-react";
import { MrrWaterfallChart } from "./waterfall-chart";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export default function MrrOverviewPage() {
  const summary = useQuery(api.mrr.getSummary);
  const waterfall = useQuery(api.mrr.getWaterfall, { months: 12 });

  if (!summary) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">MRR Overview</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: "Current MRR",
      value: formatCurrency(summary.currentMrr),
      delta: formatPct(summary.mrrGrowthPct),
      deltaPositive: summary.mrrGrowthPct >= 0,
      subtitle: "vs last month",
      icon: DollarSign,
    },
    {
      title: "Active Subscribers",
      value: summary.subscriberCount.toString(),
      delta: `${summary.basicCount} basic, ${summary.boostCount} boost`,
      deltaPositive: true,
      subtitle: "unique LOs",
      icon: Users,
    },
    {
      title: "Net New MRR",
      value: formatCurrency(summary.netNewMrr),
      delta: `+${formatCurrency(summary.newMrr + summary.expansionMrr)} / -${formatCurrency(summary.contractionMrr + summary.churnMrr)}`,
      deltaPositive: summary.netNewMrr >= 0,
      subtitle: "this month",
      icon: Activity,
    },
    {
      title: "MRR Churn Rate",
      value: `${summary.churnRate.toFixed(1)}%`,
      delta:
        summary.lastMonthChurnRate > 0
          ? `${formatPct(summary.churnRate - summary.lastMonthChurnRate)} vs last month`
          : "no prior data",
      deltaPositive: summary.churnRate <= summary.lastMonthChurnRate,
      subtitle: formatCurrency(summary.churnMrr) + " churned",
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">MRR Overview</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="flex items-center gap-1 text-xs">
                {card.deltaPositive ? (
                  <TrendingUp className="size-3 text-green-500" />
                ) : (
                  <TrendingDown className="size-3 text-red-500" />
                )}
                <span
                  className={
                    card.deltaPositive ? "text-green-500" : "text-red-500"
                  }
                >
                  {card.delta}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {card.subtitle}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>MRR Waterfall — Last 12 Months</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px]">
          {waterfall ? (
            <MrrWaterfallChart data={waterfall} />
          ) : (
            <Skeleton className="h-full w-full" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CreditCard, Clock } from "lucide-react";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysAgo(ts: number): number {
  return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
}

export default function LeakagePage() {
  const leakage = useQuery(api.payments.getLeakage);

  if (!leakage) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Revenue Leakage</h1>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalAtRisk =
    leakage.failedPayments.totalAmountUsd + leakage.pastDue.mrrAtRiskUsd;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Revenue Leakage</h1>
        {totalAtRisk > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-1.5 text-sm text-red-500">
            <AlertTriangle className="size-4" />
            {formatCurrency(totalAtRisk)} at risk
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failed Payments (30d)
            </CardTitle>
            <AlertTriangle className="size-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leakage.failedPayments.count}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(leakage.failedPayments.totalAmountUsd)} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expiring Cards
            </CardTitle>
            <CreditCard className="size-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leakage.expiringCards.count}
            </div>
            <p className="text-xs text-muted-foreground">
              within next 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Past Due (Grace Period)
            </CardTitle>
            <Clock className="size-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leakage.pastDue.count}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(leakage.pastDue.mrrAtRiskUsd)} MRR at risk
            </p>
          </CardContent>
        </Card>
      </div>

      {leakage.failedPayments.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unresolved Payment Failures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                      Landlord
                    </th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                      Amount
                    </th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                      Reason
                    </th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                      Attempts
                    </th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                      First Failed
                    </th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leakage.failedPayments.items.map((f) => (
                    <tr
                      key={f._id}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <td className="px-3 py-3">
                        <div className="font-medium">
                          {f.loName ?? "Unknown"}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-medium">
                        {formatCurrency(f.amountUsd)}
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs">
                          {f.failureMessage ?? f.failureCode ?? "Unknown"}
                        </span>
                      </td>
                      <td className="px-3 py-3">{f.attemptCount}</td>
                      <td className="px-3 py-3">
                        <div className="text-sm">
                          {formatDate(f.firstFailedAt)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {daysAgo(f.firstFailedAt)} days ago
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <a
                          href={`https://dashboard.stripe.com/invoices/${f.stripeInvoiceId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Stripe
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {leakage.expiringCards.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Expiring Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                      Landlord
                    </th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                      MRR
                    </th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                      Card
                    </th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                      Expires
                    </th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leakage.expiringCards.items.map((s) => (
                    <tr
                      key={s._id}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <td className="px-3 py-3">
                        <div className="font-medium">
                          {s.loName ?? "Unknown"}
                        </div>
                        {s.email && (
                          <div className="text-xs text-muted-foreground">
                            {s.email}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 font-medium">
                        {formatCurrency(s.mrrUsd)}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {s.paymentMethodBrand ?? "Card"} ****
                        {s.paymentMethodLast4 ?? "????"}
                      </td>
                      <td className="px-3 py-3 text-sm">
                        {s.paymentMethodExpMonth}/{s.paymentMethodExpYear}
                      </td>
                      <td className="px-3 py-3">
                        <a
                          href={`https://dashboard.stripe.com/subscriptions/${s.stripeSubscriptionId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Stripe
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {leakage.pastDue.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Grace Period Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                      Landlord
                    </th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                      Plan
                    </th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                      MRR
                    </th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                      Market
                    </th>
                    <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leakage.pastDue.items.map((s) => (
                    <tr
                      key={s._id}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <td className="px-3 py-3">
                        <div className="font-medium">
                          {s.loName ?? "Unknown"}
                        </div>
                        {s.email && (
                          <div className="text-xs text-muted-foreground">
                            {s.email}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            s.plan === "boost"
                              ? "bg-purple-500/10 text-purple-500"
                              : "bg-blue-500/10 text-blue-500"
                          }`}
                        >
                          {s.plan.charAt(0).toUpperCase() + s.plan.slice(1)}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-medium">
                        {formatCurrency(s.mrrUsd)}
                      </td>
                      <td className="px-3 py-3 text-sm">
                        {s.market ?? "-"}
                      </td>
                      <td className="px-3 py-3">
                        <a
                          href={`https://dashboard.stripe.com/subscriptions/${s.stripeSubscriptionId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Stripe
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {leakage.failedPayments.count === 0 &&
        leakage.expiringCards.count === 0 &&
        leakage.pastDue.count === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No revenue leakage detected. All payments are healthy.
              </p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}

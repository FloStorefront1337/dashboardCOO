"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";

type Subscription = {
  _id: string;
  stripeSubscriptionId: string;
  loName?: string;
  email?: string;
  market?: string;
  plan: "basic" | "boost";
  status: string;
  mrrUsd: number;
  currency: string;
  listingCount: number;
  startDate: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  paymentMethodLast4?: string;
  paymentMethodBrand?: string;
};

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

const statusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-500",
  past_due: "bg-yellow-500/10 text-yellow-500",
  canceled: "bg-red-500/10 text-red-500",
  trialing: "bg-blue-500/10 text-blue-500",
  unpaid: "bg-red-500/10 text-red-500",
  paused: "bg-muted text-muted-foreground",
};

const columns: ColumnDef<Subscription>[] = [
  {
    accessorKey: "loName",
    header: "Landlord",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">
          {row.original.loName ?? "Unknown LO"}
        </div>
        {row.original.email && (
          <div className="text-xs text-muted-foreground">
            {row.original.email}
          </div>
        )}
      </div>
    ),
  },
  {
    accessorKey: "market",
    header: "Market",
    cell: ({ getValue }) => (
      <span className="text-sm">{(getValue() as string) ?? "-"}</span>
    ),
  },
  {
    accessorKey: "plan",
    header: "Plan",
    cell: ({ getValue }) => {
      const plan = getValue() as string;
      return (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            plan === "boost"
              ? "bg-purple-500/10 text-purple-500"
              : "bg-blue-500/10 text-blue-500"
          }`}
        >
          {plan.charAt(0).toUpperCase() + plan.slice(1)}
        </span>
      );
    },
  },
  {
    accessorKey: "listingCount",
    header: "Listings",
    cell: ({ getValue }) => getValue() as number,
  },
  {
    accessorKey: "mrrUsd",
    header: "MRR",
    cell: ({ getValue }) => (
      <span className="font-medium">{formatCurrency(getValue() as number)}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const status = getValue() as string;
      return (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[status] ?? "bg-muted text-muted-foreground"}`}
        >
          {status.replace("_", " ")}
        </span>
      );
    },
  },
  {
    accessorKey: "startDate",
    header: "Started",
    cell: ({ getValue }) => (
      <span className="text-sm">{formatDate(getValue() as number)}</span>
    ),
  },
  {
    accessorKey: "currentPeriodEnd",
    header: "Renewal",
    cell: ({ row }) => {
      const date = row.original.currentPeriodEnd;
      const canceling = row.original.cancelAtPeriodEnd;
      return (
        <div>
          <span className="text-sm">{formatDate(date)}</span>
          {canceling && (
            <div className="text-xs text-red-500">Cancels at period end</div>
          )}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <a
        href={`https://dashboard.stripe.com/subscriptions/${row.original.stripeSubscriptionId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-primary hover:underline"
      >
        Stripe
      </a>
    ),
  },
];

export default function SubscribersPage() {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "mrrUsd", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [planFilter, setPlanFilter] = useState<string>("all");

  const data = useQuery(api.mrr.listSubscriptions, {
    status: statusFilter as any,
    plan: planFilter as any,
  });

  const table = useReactTable({
    data: (data ?? []) as Subscription[],
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const search = filterValue.toLowerCase();
      const name = (row.original.loName ?? "").toLowerCase();
      const email = (row.original.email ?? "").toLowerCase();
      const market = (row.original.market ?? "").toLowerCase();
      return name.includes(search) || email.includes(search) || market.includes(search);
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Subscribers</h1>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name, email, or market..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="past_due">Past due</option>
          <option value="canceled">Canceled</option>
        </select>

        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All plans</option>
          <option value="basic">Basic</option>
          <option value="boost">Boost</option>
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Active Subscriptions</span>
            {data && (
              <span className="text-sm font-normal text-muted-foreground">
                {data.length} subscription{data.length !== 1 ? "s" : ""}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No subscriptions found. Connect Stripe to start syncing.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b">
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="cursor-pointer px-3 py-3 text-left font-medium text-muted-foreground hover:text-foreground"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <div className="flex items-center gap-1">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {header.column.getIsSorted() === "asc" && " ↑"}
                            {header.column.getIsSorted() === "desc" && " ↓"}
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-3 py-3">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

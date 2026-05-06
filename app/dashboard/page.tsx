"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const health = useQuery(api.health.ping);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Convex Status</CardTitle>
        </CardHeader>
        <CardContent>
          {health ? (
            <p className="text-sm text-muted-foreground">
              Backend: <span className="font-medium text-green-500">{health.status}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Connecting...</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            COO operational dashboard for TheStorefront. Start building your
            views here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

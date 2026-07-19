import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { Period } from "~/types/api";
import { SalesTab } from "../components/sales-tab";
import { OrdersTab } from "../components/orders-tab";
import { CustomersTab } from "../components/customers-tab";
import { InventoryTab } from "../components/inventory-tab";
import { TrafficTab } from "../components/traffic-tab";
import { AudienceTab } from "../components/audience-tab";
import { BehaviorTab } from "../components/behavior-tab";

const PERIOD_LABELS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

function TabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const [period, setPeriod] = React.useState<Period>("30d");
  const [tab, setTab] = React.useState("sales");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Sales, orders, customers, and inventory — deeper than the dashboard
            overview.
          </p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            {PERIOD_LABELS.map((p) => (
              <TabsTrigger key={p.value} value={p.value} className="text-xs">
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="behavior">Behavior</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <React.Suspense fallback={<TabSkeleton />}>
            <SalesTab period={period} />
          </React.Suspense>
        </TabsContent>
        <TabsContent value="orders">
          <React.Suspense fallback={<TabSkeleton />}>
            <OrdersTab period={period} />
          </React.Suspense>
        </TabsContent>
        <TabsContent value="traffic">
          <React.Suspense fallback={<TabSkeleton />}>
            <TrafficTab period={period} />
          </React.Suspense>
        </TabsContent>
        <TabsContent value="audience">
          <React.Suspense fallback={<TabSkeleton />}>
            <AudienceTab period={period} />
          </React.Suspense>
        </TabsContent>
        <TabsContent value="behavior">
          <React.Suspense fallback={<TabSkeleton />}>
            <BehaviorTab period={period} />
          </React.Suspense>
        </TabsContent>
        <TabsContent value="customers">
          <React.Suspense fallback={<TabSkeleton />}>
            <CustomersTab period={period} />
          </React.Suspense>
        </TabsContent>
        <TabsContent value="inventory">
          <React.Suspense fallback={<TabSkeleton />}>
            <InventoryTab />
          </React.Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

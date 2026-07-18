import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ClockIcon, PackageIcon, AlertTriangleIcon } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { fmtCount } from "../utils";

type OpsTile = {
  label: string;
  value: number;
  icon: React.ElementType;
  to: string;
  /** Draw attention (amber) when value > 0 — e.g. low stock needs action. */
  warn?: boolean;
};

/**
 * Compact operational strip surfacing the snapshot counts the dashboard stats
 * endpoint already returns (`pendingOrders`, `processingOrders`,
 * `lowStockItems`). Each tile deep-links to the page where the operator acts on
 * it. These are point-in-time counts, not period metrics, so they carry no
 * delta.
 */
export function OpsSnapshot({
  pendingOrders,
  processingOrders,
  lowStockItems,
}: {
  pendingOrders: number;
  processingOrders: number;
  lowStockItems: number;
}) {
  const tiles: OpsTile[] = [
    {
      label: "Pending orders",
      value: pendingOrders,
      icon: ClockIcon,
      to: "/admin/orders",
    },
    {
      label: "Processing",
      value: processingOrders,
      icon: PackageIcon,
      to: "/admin/orders",
    },
    {
      label: "Low stock items",
      value: lowStockItems,
      icon: AlertTriangleIcon,
      to: "/admin/inventory",
      warn: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {tiles.map((tile) => {
        const highlight = tile.warn && tile.value > 0;
        return (
          <Link key={tile.label} to={tile.to} className="group">
            <Card className="transition-colors group-hover:border-foreground/20">
              <CardContent className="flex items-center gap-3 p-4">
                <div
                  className={`rounded-md p-2 shrink-0 ${
                    highlight
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <tile.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-xl font-bold tabular-nums leading-none ${
                      highlight ? "text-amber-600 dark:text-amber-400" : ""
                    }`}
                  >
                    {fmtCount(tile.value)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {tile.label}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

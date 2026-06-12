import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronRightIcon, PlusIcon, TagsIcon } from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import type { PriceList, PriceListStatus } from "~/types/api";
import { priceListsQueryOptions } from "../queries";
import { computePriceListStatus, formatAdjustment, formatType } from "../utils";
import { PriceListStatusBadge } from "../components/price-list-status-badge";

type Tab = { value: PriceListStatus; label: string };
const TABS: Tab[] = [
  { value: "active", label: "Active" },
  { value: "scheduled", label: "Scheduled" },
  { value: "expired", label: "Expired" },
];

export function PriceListListPage() {
  const priceLists: PriceList[] = useSuspenseQuery(
    priceListsQueryOptions(),
  ).data;
  const [tab, setTab] = React.useState<PriceListStatus>("active");

  const counts: Record<PriceListStatus, number> = {
    active: priceLists.filter((p) => computePriceListStatus(p) === "active")
      .length,
    scheduled: priceLists.filter(
      (p) => computePriceListStatus(p) === "scheduled",
    ).length,
    expired: priceLists.filter((p) => computePriceListStatus(p) === "expired")
      .length,
  };

  const rows = priceLists.filter((p) => computePriceListStatus(p) === tab);

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Price Lists</h1>
          <p className="text-sm text-muted-foreground">
            Contract pricing for customers and groups.
          </p>
        </div>
        <Button
          className="gap-2 bg-orange-700 px-5 py-2.5 text-white shadow-none hover:bg-orange-800"
          asChild
        >
          <Link to="/admin/price-lists/new">
            <PlusIcon className="h-4 w-4" />
            Create price list
          </Link>
        </Button>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────────── */}
      <div className="flex items-center border-b">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 pb-3 text-sm font-medium transition-colors",
              tab === t.value
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0 text-xs tabular-nums",
                tab === t.value
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {counts[t.value]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────────── */}
      <Card className="overflow-hidden gap-0 py-0">
        <div className="grid grid-cols-[1fr_120px_140px_80px_96px_40px] items-center border-b bg-muted/20 px-5 py-2.5 text-xs font-medium text-muted-foreground">
          <span>Name</span>
          <span>Type</span>
          <span>Effect</span>
          <span className="text-center">Priority</span>
          <span className="text-center">Status</span>
          <span />
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <TagsIcon className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No {tab} price lists.
            </p>
          </div>
        ) : (
          rows.map((p, i) => (
            <div
              key={p.id}
              className={cn(
                "grid grid-cols-[1fr_120px_140px_80px_96px_40px] items-center px-5 py-4 transition-colors hover:bg-muted/20",
                i < rows.length - 1 && "border-b border-border/50",
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium leading-none">{p.name}</p>
              </div>

              <span className="text-sm text-muted-foreground">
                {formatType(p)}
              </span>

              <span className="text-sm font-semibold tabular-nums">
                {p.type === "fixed" ? "Per-variant" : formatAdjustment(p)}
              </span>

              <span className="text-center text-sm tabular-nums text-muted-foreground">
                {p.priority}
              </span>

              <div className="flex justify-center">
                <PriceListStatusBadge status={computePriceListStatus(p)} />
              </div>

              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  asChild
                >
                  <Link
                    to="/admin/price-lists/$priceListId"
                    params={{ priceListId: p.id }}
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

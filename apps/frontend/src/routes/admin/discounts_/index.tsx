import * as React from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { PlusIcon, ChevronRightIcon, TicketIcon } from "lucide-react"

import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import { Card } from "~/components/ui/card"

export const Route = createFileRoute("/admin/discounts_/")({
  component: DiscountsPage,
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type DiscountType   = "percentage" | "fixed_amount"
export type DiscountStatus = "active" | "scheduled" | "expired"
export type DiscountScope  = "order" | "category" | "product"

export type CouponCode = {
  code: string
  maxUses: number | null
  perCustomer: number
  used: number
}

export type Discount = {
  id: string
  name: string
  type: DiscountType
  value: number
  scope: DiscountScope
  scopeLabel: string
  coupons: CouponCode[]
  usedCount: number
  usageLimit: number | null
  status: DiscountStatus
  startDate: string
  endDate: string | null
}

// ─── Fake Data ────────────────────────────────────────────────────────────────

export const DISCOUNTS: Discount[] = [
  // Active
  {
    id: "1",
    name: "Summer Sale",
    type: "percentage",
    value: 20,
    scope: "order",
    scopeLabel: "All orders",
    coupons: [
      { code: "SUMMER20", maxUses: 50,   perCustomer: 1, used: 23 },
      { code: "VIP2026",  maxUses: null, perCustomer: 1, used: 22 },
    ],
    usedCount: 45,
    usageLimit: 100,
    status: "active",
    startDate: "May 1, 2026",
    endDate: "Aug 31, 2026",
  },
  {
    id: "2",
    name: "Rashguard Deal",
    type: "fixed_amount",
    value: 10,
    scope: "category",
    scopeLabel: "Category: Apparel",
    coupons: [
      { code: "WAVE10", maxUses: null, perCustomer: 2, used: 12 },
    ],
    usedCount: 12,
    usageLimit: null,
    status: "active",
    startDate: "Apr 1, 2026",
    endDate: null,
  },
  {
    id: "3",
    name: "New Customer",
    type: "fixed_amount",
    value: 5,
    scope: "order",
    scopeLabel: "All orders",
    coupons: [
      { code: "WELCOME5", maxUses: 50, perCustomer: 1, used: 28 },
    ],
    usedCount: 28,
    usageLimit: 50,
    status: "active",
    startDate: "Jan 1, 2026",
    endDate: "Dec 31, 2026",
  },
  {
    id: "4",
    name: "Staff Discount",
    type: "percentage",
    value: 30,
    scope: "order",
    scopeLabel: "All orders",
    coupons: [
      { code: "STAFF30A", maxUses: null, perCustomer: 10, used: 3 },
      { code: "STAFF30B", maxUses: null, perCustomer: 10, used: 2 },
      { code: "STAFF30C", maxUses: null, perCustomer: 10, used: 3 },
    ],
    usedCount: 8,
    usageLimit: null,
    status: "active",
    startDate: "Jan 1, 2026",
    endDate: null,
  },
  // Scheduled
  {
    id: "5",
    name: "Board Week",
    type: "percentage",
    value: 15,
    scope: "category",
    scopeLabel: "Category: Surfboards",
    coupons: [
      { code: "BOARD15",  maxUses: 100, perCustomer: 1, used: 0 },
      { code: "BWEEK15",  maxUses: 100, perCustomer: 1, used: 0 },
    ],
    usedCount: 0,
    usageLimit: 200,
    status: "scheduled",
    startDate: "Jun 1, 2026",
    endDate: "Jun 7, 2026",
  },
  // Expired
  {
    id: "6",
    name: "Black Friday 2025",
    type: "percentage",
    value: 25,
    scope: "order",
    scopeLabel: "All orders",
    coupons: [
      { code: "BF25",     maxUses: 100, perCustomer: 1, used: 100 },
      { code: "CYBER25",  maxUses: 100, perCustomer: 1, used: 100 },
      { code: "BF2025A",  maxUses: 100, perCustomer: 2, used: 100 },
      { code: "BF2025B",  maxUses: 100, perCustomer: 2, used: 12  },
      { code: "VIP-BF25", maxUses: null, perCustomer: 1, used: 0  },
    ],
    usedCount: 312,
    usageLimit: 500,
    status: "expired",
    startDate: "Nov 28, 2025",
    endDate: "Dec 1, 2025",
  },
  {
    id: "7",
    name: "Holiday Clearance",
    type: "fixed_amount",
    value: 15,
    scope: "order",
    scopeLabel: "All orders",
    coupons: [
      { code: "HOLS15",   maxUses: 50,  perCustomer: 1, used: 50 },
      { code: "CLEAR15",  maxUses: 50,  perCustomer: 1, used: 39 },
    ],
    usedCount: 89,
    usageLimit: 100,
    status: "expired",
    startDate: "Dec 15, 2025",
    endDate: "Dec 31, 2025",
  },
  {
    id: "8",
    name: "New Year Flash",
    type: "percentage",
    value: 10,
    scope: "order",
    scopeLabel: "All orders",
    coupons: [
      { code: "NY2026", maxUses: 100, perCustomer: 1, used: 67 },
    ],
    usedCount: 67,
    usageLimit: 100,
    status: "expired",
    startDate: "Jan 1, 2026",
    endDate: "Jan 5, 2026",
  },
]

// ─── Status Badge ─────────────────────────────────────────────────────────────

export const DISCOUNT_STATUS_STYLES: Record<DiscountStatus, string> = {
  active:    "text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400",
  scheduled: "text-violet-700 border-violet-200 bg-violet-50 dark:bg-violet-950/20 dark:border-violet-900/50 dark:text-violet-400",
  expired:   "text-muted-foreground border-border bg-muted/40",
}

export function DiscountStatusBadge({ status }: { status: DiscountStatus }) {
  return (
    <Badge
      variant="outline"
      className={`px-2 py-0 text-[11px] font-medium capitalize ${DISCOUNT_STATUS_STYLES[status]}`}
    >
      {status}
    </Badge>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = { value: DiscountStatus; label: string }
const TABS: Tab[] = [
  { value: "active",    label: "Active"    },
  { value: "scheduled", label: "Scheduled" },
  { value: "expired",   label: "Expired"   },
]

function formatValue(d: Discount) {
  return d.type === "percentage" ? `${d.value}%` : `$${(d.value / 100).toFixed(2)}`
}

function formatUsage(d: Discount) {
  const limit = d.usageLimit === null ? "∞" : d.usageLimit.toLocaleString()
  return `${d.usedCount.toLocaleString()} / ${limit}`
}

function DiscountsPage() {
  const [tab, setTab] = React.useState<DiscountStatus>("active")

  const counts: Record<DiscountStatus, number> = {
    active:    DISCOUNTS.filter((d) => d.status === "active").length,
    scheduled: DISCOUNTS.filter((d) => d.status === "scheduled").length,
    expired:   DISCOUNTS.filter((d) => d.status === "expired").length,
  }

  const rows = DISCOUNTS.filter((d) => d.status === tab)

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Discounts & Coupons</h1>
          <p className="text-sm text-muted-foreground">
            Manage promotions and coupon codes.
          </p>
        </div>
        <Button
          className="gap-2 bg-orange-700 px-5 py-2.5 text-white shadow-none hover:bg-orange-800"
          asChild
        >
          <Link to="/admin/discounts/new">
            <PlusIcon className="h-4 w-4" />
            Create discount
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

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_80px_80px_160px_100px_96px_40px] items-center border-b bg-muted/20 px-5 py-2.5 text-xs font-medium text-muted-foreground">
          <span>Name</span>
          <span>Type</span>
          <span>Value</span>
          <span>Applies to</span>
          <span className="text-right">Usage</span>
          <span className="text-center">Status</span>
          <span />
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <TicketIcon className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No {tab} discounts.
            </p>
          </div>
        ) : (
          rows.map((d, i) => (
            <div
              key={d.id}
              className={cn(
                "grid grid-cols-[1fr_80px_80px_160px_100px_96px_40px] items-center px-5 py-4 transition-colors hover:bg-muted/20",
                i < rows.length - 1 && "border-b border-border/50",
              )}
            >
              {/* Name + coupon count */}
              <div className="min-w-0">
                <p className="text-sm font-medium leading-none">{d.name}</p>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <TicketIcon className="h-3 w-3" />
                  {d.coupons.length === 1 ? "1 coupon" : `${d.coupons.length} coupons`}
                </div>
              </div>

              {/* Type */}
              <span className="text-sm text-muted-foreground">
                {d.type === "percentage" ? "%" : "Fixed"}
              </span>


              {/* Value */}
              <span className="text-sm font-semibold tabular-nums">
                {formatValue(d)}
              </span>

              {/* Scope */}
              <span className="text-sm text-muted-foreground truncate pr-4">
                {d.scopeLabel}
              </span>

              {/* Usage */}
              <span className="text-right text-sm tabular-nums text-muted-foreground">
                {formatUsage(d)}
              </span>

              {/* Status */}
              <div className="flex justify-center">
                <DiscountStatusBadge status={d.status} />
              </div>

              {/* Action */}
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  asChild
                >
                  <Link
                    to="/admin/discounts/$discountId"
                    params={{ discountId: d.id }}
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
  )
}

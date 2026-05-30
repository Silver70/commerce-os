import * as React from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { EyeIcon, PlusIcon } from "lucide-react"

import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Separator } from "~/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet"
import {
  DataTable,
  type DataTableColumn,
  type DataTableFilter,
} from "~/components/data-table"
import { customersQueryOptions } from "~/queries/customers"
import { formatMoney } from "~/lib/money"
import type { Customer, CustomerStatus } from "~/types/api"

export type { CustomerStatus }

export function fullName(c: Pick<Customer, "firstName" | "lastName">) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "—"
}

export const Route = createFileRoute("/admin/customers_/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(customersQueryOptions()),
  component: CustomersPage,
})

// ─── Avatar ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
  "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400",
]

export function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function CustomerAvatar({
  name,
  size = "sm",
}: {
  name: string
  size?: "sm" | "md" | "lg"
}) {
  const sizeClass =
    size === "sm" ? "h-8 w-8 text-xs" :
    size === "md" ? "h-10 w-10 text-sm" :
                    "h-12 w-12 text-base"
  return (
    <div
      className={`${sizeClass} flex shrink-0 select-none items-center justify-center rounded-full font-semibold ${avatarColor(name)}`}
    >
      {initials(name)}
    </div>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

export const CUSTOMER_STATUS_STYLES: Record<CustomerStatus, string> = {
  active:   "text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400",
  disabled: "text-muted-foreground border-border bg-muted/40",
}

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  return (
    <Badge
      variant="outline"
      className={`px-2 py-0 text-[11px] font-medium capitalize ${CUSTOMER_STATUS_STYLES[status]}`}
    >
      {status}
    </Badge>
  )
}

// ─── Columns ──────────────────────────────────────────────────────────────────

const COLUMNS: DataTableColumn<Customer>[] = [
  {
    key: "customer",
    header: "Customer",
    render: (row) => {
      const name = fullName(row)
      return (
        <div className="flex items-center gap-3">
          <CustomerAvatar name={name} />
          <div className="min-w-0">
            <p className="text-sm font-medium leading-none">{name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      )
    },
  },
  {
    key: "status",
    header: "Status",
    className: "w-28",
    render: (row) => <CustomerStatusBadge status={row.status} />,
  },
  {
    key: "orders",
    header: "Orders",
    align: "center",
    className: "w-24",
    render: (row) => (
      <span className="text-sm tabular-nums text-muted-foreground">
        {row.ordersCount != null ? (row.ordersCount === 0 ? "—" : row.ordersCount) : "—"}
      </span>
    ),
  },
  {
    key: "total",
    header: "Total spent",
    align: "right",
    className: "w-32",
    render: (row) => (
      <span className="text-sm font-semibold tabular-nums">
        {row.totalSpent != null ? (row.totalSpent === 0 ? "—" : formatMoney(row.totalSpent)) : "—"}
      </span>
    ),
  },
  {
    key: "since",
    header: "Customer since",
    className: "w-36",
    render: (row) => (
      <span className="text-sm text-muted-foreground">
        {new Date(row.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </span>
    ),
  },
  {
    key: "view",
    header: "",
    align: "center",
    className: "w-14 pl-6",
    render: (row) => (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        asChild
      >
        <Link to="/admin/customers/$customerId" params={{ customerId: row.id }}>
          <EyeIcon className="h-4 w-4" />
        </Link>
      </Button>
    ),
  },
]

// ─── Filters ──────────────────────────────────────────────────────────────────

const FILTERS: DataTableFilter[] = [
  {
    key: "status",
    placeholder: "All statuses",
    options: [
      { label: "Active",   value: "active"   },
      { label: "Disabled", value: "disabled" },
    ],
  },
]

// ─── Create Customer Sheet (UI-only; backend endpoint TBD) ───────────────────

function CreateCustomerSheet() {
  const [open, setOpen]           = React.useState(false)
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName]   = React.useState("")
  const [email, setEmail]         = React.useState("")
  const [phone, setPhone]         = React.useState("")
  const [marketing, setMarketing] = React.useState(false)

  const canSubmit =
    firstName.trim().length > 0 && lastName.trim().length > 0 && email.trim().length > 0

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setFirstName(""); setLastName(""); setEmail("")
      setPhone(""); setMarketing(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button className="gap-2 bg-orange-700 px-5 py-2.5 text-white shadow-none hover:bg-orange-800">
          <PlusIcon className="h-4 w-4" />
          Add customer
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Add customer</SheetTitle>
          <SheetDescription>
            Create a new customer account.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cs-first-name">
                  First name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cs-first-name"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cs-last-name">
                  Last name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cs-last-name"
                  placeholder="Smith"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cs-email">
                Email address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cs-email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cs-phone">
                Phone{" "}
                <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="cs-phone"
                type="tel"
                placeholder="+1 555-0100"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          <label className="flex cursor-pointer items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Marketing emails</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Customer will be opted {marketing ? "in" : "out"} of promotional emails.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMarketing((v) => !v)}
              className={cn(
                "relative mt-0.5 h-5 w-9 shrink-0 rounded-full border-2 transition-colors",
                marketing
                  ? "border-amber-500 bg-amber-500"
                  : "border-border bg-transparent",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-3 w-3 rounded-full transition-transform duration-200",
                  marketing
                    ? "left-0.5 translate-x-4 bg-white"
                    : "left-0.5 translate-x-0 bg-muted-foreground/40",
                )}
              />
            </button>
          </label>
        </div>

        <SheetFooter className="border-t">
          <SheetClose asChild>
            <Button variant="outline" className="flex-1 py-3">Cancel</Button>
          </SheetClose>
          <Button
            disabled={!canSubmit}
            className="flex-1 bg-orange-700 py-3 text-white shadow-none hover:bg-orange-800 disabled:opacity-50"
          >
            Create customer
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function CustomersPage() {
  const { data: customers } = useSuspenseQuery(customersQueryOptions())

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-sm text-muted-foreground">
            View and manage customer accounts.
            <span className="ml-1">({customers.length} total)</span>
          </p>
        </div>
        <CreateCustomerSheet />
      </div>

      <DataTable
        data={customers}
        columns={COLUMNS}
        rowKey={(row) => row.id}
        filters={FILTERS}
        pageSize={25}
        emptyMessage="No customers match your filters."
      />
    </div>
  )
}

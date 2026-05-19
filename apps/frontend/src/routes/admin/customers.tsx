import * as React from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
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

export const Route = createFileRoute("/admin/customers")({
  component: CustomersPage,
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type CustomerStatus = "active" | "suspended" | "banned"

export type Customer = {
  id: string
  name: string
  email: string
  phone: string
  orders: number
  total: number
  status: CustomerStatus
  since: string
}

// ─── Fake Data ────────────────────────────────────────────────────────────────

export const CUSTOMERS: Customer[] = [
  { id: "1",  name: "John Smith",     email: "john@email.com",       phone: "+960 773-1234",   orders: 8, total: 1247.00, status: "active",    since: "Jan 15, 2026" },
  { id: "2",  name: "Sara Johnson",   email: "sara@email.com",       phone: "+1 555-0100",     orders: 3, total: 268.00,  status: "active",    since: "Feb 3, 2026"  },
  { id: "3",  name: "Ali Hassan",     email: "ali@surf.com",         phone: "+960 773-9876",   orders: 5, total: 892.50,  status: "active",    since: "Mar 12, 2026" },
  { id: "4",  name: "Layla Ahmed",    email: "layla@ocean.com",      phone: "+960 791-2345",   orders: 1, total: 118.00,  status: "active",    since: "Apr 1, 2026"  },
  { id: "5",  name: "Mike Torres",    email: "mike@example.com",     phone: "+1 555-0199",     orders: 0, total: 0,       status: "suspended", since: "Jan 28, 2026" },
  { id: "6",  name: "Nina Park",      email: "nina@waves.com",       phone: "+82 10-1234",     orders: 2, total: 310.50,  status: "active",    since: "Feb 20, 2026" },
  { id: "7",  name: "Omar Rashid",    email: "omar@beach.com",       phone: "+971 50-1234",    orders: 4, total: 621.00,  status: "active",    since: "Jan 5, 2026"  },
  { id: "8",  name: "Petra Müller",   email: "petra@surf.com",       phone: "+49 171-5678",    orders: 1, total: 149.99,  status: "active",    since: "Mar 25, 2026" },
  { id: "9",  name: "Quinn Blake",    email: "quin@example.com",     phone: "+44 7700-9000",   orders: 3, total: 197.00,  status: "active",    since: "Feb 14, 2026" },
  { id: "10", name: "Rosa Carvalho",  email: "rosa@ocean.com",       phone: "+55 11-9999",     orders: 2, total: 99.00,   status: "active",    since: "Apr 8, 2026"  },
  { id: "11", name: "Sam Fisher",     email: "sam@waves.com",        phone: "+1 555-0177",     orders: 1, total: 79.00,   status: "active",    since: "May 1, 2026"  },
  { id: "12", name: "Tina Fernandez", email: "tina@board.com",       phone: "+52 55-5678",     orders: 2, total: 258.00,  status: "active",    since: "Mar 3, 2026"  },
  { id: "13", name: "Uma Patel",      email: "uma@surf.com",         phone: "+91 98765-4321",  orders: 1, total: 54.00,   status: "active",    since: "Apr 19, 2026" },
  { id: "14", name: "Val Laurent",    email: "val@ocean.com",        phone: "+33 6-1234-5678", orders: 3, total: 347.50,  status: "active",    since: "Feb 7, 2026"  },
  { id: "15", name: "Wade Chen",      email: "wade@beach.com",       phone: "+86 138-0000",    orders: 1, total: 38.50,   status: "banned",    since: "Mar 15, 2026" },
]

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
  active:    "text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400",
  suspended: "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400",
  banned:    "text-destructive border-destructive/20 bg-destructive/10",
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
    render: (row) => (
      <div className="flex items-center gap-3">
        <CustomerAvatar name={row.name} />
        <div className="min-w-0">
          <p className="text-sm font-medium leading-none">{row.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{row.email}</p>
        </div>
      </div>
    ),
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
        {row.orders === 0 ? "—" : row.orders}
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
        {row.total === 0 ? "—" : `$${row.total.toFixed(2)}`}
      </span>
    ),
  },
  {
    key: "since",
    header: "Customer since",
    className: "w-36",
    render: (row) => (
      <span className="text-sm text-muted-foreground">{row.since}</span>
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
      { label: "Active",    value: "active"    },
      { label: "Suspended", value: "suspended" },
      { label: "Banned",    value: "banned"    },
    ],
  },
]

// ─── Create Customer Sheet ────────────────────────────────────────────────────

function CreateCustomerSheet() {
  const [open, setOpen]           = React.useState(false)
  const [name, setName]           = React.useState("")
  const [email, setEmail]         = React.useState("")
  const [phone, setPhone]         = React.useState("")
  const [status, setStatus]       = React.useState<CustomerStatus>("active")
  const [marketing, setMarketing] = React.useState(false)

  const canSubmit = name.trim().length > 0 && email.trim().length > 0

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setName("")
      setEmail("")
      setPhone("")
      setStatus("active")
      setMarketing(false)
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
            Create a new customer account. They will not receive a login email
            until you invite them separately.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">

          {/* Name + Email */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cs-name">
                Full name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cs-name"
                placeholder="e.g. John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
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
                <span className="text-xs font-normal text-muted-foreground">
                  (optional)
                </span>
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

          {/* Account status */}
          <div className="space-y-1.5">
            <Label htmlFor="cs-status">Account status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as CustomerStatus)}
            >
              <SelectTrigger id="cs-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Active customers can log in and place orders.
            </p>
          </div>

          <Separator />

          {/* Marketing toggle */}
          <label className="flex cursor-pointer items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Marketing emails</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Customer will be opted {marketing ? "in" : "out"} of
                promotional emails.
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
            <Button variant="outline" className="flex-1 py-3 ">
              Cancel
            </Button>
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
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-sm text-muted-foreground">
            View and manage customer accounts.
          </p>
        </div>
        <CreateCustomerSheet />
      </div>

      <DataTable
        data={CUSTOMERS}
        columns={COLUMNS}
        rowKey={(row) => row.id}
        filters={FILTERS}
        pageSize={10}
        emptyMessage="No customers match your filters."
      />
    </div>
  )
}

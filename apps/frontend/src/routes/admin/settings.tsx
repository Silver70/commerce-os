import * as React from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  KeyIcon,
  MoreHorizontalIcon,
  PlusIcon,
  RefreshCwIcon,
  ShieldIcon,
  UserIcon,
} from "lucide-react"

import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Separator } from "~/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet"

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
})

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "super_admin" | "product_manager" | "support_agent"
type TeamMember = { id: string; name: string; email: string; role: Role; isYou?: boolean }
type Invitation = { id: string; email: string; role: Role; sentDate: string }
type ApiKey = { id: string; name: string; prefix: string; lastUsed: string | null }
type TaxRate = { id: string; name: string; rate: number; country: string; state: string; isInclusive: boolean; active: boolean }

type AuditEntry = {
  id: string
  time: string
  actorType: "admin" | "system" | "webhook" | "customer"
  actorId: string | null
  actorName: string        // resolved display name, included by backend
  entity: string
  action: string
  detail: string
  json: string
  ip: string
  ua: string
}

// ─── Fake Data ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<Role, string> = {
  super_admin:      "Super Admin",
  product_manager:  "Product Manager",
  support_agent:    "Support Agent",
}

const INITIAL_MEMBERS: TeamMember[] = [
  { id: "u1", name: "Silver",     email: "jsameeu@gmail.com", role: "super_admin",     isYou: true },
  { id: "u2", name: "Jane Park",  email: "jane@surf.com",     role: "product_manager" },
  { id: "u3", name: "Ali Hassan", email: "ali@surf.com",      role: "support_agent"   },
]

const INITIAL_INVITATIONS: Invitation[] = [
  { id: "i1", email: "mark@email.com", role: "product_manager", sentDate: "May 10, 2026" },
]

const INITIAL_API_KEYS: ApiKey[] = [
  { id: "k1", name: "Next.js Store", prefix: "sk_live_a8f3", lastUsed: "2 min ago" },
  { id: "k2", name: "Mobile App",    prefix: "sk_live_b2e1", lastUsed: null          },
]

const INITIAL_TAX_RATES: TaxRate[] = [
  { id: "t1", name: "GST",          rate: 600,  country: "MV", state: "",   isInclusive: false, active: true  },
  { id: "t2", name: "US Sales Tax", rate: 725,  country: "US", state: "CA", isInclusive: false, active: true  },
  { id: "t3", name: "UK VAT",       rate: 2000, country: "GB", state: "",   isInclusive: true,  active: true  },
  { id: "t4", name: "AU GST",       rate: 1000, country: "AU", state: "",   isInclusive: true,  active: false },
]

const AUDIT_LOG: AuditEntry[] = [
  {
    id: "a1",  time: "May 22, 2:34 PM",  actorType: "admin",  actorId: "user_01JANEPARK",   actorName: "Jane Park",  entity: "Products",
    action: 'Updated product "Wave Board Pro"', detail: "price: $139.99 → $149.99",
    json: '{\n  "price": {\n    "old": 13999,\n    "new": 14999\n  }\n}',
    ip: "203.0.113.42", ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  },
  {
    id: "a2",  time: "May 22, 1:30 PM",  actorType: "admin",  actorId: "user_01SILVER",      actorName: "Silver",     entity: "Orders",
    action: "Issued refund $49.99", detail: "Order ORD-20260519-0025",
    json: '{\n  "amount": 4999,\n  "reason": "defective_product",\n  "restock": true\n}',
    ip: "203.0.113.10", ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
  {
    id: "a3",  time: "May 22, 11:00 AM", actorType: "system", actorId: null,                 actorName: "System",     entity: "Inventory",
    action: "Stock adjusted RASH-M-BLUE", detail: "Quantity: 10 → 3 (Reason: Damage)",
    json: '{\n  "sku": "RASH-M-BLUE",\n  "quantity": { "old": 10, "new": 3 },\n  "reason": "damage"\n}',
    ip: "—", ua: "Commerce OS / background-job",
  },
  {
    id: "a4",  time: "May 21, 4:15 PM",  actorType: "admin",  actorId: "user_01SILVER",      actorName: "Silver",     entity: "Discounts",
    action: 'Created discount "Staff Discount"', detail: "30% off all orders",
    json: '{\n  "name": "Staff Discount",\n  "type": "percentage",\n  "value": 30\n}',
    ip: "203.0.113.10", ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
  {
    id: "a5",  time: "May 21, 2:00 PM",  actorType: "admin",  actorId: "user_01JANEPARK",   actorName: "Jane Park",  entity: "Products",
    action: 'Updated product "Longboard Classic"', detail: "Added product image",
    json: '{\n  "media": {\n    "added": ["img_29a3f.jpg"]\n  }\n}',
    ip: "203.0.113.42", ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  },
  {
    id: "a6",  time: "May 20, 5:30 PM",  actorType: "admin",  actorId: "user_01ALIHASSAN",  actorName: "Ali Hassan", entity: "Customers",
    action: "Updated customer John Smith", detail: "status: active → suspended",
    json: '{\n  "status": {\n    "old": "active",\n    "new": "suspended"\n  }\n}',
    ip: "203.0.113.88", ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15",
  },
  {
    id: "a7",  time: "May 20, 3:45 PM",  actorType: "admin",  actorId: "user_01SILVER",      actorName: "Silver",     entity: "Settings",
    action: "Updated store settings", detail: 'Store name: "Surf Co" → "Acme Surf Shop"',
    json: '{\n  "store_name": {\n    "old": "Surf Co",\n    "new": "Acme Surf Shop"\n  }\n}',
    ip: "203.0.113.10", ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
  {
    id: "a8",  time: "May 19, 2:34 PM",  actorType: "webhook", actorId: null,                actorName: "System",     entity: "Orders",
    action: "Order status updated", detail: "ORD-20260519-0025: pending → paid",
    json: '{\n  "status": {\n    "old": "pending",\n    "new": "paid"\n  },\n  "payment_intent": "pi_3R8a9bKZ"\n}',
    ip: "—", ua: "Commerce OS / stripe-webhook",
  },
  {
    id: "a9",  time: "May 19, 11:20 AM", actorType: "admin",  actorId: "user_01JANEPARK",   actorName: "Jane Park",  entity: "Products",
    action: 'Created product "Blue Rashguard"', detail: "SKU: RASH-M-BLUE, Price: $49.99",
    json: '{\n  "name": "Blue Rashguard",\n  "sku": "RASH-M-BLUE",\n  "price": 4999\n}',
    ip: "203.0.113.42", ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  },
  {
    id: "a10", time: "May 18, 4:00 PM",  actorType: "admin",  actorId: "user_01SILVER",      actorName: "Silver",     entity: "Discounts",
    action: 'Updated discount "Summer Sale"', detail: "Usage limit: 80 → 100",
    json: '{\n  "usage_limit": {\n    "old": 80,\n    "new": 100\n  }\n}',
    ip: "203.0.113.10", ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
  {
    id: "a11", time: "May 17, 9:15 AM",  actorType: "system", actorId: null,                 actorName: "System",     entity: "Inventory",
    action: "Stock adjusted FIN-SET-PRO", detail: "Quantity: 5 → 15 (Reason: Restock)",
    json: '{\n  "sku": "FIN-SET-PRO",\n  "quantity": { "old": 5, "new": 15 },\n  "reason": "restock"\n}',
    ip: "—", ua: "Commerce OS / background-job",
  },
  {
    id: "a12", time: "May 16, 3:30 PM",  actorType: "admin",  actorId: "user_01ALIHASSAN",  actorName: "Ali Hassan", entity: "Orders",
    action: "Viewed order ORD-20260515-0010", detail: "Support access",
    json: '{\n  "action": "view",\n  "order_id": "ORD-20260515-0010"\n}',
    ip: "203.0.113.88", ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15",
  },
]

const AUDIT_ENTITIES = ["Products", "Orders", "Customers", "Inventory", "Discounts", "Settings"]
const AUDIT_ACTORS   = ["Silver", "Jane Park", "Ali Hassan", "System"]

const CURRENCIES = [
  "USD - US Dollar", "EUR - Euro", "GBP - British Pound",
  "AUD - Australian Dollar", "SGD - Singapore Dollar",
  "AED - UAE Dirham", "JPY - Japanese Yen",
  "INR - Indian Rupee", "MVR - Maldivian Rufiyaa",
]

const TIMEZONES = [
  "UTC-8 – US Pacific", "UTC-5 – US Eastern", "UTC+0 – UTC / London",
  "UTC+1 – Central European", "UTC+3 – East Africa / Arabian",
  "UTC+5 – Maldives (Indian/Maldives)", "UTC+5:30 – India",
  "UTC+8 – Singapore / Malaysia / China", "UTC+9 – Japan / Korea",
  "UTC+10 – Eastern Australia", "UTC+12 – New Zealand",
]

const TAX_COUNTRIES = [
  { code: "MV", name: "Maldives" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "SG", name: "Singapore" },
  { code: "IN", name: "India" },
]

const US_STATES = ["CA", "NY", "TX", "FL", "WA", "IL", "PA", "OH", "GA", "NC"]

let nextId = 200

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateKey() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  const suffix = Array.from({ length: 32 }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join("")
  return `sk_live_${suffix}`
}

function RoleBadge({ role }: { role: Role }) {
  const styles: Record<Role, string> = {
    super_admin:     "border-violet-200 bg-violet-50 text-violet-700 dark:bg-violet-950/20 dark:border-violet-900/50 dark:text-violet-400",
    product_manager: "border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900/50 dark:text-blue-400",
    support_agent:   "border-border bg-muted/40 text-muted-foreground",
  }
  return (
    <Badge variant="outline" className={`px-2 py-0 text-[11px] font-medium ${styles[role]}`}>
      {ROLE_LABELS[role]}
    </Badge>
  )
}

// ─── General Settings ─────────────────────────────────────────────────────────

function GeneralSettings() {
  const [storeName, setStoreName] = React.useState("Acme Surf Shop")
  const [currency, setCurrency]   = React.useState("USD - US Dollar")
  const [timezone, setTimezone]   = React.useState("UTC+5 – Maldives (Indian/Maldives)")
  const [saved, setSaved]         = React.useState(false)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">General</h2>
        <Button
          onClick={handleSave}
          className="gap-2 bg-orange-700 px-5 text-white shadow-none hover:bg-orange-800"
        >
          {saved ? <CheckIcon className="h-4 w-4" /> : null}
          {saved ? "Saved" : "Save"}
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Store Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">

          <div className="space-y-1.5">
            <Label htmlFor="g-name">
              Store name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="g-name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="g-slug">Store URL</Label>
            <div className="flex items-center gap-0 max-w-sm">
              <Input
                id="g-slug"
                value="acme-surf"
                readOnly
                className="rounded-r-none bg-muted/30 text-muted-foreground"
              />
              <span className="flex h-9 items-center rounded-r-md border border-l-0 bg-muted/30 px-3 text-sm text-muted-foreground whitespace-nowrap">
                .mycommerce.com
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Read-only during MVP.</p>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label htmlFor="g-currency">
              Default currency <span className="text-destructive">*</span>
            </Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="g-currency" className="max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="g-tz">
              Timezone <span className="text-destructive">*</span>
            </Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="g-tz" className="max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}

// ─── Team Settings ────────────────────────────────────────────────────────────

function InviteSheet({
  open,
  onOpenChange,
  onInvite,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onInvite: (email: string, role: Role) => void
}) {
  const [email, setEmail] = React.useState("")
  const [role, setRole]   = React.useState<Role>("product_manager")

  React.useEffect(() => {
    if (open) { setEmail(""); setRole("product_manager") }
  }, [open])

  const canInvite = email.trim().includes("@")

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Invite team member</SheetTitle>
          <SheetDescription>
            They'll receive an email invite via WorkOS and can log in immediately after accepting.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 px-4 py-5 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="inv-email">
              Email address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="inv-email"
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger id="inv-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="product_manager">Product Manager</SelectItem>
                <SelectItem value="support_agent">Support Agent</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {role === "super_admin"     && "Full access to all settings and data."}
              {role === "product_manager" && "Can manage products, inventory, and discounts."}
              {role === "support_agent"   && "Can view orders and customers. Read-only."}
            </p>
          </div>
        </div>
        <SheetFooter className="border-t">
          <SheetClose asChild>
            <Button variant="outline" className="flex-1">Cancel</Button>
          </SheetClose>
          <Button
            disabled={!canInvite}
            className="flex-1 bg-orange-700 text-white shadow-none hover:bg-orange-800 disabled:opacity-50"
            onClick={() => { onInvite(email.trim(), role); onOpenChange(false) }}
          >
            Send invitation
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function TeamSettings() {
  const [members, setMembers]         = React.useState<TeamMember[]>(INITIAL_MEMBERS)
  const [invitations, setInvitations] = React.useState<Invitation[]>(INITIAL_INVITATIONS)
  const [inviteOpen, setInviteOpen]   = React.useState(false)

  function handleInvite(email: string, role: Role) {
    setInvitations((prev) => [
      ...prev,
      { id: `i${nextId++}`, email, role, sentDate: "May 22, 2026" },
    ])
  }

  function removeMember(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  function changeRole(id: string, role: Role) {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)))
  }

  function revokeInvitation(id: string) {
    setInvitations((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Team</h2>
        <Button
          className="gap-2 bg-orange-700 px-5 text-white shadow-none hover:bg-orange-800"
          onClick={() => setInviteOpen(true)}
        >
          <PlusIcon className="h-4 w-4" />
          Invite member
        </Button>
      </div>

      {/* Members table */}
      <Card className="overflow-hidden gap-0 py-0">
        <div className="grid grid-cols-[1fr_180px_160px_40px] items-center border-b bg-muted/20 px-5 py-2.5 text-xs font-medium text-muted-foreground">
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span />
        </div>
        {members.map((m, i) => (
          <div
            key={m.id}
            className={cn(
              "grid grid-cols-[1fr_180px_160px_40px] items-center px-5 py-3.5",
              i < members.length - 1 && "border-b border-border/50",
            )}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {m.name[0]}
              </div>
              <span className="text-sm font-medium">
                {m.name}
                {m.isYou && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>
                )}
              </span>
            </div>
            <span className="text-sm text-muted-foreground truncate pr-4">{m.email}</span>
            <RoleBadge role={m.role} />
            <div className="flex justify-end">
              {!m.isYou && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                      <MoreHorizontalIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      onClick={() => changeRole(m.id, m.role === "product_manager" ? "support_agent" : "product_manager")}
                    >
                      Change role
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => removeMember(m.id)}
                    >
                      Remove from team
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        ))}
      </Card>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Pending invitations</p>
          <Card className="overflow-hidden gap-0 py-0">
            {invitations.map((inv, i) => (
              <div
                key={inv.id}
                className={cn(
                  "flex items-center gap-4 px-5 py-3.5",
                  i < invitations.length - 1 && "border-b border-border/50",
                )}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/40 text-muted-foreground">
                  <UserIcon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[inv.role]} · Sent {inv.sentDate}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs gap-1">
                    <RefreshCwIcon className="h-3 w-3" />
                    Resend
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 text-xs text-destructive hover:text-destructive"
                    onClick={() => revokeInvitation(inv.id)}
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      <InviteSheet open={inviteOpen} onOpenChange={setInviteOpen} onInvite={handleInvite} />
    </div>
  )
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

function GenerateKeySheet({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: (name: string, key: string) => void
}) {
  const [step, setStep]     = React.useState<1 | 2>(1)
  const [name, setName]     = React.useState("")
  const [genKey, setGenKey] = React.useState("")
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (open) { setStep(1); setName(""); setGenKey(""); setCopied(false) }
  }, [open])

  function handleGenerate() {
    const key = generateKey()
    setGenKey(key)
    setStep(2)
  }

  function handleCopy() {
    navigator.clipboard.writeText(genKey).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDone() {
    onSave(name.trim(), genKey)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{step === 1 ? "Generate API key" : "Copy your new key"}</SheetTitle>
          <SheetDescription>
            {step === 1
              ? "API keys grant full access to your store. Only share with trusted applications."
              : "This key will not be shown again. Copy it now and store it safely."}
          </SheetDescription>
        </SheetHeader>

        {step === 1 ? (
          <>
            <div className="flex-1 px-4 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="key-name">
                  Key name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="key-name"
                  placeholder="e.g. Next.js Store"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Used to identify this key in the table.
                </p>
              </div>
            </div>
            <SheetFooter className="border-t">
              <SheetClose asChild>
                <Button variant="outline" className="flex-1">Cancel</Button>
              </SheetClose>
              <Button
                disabled={!name.trim()}
                className="flex-1 bg-orange-700 text-white shadow-none hover:bg-orange-800 disabled:opacity-50"
                onClick={handleGenerate}
              >
                Generate key
              </Button>
            </SheetFooter>
          </>
        ) : (
          <>
            <div className="flex-1 px-4 py-5 space-y-5">
              {/* Warning */}
              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  This key is shown <strong>only once</strong>. Copy it now — you will not be able to retrieve it later.
                </p>
              </div>

              {/* Key display */}
              <div className="space-y-1.5">
                <Label>Your new API key</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs break-all">
                    {genKey}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <CopyIcon className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <SheetFooter className="border-t">
              <Button
                className="w-full bg-orange-700 text-white shadow-none hover:bg-orange-800"
                onClick={handleDone}
              >
                I've saved my key — done
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function ApiKeysSettings() {
  const [keys, setKeys]         = React.useState<ApiKey[]>(INITIAL_API_KEYS)
  const [genOpen, setGenOpen]   = React.useState(false)

  function handleSave(name: string, key: string) {
    setKeys((prev) => [
      ...prev,
      { id: `k${nextId++}`, name, prefix: key.slice(0, 12) + "…", lastUsed: null },
    ])
  }

  function revokeKey(id: string) {
    setKeys((prev) => prev.filter((k) => k.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">API Keys</h2>
        <Button
          className="gap-2 bg-orange-700 px-5 text-white shadow-none hover:bg-orange-800"
          onClick={() => setGenOpen(true)}
        >
          <PlusIcon className="h-4 w-4" />
          Generate key
        </Button>
      </div>

      <Card className="overflow-hidden gap-0 py-0">
        <div className="grid grid-cols-[1fr_160px_120px_40px] items-center border-b bg-muted/20 px-5 py-2.5 text-xs font-medium text-muted-foreground">
          <span>Name</span>
          <span>Key</span>
          <span>Last used</span>
          <span />
        </div>
        {keys.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <KeyIcon className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No API keys. Generate one to connect your storefront.</p>
          </div>
        ) : (
          keys.map((k, i) => (
            <div
              key={k.id}
              className={cn(
                "grid grid-cols-[1fr_160px_120px_40px] items-center px-5 py-4",
                i < keys.length - 1 && "border-b border-border/50",
              )}
            >
              <span className="text-sm font-medium">{k.name}</span>
              <code className="font-mono text-sm text-muted-foreground">{k.prefix}…</code>
              <span className={cn("text-sm", k.lastUsed ? "text-muted-foreground" : "italic text-muted-foreground/60")}>
                {k.lastUsed ?? "Never"}
              </span>
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                      <MoreHorizontalIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem>Rename</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => revokeKey(k.id)}
                    >
                      Revoke
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </Card>

      {/* Warning */}
      <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/20">
        <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm text-amber-700 dark:text-amber-400">
          API keys grant full access to your store data. Only share them with trusted applications.
        </p>
      </div>

      <GenerateKeySheet open={genOpen} onOpenChange={setGenOpen} onSave={handleSave} />
    </div>
  )
}

// ─── Tax Rates ────────────────────────────────────────────────────────────────

function TaxRateSheet({
  rate,
  open,
  onOpenChange,
  onSave,
}: {
  rate: TaxRate | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: (data: Omit<TaxRate, "id">, id?: string) => void
}) {
  const [name, setName]           = React.useState("")
  const [rateVal, setRateVal]     = React.useState("")
  const [country, setCountry]     = React.useState("")
  const [state, setState]         = React.useState("")
  const [isInclusive, setIsIncl]  = React.useState(false)
  const [active, setActive]       = React.useState(true)

  React.useEffect(() => {
    if (open) {
      setName(rate?.name ?? "")
      setRateVal(rate ? String(rate.rate / 100) : "")   // convert basis points → display %
      setCountry(rate?.country ?? "")
      setState(rate?.state ?? "")
      setIsIncl(rate?.isInclusive ?? false)
      setActive(rate?.active ?? true)
    }
  }, [open, rate])

  const isEdit = !!rate
  const canSave = name.trim().length > 0 && rateVal.trim().length > 0 && country.length > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{isEdit ? "Edit tax rate" : "Add tax rate"}</SheetTitle>
          <SheetDescription>
            Tax rates are applied to orders in matching regions.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">

          <div className="space-y-1.5">
            <Label htmlFor="tx-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tx-name"
              placeholder="e.g. GST"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-rate">
              Rate <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="tx-rate"
                type="number"
                min={0}
                max={100}
                step={0.01}
                placeholder="0.00"
                value={rateVal}
                onChange={(e) => setRateVal(e.target.value)}
                className="w-28"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label htmlFor="tx-country">
              Country <span className="text-destructive">*</span>
            </Label>
            <Select value={country} onValueChange={(v) => { setCountry(v); setState("") }}>
              <SelectTrigger id="tx-country">
                <SelectValue placeholder="Select country…" />
              </SelectTrigger>
              <SelectContent>
                {TAX_COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {country === "US" && (
            <div className="space-y-1.5">
              <Label htmlFor="tx-state">State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger id="tx-state">
                  <SelectValue placeholder="All states (or select one)" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          <div className="space-y-2.5">
            <Label>Tax type</Label>
            <div className="flex flex-col gap-2">
              {([false, true] as const).map((incl) => (
                <label
                  key={String(incl)}
                  className="flex cursor-pointer items-center gap-2.5"
                  onClick={() => setIsIncl(incl)}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      isInclusive === incl ? "border-amber-500 bg-amber-500" : "border-border bg-transparent",
                    )}
                  >
                    {isInclusive === incl && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <span className="text-sm">{incl ? "Inclusive" : "Exclusive"}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {incl ? "(included in price)" : "(added on top of price)"}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          <label className="flex cursor-pointer items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {active ? "Applied to matching orders." : "Not currently applied."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActive((v) => !v)}
              className={cn(
                "relative mt-0.5 h-5 w-9 shrink-0 rounded-full border-2 transition-colors",
                active ? "border-amber-500 bg-amber-500" : "border-border bg-transparent",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-3 w-3 rounded-full transition-transform duration-200",
                  active ? "left-0.5 translate-x-4 bg-white" : "left-0.5 translate-x-0 bg-muted-foreground/40",
                )}
              />
            </button>
          </label>
        </div>
        <SheetFooter className="border-t">
          <SheetClose asChild>
            <Button variant="outline" className="flex-1">Cancel</Button>
          </SheetClose>
          <Button
            disabled={!canSave}
            className="flex-1 bg-orange-700 text-white shadow-none hover:bg-orange-800 disabled:opacity-50"
            onClick={() => { onSave({ name: name.trim(), rate: Math.round(parseFloat(rateVal) * 100), country, state, isInclusive, active }, rate?.id); onOpenChange(false) }}
          >
            {isEdit ? "Save changes" : "Add rate"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function TaxRatesSettings() {
  const [rates, setRates]         = React.useState<TaxRate[]>(INITIAL_TAX_RATES)
  const [sheet, setSheet]         = React.useState<{ open: boolean; rate: TaxRate | null }>({ open: false, rate: null })

  function handleSave(data: Omit<TaxRate, "id">, id?: string) {
    if (id) {
      setRates((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)))
    } else {
      setRates((prev) => [...prev, { id: `t${nextId++}`, ...data }])
    }
  }

  const countryName = (code: string) =>
    TAX_COUNTRIES.find((c) => c.code === code)?.name ?? code

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tax Rates</h2>
        <Button
          className="gap-2 bg-orange-700 px-5 text-white shadow-none hover:bg-orange-800"
          onClick={() => setSheet({ open: true, rate: null })}
        >
          <PlusIcon className="h-4 w-4" />
          Add rate
        </Button>
      </div>

      <Card className="overflow-hidden gap-0 py-0">
        <div className="grid grid-cols-[1fr_70px_150px_90px_80px_64px] items-center border-b bg-muted/20 px-5 py-2.5 text-xs font-medium text-muted-foreground">
          <span>Name</span>
          <span>Rate</span>
          <span>Region</span>
          <span>Type</span>
          <span className="text-center">Status</span>
          <span />
        </div>
        {rates.map((r, i) => (
          <div
            key={r.id}
            className={cn(
              "grid grid-cols-[1fr_70px_150px_90px_80px_64px] items-center px-5 py-4 transition-colors hover:bg-muted/20",
              i < rates.length - 1 && "border-b border-border/50",
            )}
          >
            <span className="text-sm font-medium">{r.name}</span>
            <span className="text-sm font-semibold tabular-nums">{(r.rate / 100).toFixed(2)}%</span>
            <span className="text-sm text-muted-foreground">
              {countryName(r.country)}{r.state ? ` – ${r.state}` : ""}
            </span>
            <span className="text-sm text-muted-foreground">{r.isInclusive ? "Incl." : "Excl."}</span>
            <div className="flex justify-center">
              <Badge
                variant="outline"
                className={cn(
                  "px-2 py-0 text-[11px] font-medium capitalize",
                  r.active
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400"
                    : "border-border bg-muted/40 text-muted-foreground",
                )}
              >
                {r.active ? "Active" : "Off"}
              </Badge>
            </div>
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setSheet({ open: true, rate: r })}
              >
                Edit
              </Button>
            </div>
          </div>
        ))}
      </Card>

      <TaxRateSheet
        rate={sheet.rate}
        open={sheet.open}
        onOpenChange={(v) => setSheet((s) => ({ ...s, open: v }))}
        onSave={handleSave}
      />
    </div>
  )
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

function AuditLogSettings() {
  const [entityFilter, setEntityFilter] = React.useState("all")
  const [actorFilter, setActorFilter]   = React.useState("all")
  const [dateFilter, setDateFilter]     = React.useState("all")
  const [expandedId, setExpandedId]     = React.useState<string | null>(null)

  const filtered = AUDIT_LOG.filter((e) => {
    if (entityFilter !== "all" && e.entity !== entityFilter)     return false
    if (actorFilter !== "all" && e.actorName !== actorFilter)    return false
    return true
  })

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Audit Log</h2>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="All entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entities</SelectItem>
            {AUDIT_ENTITIES.map((e) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={actorFilter} onValueChange={setActorFilter}>
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="All actors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actors</SelectItem>
            {AUDIT_ACTORS.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue placeholder="All time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>

        {(entityFilter !== "all" || actorFilter !== "all" || dateFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => { setEntityFilter("all"); setActorFilter("all"); setDateFilter("all") }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Log table */}
      <Card className="overflow-hidden gap-0 py-0">
        <div className="grid grid-cols-[110px_120px_1fr] items-center border-b bg-muted/20 px-5 py-2.5 text-xs font-medium text-muted-foreground">
          <span>Time</span>
          <span>Actor</span>
          <span>Action</span>
        </div>

        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No log entries match your filters.
          </p>
        ) : (
          filtered.map((entry, i) => (
            <div key={entry.id}>
              <button
                type="button"
                className={cn(
                  "grid w-full grid-cols-[110px_120px_1fr] items-start px-5 py-3.5 text-left transition-colors hover:bg-muted/20",
                  expandedId === entry.id && "bg-muted/10",
                  i < filtered.length - 1 && expandedId !== entry.id && "border-b border-border/50",
                )}
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              >
                <span className="text-xs text-muted-foreground leading-relaxed">{entry.time}</span>
                <span className="text-sm font-medium">{entry.actorName}</span>
                <div className="min-w-0">
                  <p className="text-sm">{entry.action}</p>
                  <p className="text-xs text-muted-foreground">{entry.detail}</p>
                </div>
              </button>

              {expandedId === entry.id && (
                <div className={cn(
                  "border-t bg-muted/5 px-5 py-4 space-y-3",
                  i < filtered.length - 1 && "border-b border-border/50",
                )}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="px-2 py-0 text-[11px] font-medium">
                      {entry.entity}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{entry.time}</span>
                  </div>
                  <pre className="overflow-x-auto rounded-lg bg-muted/50 px-4 py-3 font-mono text-xs leading-relaxed">
                    {entry.json}
                  </pre>
                  <div className="grid grid-cols-2 gap-x-6 text-xs text-muted-foreground">
                    <div><span className="font-medium text-foreground">IP:</span> {entry.ip}</div>
                    <div className="truncate"><span className="font-medium text-foreground">UA:</span> {entry.ua}</div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </Card>
    </div>
  )
}

// ─── Settings Layout ──────────────────────────────────────────────────────────

type Section = "general" | "team" | "api-keys" | "tax-rates" | "audit-log"

const SETTINGS_NAV: { key: Section; label: string }[] = [
  { key: "general",   label: "General"   },
  { key: "team",      label: "Team"      },
  { key: "api-keys",  label: "API Keys"  },
  { key: "tax-rates", label: "Tax Rates" },
  { key: "audit-log", label: "Audit Log" },
]

function SettingsPage() {
  const [section, setSection] = React.useState<Section>("general")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your store configuration.</p>
      </div>

      <div className="flex gap-8">
        {/* Secondary nav */}
        <nav className="w-44 shrink-0 space-y-0.5">
          {SETTINGS_NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => setSection(item.key)}
              className={cn(
                "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                section === item.key
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {section === "general"   && <GeneralSettings />}
          {section === "team"      && <TeamSettings />}
          {section === "api-keys"  && <ApiKeysSettings />}
          {section === "tax-rates" && <TaxRatesSettings />}
          {section === "audit-log" && <AuditLogSettings />}
        </div>
      </div>
    </div>
  )
}

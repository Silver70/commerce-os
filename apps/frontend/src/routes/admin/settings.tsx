import * as React from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import {
  CheckIcon,
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
import {
  organizationQueryOptions,
  storesQueryOptions,
  apiKeysQueryOptions,
  taxRatesQueryOptions,
  auditLogsQueryOptions,
} from "~/queries/settings"
import {
  updateOrgServerFn,
  createApiKeyFromSettingsServerFn,
  deleteApiKeyServerFn,
  createTaxRateServerFn,
  updateTaxRateServerFn,
  deleteTaxRateServerFn,
} from "~/server/settings"
import { updateStoreServerFn } from "~/server/stores"
import type { AdminRole, AuditEntry, TaxRate } from "~/types/api"

export const Route = createFileRoute("/admin/settings")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(storesQueryOptions()),
      context.queryClient.ensureQueryData(organizationQueryOptions()),
    ]),
  component: SettingsPage,
})

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCIES: { value: string; label: string }[] = [
  { value: "USD", label: "USD – US Dollar" },
  { value: "EUR", label: "EUR – Euro" },
  { value: "GBP", label: "GBP – British Pound" },
  { value: "AUD", label: "AUD – Australian Dollar" },
  { value: "SGD", label: "SGD – Singapore Dollar" },
  { value: "AED", label: "AED – UAE Dirham" },
  { value: "JPY", label: "JPY – Japanese Yen" },
  { value: "INR", label: "INR – Indian Rupee" },
  { value: "MVR", label: "MVR – Maldivian Rufiyaa" },
]

const TIMEZONES: { value: string; label: string }[] = [
  { value: "America/Los_Angeles", label: "UTC-8 – US Pacific" },
  { value: "America/New_York",    label: "UTC-5 – US Eastern" },
  { value: "UTC",                 label: "UTC+0 – UTC / London" },
  { value: "Europe/Berlin",       label: "UTC+1 – Central European" },
  { value: "Africa/Nairobi",      label: "UTC+3 – East Africa / Arabian" },
  { value: "Indian/Maldives",     label: "UTC+5 – Maldives" },
  { value: "Asia/Kolkata",        label: "UTC+5:30 – India" },
  { value: "Asia/Singapore",      label: "UTC+8 – Singapore / Malaysia / China" },
  { value: "Asia/Tokyo",          label: "UTC+9 – Japan / Korea" },
  { value: "Australia/Sydney",    label: "UTC+10 – Eastern Australia" },
  { value: "Pacific/Auckland",    label: "UTC+12 – New Zealand" },
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

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin:     "Super Admin",
  product_manager: "Product Manager",
  support_agent:   "Support Agent",
}

function getActiveStoreId(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/(?:^|;\s*)wos-active-store=([^;]*)/)
  return match ? match[1] : null
}

// ─── General Settings ─────────────────────────────────────────────────────────

function GeneralSettings() {
  const queryClient = useQueryClient()
  const { data: stores } = useSuspenseQuery(storesQueryOptions())
  const activeId = getActiveStoreId()
  const store = stores.find((s) => s.id === activeId) ?? stores[0]

  const [storeName, setStoreName] = React.useState(store?.name ?? "")
  const [currency, setCurrency]   = React.useState(store?.currency ?? "USD")
  const [timezone, setTimezone]   = React.useState(store?.timezone ?? "UTC")

  React.useEffect(() => {
    if (store) {
      setStoreName(store.name)
      setCurrency(store.currency)
      setTimezone(store.timezone)
    }
  }, [store?.id])

  const saveMutation = useMutation({
    mutationFn: () =>
      updateStoreServerFn({
        data: { storeId: store!.id, name: storeName.trim(), currency, timezone },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings", "stores"] })
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">General</h2>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !store}
          className="gap-2 bg-orange-700 px-5 text-white shadow-none hover:bg-orange-800"
        >
          {saveMutation.isSuccess ? <CheckIcon className="h-4 w-4" /> : null}
          {saveMutation.isPending ? "Saving…" : saveMutation.isSuccess ? "Saved" : "Save"}
        </Button>
      </div>

      {saveMutation.isError && (
        <p className="text-sm text-destructive">{saveMutation.error.message}</p>
      )}

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
                value={store?.slug ?? ""}
                readOnly
                className="rounded-r-none bg-muted/30 text-muted-foreground"
              />
              <span className="flex h-9 items-center rounded-r-md border border-l-0 bg-muted/30 px-3 text-sm text-muted-foreground whitespace-nowrap">
                .mycommerce.com
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Read-only — slug is set at store creation.</p>
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
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
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
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}

// ─── Team Settings (mock — WorkOS team management is out of scope) ─────────────

type MockTeamMember = { id: string; name: string; email: string; role: AdminRole; isYou?: boolean }
type MockInvitation = { id: string; email: string; role: AdminRole; sentDate: string }

const INITIAL_MEMBERS: MockTeamMember[] = [
  { id: "u1", name: "Silver",     email: "jsameeu@gmail.com", role: "super_admin",     isYou: true },
  { id: "u2", name: "Jane Park",  email: "jane@surf.com",     role: "product_manager" },
  { id: "u3", name: "Ali Hassan", email: "ali@surf.com",      role: "support_agent"   },
]

const INITIAL_INVITATIONS: MockInvitation[] = [
  { id: "i1", email: "mark@email.com", role: "product_manager", sentDate: "May 10, 2026" },
]

let nextMockId = 200

function InviteSheet({
  open,
  onOpenChange,
  onInvite,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onInvite: (email: string, role: AdminRole) => void
}) {
  const [email, setEmail] = React.useState("")
  const [role, setRole]   = React.useState<AdminRole>("product_manager")

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
            <Select value={role} onValueChange={(v) => setRole(v as AdminRole)}>
              <SelectTrigger id="inv-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="product_manager">Product Manager</SelectItem>
                <SelectItem value="support_agent">Support Agent</SelectItem>
              </SelectContent>
            </Select>
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

function RoleBadge({ role }: { role: AdminRole }) {
  const styles: Record<AdminRole, string> = {
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

function TeamSettings() {
  const [members, setMembers]         = React.useState<MockTeamMember[]>(INITIAL_MEMBERS)
  const [invitations, setInvitations] = React.useState<MockInvitation[]>(INITIAL_INVITATIONS)
  const [inviteOpen, setInviteOpen]   = React.useState(false)

  function handleInvite(email: string, role: AdminRole) {
    setInvitations((prev) => [
      ...prev,
      { id: `i${nextMockId++}`, email, role, sentDate: "May 22, 2026" },
    ])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Team</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Team management via WorkOS — full integration coming in a future release.</p>
        </div>
        <Button
          className="gap-2 bg-orange-700 px-5 text-white shadow-none hover:bg-orange-800"
          onClick={() => setInviteOpen(true)}
        >
          <PlusIcon className="h-4 w-4" />
          Invite member
        </Button>
      </div>

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
                    <DropdownMenuItem onClick={() =>
                      setMembers((prev) =>
                        prev.map((mem) =>
                          mem.id === m.id
                            ? { ...mem, role: mem.role === "product_manager" ? "support_agent" : "product_manager" }
                            : mem,
                        ),
                      )
                    }>
                      Change role
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setMembers((prev) => prev.filter((mem) => mem.id !== m.id))}
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
                    onClick={() => setInvitations((prev) => prev.filter((i) => i.id !== inv.id))}
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
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [step, setStep]     = React.useState<1 | 2>(1)
  const [name, setName]     = React.useState("")
  const [genKey, setGenKey] = React.useState("")
  const [copied, setCopied] = React.useState(false)
  const [error, setError]   = React.useState("")

  React.useEffect(() => {
    if (open) { setStep(1); setName(""); setGenKey(""); setCopied(false); setError("") }
  }, [open])

  const generateMutation = useMutation({
    mutationFn: () => createApiKeyFromSettingsServerFn({ data: { name: name.trim() } }),
    onSuccess: (data) => {
      setGenKey(data.key)
      setStep(2)
      void queryClient.invalidateQueries({ queryKey: ["settings", "api-keys"] })
    },
    onError: (err) => setError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (keyId: string) => deleteApiKeyServerFn({ data: { keyId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings", "api-keys"] })
    },
  })

  function handleCopy() {
    navigator.clipboard.writeText(genKey).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <SheetFooter className="border-t">
              <SheetClose asChild>
                <Button variant="outline" className="flex-1">Cancel</Button>
              </SheetClose>
              <Button
                disabled={!name.trim() || generateMutation.isPending}
                className="flex-1 bg-orange-700 text-white shadow-none hover:bg-orange-800 disabled:opacity-50"
                onClick={() => generateMutation.mutate()}
              >
                {generateMutation.isPending ? "Generating…" : "Generate key"}
              </Button>
            </SheetFooter>
          </>
        ) : (
          <>
            <div className="flex-1 px-4 py-5 space-y-5">
              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  This key is shown <strong>only once</strong>. Copy it now — you will not be able to retrieve it later.
                </p>
              </div>
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
                    {copied
                      ? <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />
                      : <CopyIcon className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
            <SheetFooter className="border-t">
              <Button
                className="w-full bg-orange-700 text-white shadow-none hover:bg-orange-800"
                onClick={() => onOpenChange(false)}
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
  const queryClient = useQueryClient()
  const { data: keys = [] } = useQuery(apiKeysQueryOptions())
  const [genOpen, setGenOpen] = React.useState(false)

  const deleteMutation = useMutation({
    mutationFn: (keyId: string) => deleteApiKeyServerFn({ data: { keyId } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["settings", "api-keys"] }),
  })

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
              <span className={cn("text-sm", k.lastUsedAt ? "text-muted-foreground" : "italic text-muted-foreground/60")}>
                {k.lastUsedAt
                  ? new Date(k.lastUsedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : "Never"}
              </span>
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                      <MoreHorizontalIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(k.id)}
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

      <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/20">
        <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm text-amber-700 dark:text-amber-400">
          API keys grant full access to your store data. Only share them with trusted applications.
        </p>
      </div>

      <GenerateKeySheet open={genOpen} onOpenChange={setGenOpen} />
    </div>
  )
}

// ─── Tax Rates ────────────────────────────────────────────────────────────────

function TaxRateSheet({
  rate,
  open,
  onOpenChange,
}: {
  rate: TaxRate | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [name, setName]           = React.useState("")
  const [rateVal, setRateVal]     = React.useState("")
  const [country, setCountry]     = React.useState("")
  const [state, setState]         = React.useState("")
  const [isInclusive, setIsIncl]  = React.useState(false)
  const [isActive, setIsActive]   = React.useState(true)

  React.useEffect(() => {
    if (open) {
      setName(rate?.name ?? "")
      setRateVal(rate ? String(rate.rate / 100) : "")
      setCountry(rate?.country ?? "")
      setState(rate?.state ?? "")
      setIsIncl(rate?.isInclusive ?? false)
      setIsActive(rate?.isActive ?? true)
    }
  }, [open, rate])

  const isEdit = !!rate
  const canSave = name.trim().length > 0 && rateVal.trim().length > 0 && country.length > 0

  const mutation = useMutation({
    mutationFn: () => {
      const basisPoints = Math.round(parseFloat(rateVal) * 100)
      if (isEdit) {
        return updateTaxRateServerFn({
          data: { id: rate.id, name: name.trim(), rate: basisPoints, isInclusive, isActive },
        })
      }
      return createTaxRateServerFn({
        data: { name: name.trim(), rate: basisPoints, country, state: state || undefined, isInclusive, isActive },
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings", "tax-rates"] })
      onOpenChange(false)
    },
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{isEdit ? "Edit tax rate" : "Add tax rate"}</SheetTitle>
          <SheetDescription>Tax rates are applied to orders in matching regions.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">

          <div className="space-y-1.5">
            <Label htmlFor="tx-name">Name <span className="text-destructive">*</span></Label>
            <Input id="tx-name" placeholder="e.g. GST" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-rate">Rate <span className="text-destructive">*</span></Label>
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
            <Label htmlFor="tx-country">Country <span className="text-destructive">*</span></Label>
            <Select value={country} onValueChange={(v) => { setCountry(v); setState("") }}>
              <SelectTrigger id="tx-country">
                <SelectValue placeholder="Select country…" />
              </SelectTrigger>
              <SelectContent>
                {TAX_COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.name} ({c.code})</SelectItem>
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
                {isActive ? "Applied to matching orders." : "Not currently applied."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className={cn(
                "relative mt-0.5 h-5 w-9 shrink-0 rounded-full border-2 transition-colors",
                isActive ? "border-amber-500 bg-amber-500" : "border-border bg-transparent",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-3 w-3 rounded-full transition-transform duration-200",
                  isActive ? "left-0.5 translate-x-4 bg-white" : "left-0.5 translate-x-0 bg-muted-foreground/40",
                )}
              />
            </button>
          </label>

          {mutation.isError && (
            <p className="text-sm text-destructive">{mutation.error.message}</p>
          )}
        </div>
        <SheetFooter className="border-t">
          <SheetClose asChild>
            <Button variant="outline" className="flex-1">Cancel</Button>
          </SheetClose>
          <Button
            disabled={!canSave || mutation.isPending}
            className="flex-1 bg-orange-700 text-white shadow-none hover:bg-orange-800 disabled:opacity-50"
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Add rate"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function TaxRatesSettings() {
  const queryClient = useQueryClient()
  const { data: rates = [] } = useQuery(taxRatesQueryOptions())
  const [sheet, setSheet] = React.useState<{ open: boolean; rate: TaxRate | null }>({ open: false, rate: null })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTaxRateServerFn({ data: { id } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["settings", "tax-rates"] }),
  })

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
        {rates.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No tax rates configured.</p>
        ) : (
          rates.map((r, i) => (
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
                    r.isActive
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400"
                      : "border-border bg-muted/40 text-muted-foreground",
                  )}
                >
                  {r.isActive ? "Active" : "Off"}
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
          ))
        )}
      </Card>

      <TaxRateSheet
        rate={sheet.rate}
        open={sheet.open}
        onOpenChange={(v) => setSheet((s) => ({ ...s, open: v }))}
      />
    </div>
  )
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

function AuditLogSettings() {
  const { data: page } = useQuery(auditLogsQueryOptions())
  const entries: AuditEntry[] = page?.items ?? []

  const [resourceFilter, setResourceFilter] = React.useState("all")
  const [expandedId, setExpandedId]         = React.useState<string | null>(null)

  const resources = Array.from(new Set(entries.map((e) => e.resource))).sort()

  const filtered = entries.filter((e) => {
    if (resourceFilter !== "all" && e.resource !== resourceFilter) return false
    return true
  })

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Audit Log</h2>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={resourceFilter} onValueChange={setResourceFilter}>
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="All resources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All resources</SelectItem>
            {resources.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {resourceFilter !== "all" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => setResourceFilter("all")}
          >
            Clear filters
          </Button>
        )}
      </div>

      <Card className="overflow-hidden gap-0 py-0">
        <div className="grid grid-cols-[160px_180px_1fr] items-center border-b bg-muted/20 px-5 py-2.5 text-xs font-medium text-muted-foreground">
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
                  "grid w-full grid-cols-[160px_180px_1fr] items-start px-5 py-3.5 text-left transition-colors hover:bg-muted/20",
                  expandedId === entry.id && "bg-muted/10",
                  i < filtered.length - 1 && expandedId !== entry.id && "border-b border-border/50",
                )}
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              >
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {new Date(entry.createdAt).toLocaleString("en-US", {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
                <span className="text-sm font-medium">{entry.actorEmail}</span>
                <div className="min-w-0">
                  <p className="text-sm">{entry.action}</p>
                  <p className="text-xs text-muted-foreground">{entry.resource}{entry.resourceId ? ` · ${entry.resourceId}` : ""}</p>
                </div>
              </button>

              {expandedId === entry.id && (
                <div className={cn(
                  "border-t bg-muted/5 px-5 py-4 space-y-3",
                  i < filtered.length - 1 && "border-b border-border/50",
                )}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="px-2 py-0 text-[11px] font-medium">
                      {entry.resource}
                    </Badge>
                    {entry.ipAddress && (
                      <span className="text-xs text-muted-foreground">IP: {entry.ipAddress}</span>
                    )}
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

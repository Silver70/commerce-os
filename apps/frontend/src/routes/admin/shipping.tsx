import * as React from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  ChevronDownIcon,
  ChevronRightIcon,
  GlobeIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"

import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Separator } from "~/components/ui/separator"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet"

export const Route = createFileRoute("/admin/shipping")({
  component: ShippingPage,
})

// ─── Types ────────────────────────────────────────────────────────────────────

type ShippingMethod = {
  id: string
  name: string
  description: string
  price: number
  minOrder: number | null
  minDays: number
  maxDays: number
  active: boolean
}

type ShippingZone = {
  id: string
  name: string
  countries: string[]
  methods: ShippingMethod[]
}

// ─── Country Data ─────────────────────────────────────────────────────────────

type Country = { code: string; name: string; region: string }

const ALL_COUNTRIES: Country[] = [
  // Asia
  { code: "MV", name: "Maldives",     region: "Asia" },
  { code: "SG", name: "Singapore",    region: "Asia" },
  { code: "MY", name: "Malaysia",     region: "Asia" },
  { code: "TH", name: "Thailand",     region: "Asia" },
  { code: "IN", name: "India",        region: "Asia" },
  { code: "LK", name: "Sri Lanka",    region: "Asia" },
  { code: "PH", name: "Philippines",  region: "Asia" },
  { code: "ID", name: "Indonesia",    region: "Asia" },
  { code: "VN", name: "Vietnam",      region: "Asia" },
  { code: "JP", name: "Japan",        region: "Asia" },
  { code: "KR", name: "South Korea",  region: "Asia" },
  { code: "CN", name: "China",        region: "Asia" },
  // Middle East
  { code: "AE", name: "UAE",          region: "Middle East" },
  { code: "SA", name: "Saudi Arabia", region: "Middle East" },
  { code: "QA", name: "Qatar",        region: "Middle East" },
  { code: "KW", name: "Kuwait",       region: "Middle East" },
  { code: "BH", name: "Bahrain",      region: "Middle East" },
  // Europe
  { code: "GB", name: "United Kingdom", region: "Europe" },
  { code: "DE", name: "Germany",      region: "Europe" },
  { code: "FR", name: "France",       region: "Europe" },
  { code: "IT", name: "Italy",        region: "Europe" },
  { code: "ES", name: "Spain",        region: "Europe" },
  { code: "NL", name: "Netherlands",  region: "Europe" },
  { code: "SE", name: "Sweden",       region: "Europe" },
  { code: "NO", name: "Norway",       region: "Europe" },
  // Americas
  { code: "US", name: "United States", region: "Americas" },
  { code: "CA", name: "Canada",       region: "Americas" },
  { code: "MX", name: "Mexico",       region: "Americas" },
  { code: "BR", name: "Brazil",       region: "Americas" },
  { code: "AR", name: "Argentina",    region: "Americas" },
  // Oceania
  { code: "AU", name: "Australia",    region: "Oceania" },
  { code: "NZ", name: "New Zealand",  region: "Oceania" },
  { code: "FJ", name: "Fiji",         region: "Oceania" },
]

const REGIONS = ["Asia", "Middle East", "Europe", "Americas", "Oceania"]

// ─── Fake Data ────────────────────────────────────────────────────────────────

const INITIAL_ZONES: ShippingZone[] = [
  {
    id: "z1",
    name: "Domestic (Maldives)",
    countries: ["MV"],
    methods: [
      { id: "m1", name: "Standard Shipping", description: "3–5 business days", price: 5.00,  minOrder: null, minDays: 3, maxDays: 5,  active: true  },
      { id: "m2", name: "Express Shipping",  description: "1–2 business days", price: 15.00, minOrder: null, minDays: 1, maxDays: 2,  active: true  },
      { id: "m3", name: "Free Shipping",     description: "Orders over $100",  price: 0.00,  minOrder: 100,  minDays: 5, maxDays: 8,  active: true  },
    ],
  },
  {
    id: "z2",
    name: "Asia",
    countries: ["SG", "MY", "TH", "IN", "LK", "PH", "ID"],
    methods: [
      { id: "m4", name: "Standard International", description: "5–10 business days", price: 12.00, minOrder: null, minDays: 5,  maxDays: 10, active: true },
      { id: "m5", name: "Express International",  description: "2–4 business days",  price: 25.00, minOrder: null, minDays: 2,  maxDays: 4,  active: true },
    ],
  },
  {
    id: "z3",
    name: "Rest of World",
    countries: ["US", "GB", "AU", "DE", "FR", "CA", "NL"],
    methods: [
      { id: "m6", name: "Standard International", description: "7–14 business days", price: 18.00, minOrder: null, minDays: 7,  maxDays: 14, active: true  },
      { id: "m7", name: "Express International",  description: "3–7 business days",  price: 35.00, minOrder: null, minDays: 3,  maxDays: 7,  active: true  },
      { id: "m8", name: "Economy Shipping",       description: "14–21 business days",price: 8.00,  minOrder: null, minDays: 14, maxDays: 21, active: false },
    ],
  },
]

// ─── Country Picker ───────────────────────────────────────────────────────────

function CountryPicker({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (codes: string[]) => void
}) {
  const [search, setSearch] = React.useState("")

  const filtered = ALL_COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()),
  )

  const filteredByRegion = REGIONS.map((region) => ({
    region,
    countries: filtered.filter((c) => c.region === region),
  })).filter((g) => g.countries.length > 0)

  function toggle(code: string) {
    onChange(
      selected.includes(code)
        ? selected.filter((c) => c !== code)
        : [...selected, code],
    )
  }

  function selectRegion(region: string) {
    const codes = ALL_COUNTRIES
      .filter((c) => c.region === region)
      .map((c) => c.code)
    const allSelected = codes.every((c) => selected.includes(c))
    if (allSelected) {
      onChange(selected.filter((c) => !codes.includes(c)))
    } else {
      onChange([...new Set([...selected, ...codes])])
    }
  }

  return (
    <div className="space-y-3">
      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((code) => {
            const country = ALL_COUNTRIES.find((c) => c.code === code)
            return (
              <span
                key={code}
                className="flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 text-xs font-medium"
              >
                {country?.name ?? code}
                <button
                  type="button"
                  onClick={() => toggle(code)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </span>
            )
          })}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search countries…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 text-sm"
        />
      </div>

      {/* Country list */}
      <div className="max-h-56 overflow-y-auto rounded-lg border">
        {filteredByRegion.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No countries found.
          </p>
        ) : (
          filteredByRegion.map(({ region, countries }, gi) => {
            const regionCodes = ALL_COUNTRIES
              .filter((c) => c.region === region)
              .map((c) => c.code)
            const allRegionSelected = regionCodes.every((c) =>
              selected.includes(c),
            )
            return (
              <div key={region}>
                {gi > 0 && <div className="border-t" />}
                {/* Region header */}
                <div className="flex items-center justify-between bg-muted/30 px-3 py-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {region}
                  </span>
                  <button
                    type="button"
                    onClick={() => selectRegion(region)}
                    className="text-[11px] font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400"
                  >
                    {allRegionSelected ? "Deselect all" : "Select all"}
                  </button>
                </div>
                {countries.map((country) => (
                  <label
                    key={country.code}
                    className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-muted/20"
                    onClick={() => toggle(country.code)}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
                        selected.includes(country.code)
                          ? "border-amber-500 bg-amber-500"
                          : "border-border bg-transparent",
                      )}
                    >
                      {selected.includes(country.code) && (
                        <svg
                          viewBox="0 0 10 8"
                          className="h-2.5 w-2.5 text-white"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <polyline points="1 4 4 7 9 1" />
                        </svg>
                      )}
                    </div>
                    <span className="flex-1 text-sm">{country.name}</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {country.code}
                    </span>
                  </label>
                ))}
              </div>
            )
          })
        )}
      </div>

      {selected.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selected.length} countr{selected.length === 1 ? "y" : "ies"} selected
        </p>
      )}
    </div>
  )
}

// ─── Zone Sheet ───────────────────────────────────────────────────────────────

function ZoneSheet({
  zone,
  open,
  onOpenChange,
  onSave,
}: {
  zone: ShippingZone | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: (name: string, countries: string[], id?: string) => void
}) {
  const [name, setName]           = React.useState("")
  const [countries, setCountries] = React.useState<string[]>([])

  React.useEffect(() => {
    if (open) {
      setName(zone?.name ?? "")
      setCountries(zone?.countries ?? [])
    }
  }, [open, zone])

  const isEdit = !!zone
  const canSave = name.trim().length > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{isEdit ? "Edit zone" : "Add zone"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the zone name and countries."
              : "Define a new shipping zone and select which countries it covers."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="z-name">
              Zone name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="z-name"
              placeholder="e.g. Europe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Countries</Label>
            <CountryPicker selected={countries} onChange={setCountries} />
          </div>
        </div>

        <SheetFooter className="border-t">
          <SheetClose asChild>
            <Button variant="outline" className="flex-1">Cancel</Button>
          </SheetClose>
          <Button
            disabled={!canSave}
            className="flex-1 bg-orange-700 text-white shadow-none hover:bg-orange-800 disabled:opacity-50"
            onClick={() => {
              onSave(name.trim(), countries, zone?.id)
              onOpenChange(false)
            }}
          >
            {isEdit ? "Save changes" : "Add zone"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Method Sheet ─────────────────────────────────────────────────────────────

function MethodSheet({
  method,
  open,
  onOpenChange,
  onSave,
}: {
  method: ShippingMethod | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: (data: Omit<ShippingMethod, "id">, id?: string) => void
}) {
  const [name, setName]           = React.useState("")
  const [description, setDesc]    = React.useState("")
  const [price, setPrice]         = React.useState("")
  const [minOrder, setMinOrder]   = React.useState("")
  const [minDays, setMinDays]     = React.useState("3")
  const [maxDays, setMaxDays]     = React.useState("7")
  const [active, setActive]       = React.useState(true)

  React.useEffect(() => {
    if (open) {
      setName(method?.name ?? "")
      setDesc(method?.description ?? "")
      setPrice(method ? String(method.price) : "")
      setMinOrder(method?.minOrder !== null && method?.minOrder !== undefined ? String(method.minOrder) : "")
      setMinDays(method ? String(method.minDays) : "3")
      setMaxDays(method ? String(method.maxDays) : "7")
      setActive(method?.active ?? true)
    }
  }, [open, method])

  const isEdit = !!method
  const canSave = name.trim().length > 0 && price.trim().length > 0

  function handleSave() {
    onSave(
      {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price) || 0,
        minOrder: minOrder.trim() === "" ? null : parseFloat(minOrder),
        minDays: parseInt(minDays) || 1,
        maxDays: parseInt(maxDays) || 7,
        active,
      },
      method?.id,
    )
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{isEdit ? "Edit shipping method" : "Add shipping method"}</SheetTitle>
          <SheetDescription>
            Flat rate shipping for this zone.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">

          <div className="space-y-1.5">
            <Label htmlFor="m-name">
              Method name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="m-name"
              placeholder="e.g. Standard Shipping"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m-desc">
              Description{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (shown to customer)
              </span>
            </Label>
            <Input
              id="m-desc"
              placeholder="e.g. 3–5 business days"
              value={description}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>

          <Separator />

          {/* Rate type — flat only for MVP */}
          <div className="space-y-1.5">
            <Label>Rate type</Label>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2.5">
              <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-amber-500 bg-amber-500">
                <div className="h-1.5 w-1.5 rounded-full bg-white" />
              </div>
              <span className="text-sm">Flat rate</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m-price">
              Price <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id="m-price"
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-32"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m-min-order">
              Minimum order for free shipping{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id="m-min-order"
                type="number"
                min={0}
                step={0.01}
                placeholder="e.g. 100.00"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                className="w-36"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to always charge this rate.
            </p>
          </div>

          <Separator />

          {/* Delivery estimate */}
          <div className="space-y-2">
            <Label>Estimated delivery</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                value={minDays}
                onChange={(e) => setMinDays(e.target.value)}
                className="w-20 text-center"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="number"
                min={1}
                value={maxDays}
                onChange={(e) => setMaxDays(e.target.value)}
                className="w-20 text-center"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          </div>

          <Separator />

          {/* Active toggle */}
          <label className="flex cursor-pointer items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {active
                  ? "This method is shown to customers at checkout."
                  : "This method is hidden from customers."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActive((v) => !v)}
              className={cn(
                "relative mt-0.5 h-5 w-9 shrink-0 rounded-full border-2 transition-colors",
                active
                  ? "border-amber-500 bg-amber-500"
                  : "border-border bg-transparent",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-3 w-3 rounded-full transition-transform duration-200",
                  active
                    ? "left-0.5 translate-x-4 bg-white"
                    : "left-0.5 translate-x-0 bg-muted-foreground/40",
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
            onClick={handleSave}
          >
            {isEdit ? "Save changes" : "Add method"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Zone Card ────────────────────────────────────────────────────────────────

function ActiveDot({ active }: { active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "px-2 py-0 text-[11px] font-medium capitalize",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400"
          : "border-border bg-muted/40 text-muted-foreground",
      )}
    >
      {active ? "Active" : "Inactive"}
    </Badge>
  )
}

function countryName(code: string) {
  return ALL_COUNTRIES.find((c) => c.code === code)?.name ?? code
}

function ZoneCard({
  zone,
  defaultExpanded,
  onEditZone,
  onAddMethod,
  onEditMethod,
}: {
  zone: ShippingZone
  defaultExpanded?: boolean
  onEditZone: () => void
  onAddMethod: () => void
  onEditMethod: (method: ShippingMethod) => void
}) {
  const [expanded, setExpanded] = React.useState(defaultExpanded ?? false)

  const displayCountries = zone.countries.slice(0, 4)
  const extraCount = zone.countries.length - displayCountries.length

  return (
    <div className="rounded-lg border bg-card">
      {/* ── Zone header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{zone.name}</p>
          {!expanded && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {zone.countries.length === 0
                ? "No countries"
                : displayCountries.map((c) => countryName(c)).join(", ") +
                  (extraCount > 0 ? ` + ${extraCount} more` : "")}
              {" · "}
              {zone.methods.length === 0
                ? "No methods"
                : `${zone.methods.length} method${zone.methods.length !== 1 ? "s" : ""}`}
            </p>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 text-xs"
          onClick={onEditZone}
        >
          <PencilIcon className="h-3 w-3" />
          Edit zone
        </Button>
      </div>

      {/* ── Expanded content ─────────────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t px-5 pb-5 pt-4 space-y-5">

          {/* Countries */}
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <GlobeIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Countries
              </span>
            </div>
            {zone.countries.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No countries added yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {zone.countries.map((code) => (
                  <span
                    key={code}
                    className="rounded-md border bg-muted/30 px-2 py-0.5 text-xs font-medium"
                    title={countryName(code)}
                  >
                    {code}
                  </span>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Methods */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Shipping methods
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2.5 text-xs"
                onClick={onAddMethod}
              >
                <PlusIcon className="h-3 w-3" />
                Add method
              </Button>
            </div>

            {zone.methods.length === 0 ? (
              <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
                No shipping methods. Add one to start accepting orders in this zone.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                {/* Header */}
                <div className="grid grid-cols-[1fr_100px_110px_80px_64px] items-center bg-muted/20 px-4 py-2 text-xs font-medium text-muted-foreground">
                  <span>Method</span>
                  <span>Rate</span>
                  <span>Delivery</span>
                  <span className="text-center">Status</span>
                  <span />
                </div>

                {zone.methods.map((method, i) => (
                  <div
                    key={method.id}
                    className={cn(
                      "grid grid-cols-[1fr_100px_110px_80px_64px] items-center px-4 py-3 transition-colors hover:bg-muted/20",
                      i < zone.methods.length - 1 && "border-b border-border/50",
                    )}
                  >
                    {/* Name + description */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-none">{method.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{method.description}</p>
                    </div>

                    {/* Rate */}
                    <div className="text-sm font-semibold tabular-nums">
                      {method.price === 0 && method.minOrder
                        ? <span className="text-emerald-600 dark:text-emerald-400">Free</span>
                        : `$${method.price.toFixed(2)}`}
                      {method.minOrder !== null && (
                        <p className="text-[10px] font-normal text-muted-foreground">
                          min ${method.minOrder}
                        </p>
                      )}
                    </div>

                    {/* Delivery */}
                    <span className="text-sm text-muted-foreground">
                      {method.minDays}–{method.maxDays} days
                    </span>

                    {/* Status */}
                    <div className="flex justify-center">
                      <ActiveDot active={method.active} />
                    </div>

                    {/* Edit */}
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => onEditMethod(method)}
                      >
                        <PencilIcon className="h-3 w-3" />
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ZoneSheetState = { zone: ShippingZone | null; open: boolean }
type MethodSheetState = { zoneId: string; method: ShippingMethod | null; open: boolean }

let nextId = 100

function ShippingPage() {
  const [zones, setZones] = React.useState<ShippingZone[]>(INITIAL_ZONES)

  const [zoneSheet, setZoneSheet]     = React.useState<ZoneSheetState>({ zone: null, open: false })
  const [methodSheet, setMethodSheet] = React.useState<MethodSheetState>({ zoneId: "", method: null, open: false })

  function openAddZone() {
    setZoneSheet({ zone: null, open: true })
  }

  function openEditZone(zone: ShippingZone) {
    setZoneSheet({ zone, open: true })
  }

  function openAddMethod(zoneId: string) {
    setMethodSheet({ zoneId, method: null, open: true })
  }

  function openEditMethod(zoneId: string, method: ShippingMethod) {
    setMethodSheet({ zoneId, method, open: true })
  }

  function handleSaveZone(name: string, countries: string[], id?: string) {
    if (id) {
      setZones((prev) =>
        prev.map((z) => (z.id === id ? { ...z, name, countries } : z)),
      )
    } else {
      setZones((prev) => [
        ...prev,
        { id: `z${nextId++}`, name, countries, methods: [] },
      ])
    }
  }

  function handleSaveMethod(data: Omit<ShippingMethod, "id">, id?: string) {
    const { zoneId } = methodSheet
    setZones((prev) =>
      prev.map((z) => {
        if (z.id !== zoneId) return z
        if (id) {
          return {
            ...z,
            methods: z.methods.map((m) => (m.id === id ? { ...m, ...data } : m)),
          }
        }
        return {
          ...z,
          methods: [...z.methods, { id: `m${nextId++}`, ...data }],
        }
      }),
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Shipping</h1>
          <p className="text-sm text-muted-foreground">
            Configure shipping zones and rates.
          </p>
        </div>
        <Button
          className="gap-2 bg-orange-700 px-5 py-2.5 text-white shadow-none hover:bg-orange-800"
          onClick={openAddZone}
        >
          <PlusIcon className="h-4 w-4" />
          Add zone
        </Button>
      </div>

      {/* ── Zone list ─────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {zones.length === 0 ? (
          <div className="rounded-lg border border-dashed py-16 text-center">
            <GlobeIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No shipping zones yet. Add one to get started.
            </p>
          </div>
        ) : (
          zones.map((zone, i) => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              defaultExpanded={i === 0}
              onEditZone={() => openEditZone(zone)}
              onAddMethod={() => openAddMethod(zone.id)}
              onEditMethod={(method) => openEditMethod(zone.id, method)}
            />
          ))
        )}
      </div>

      {/* ── Sheets ────────────────────────────────────────────────────────────── */}
      <ZoneSheet
        zone={zoneSheet.zone}
        open={zoneSheet.open}
        onOpenChange={(v) => setZoneSheet((s) => ({ ...s, open: v }))}
        onSave={handleSaveZone}
      />

      <MethodSheet
        method={methodSheet.method}
        open={methodSheet.open}
        onOpenChange={(v) => setMethodSheet((s) => ({ ...s, open: v }))}
        onSave={handleSaveMethod}
      />

    </div>
  )
}

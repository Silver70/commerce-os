import * as React from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  useSuspenseQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import {
  ChevronDownIcon,
  ChevronRightIcon,
  GlobeIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
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
import type { ShippingMethod, ShippingZone } from "~/types/api"
import {
  createShippingZoneServerFn,
  createShippingMethodServerFn,
  updateShippingZoneServerFn,
  deleteShippingZoneServerFn,
  updateShippingMethodServerFn,
  deleteShippingMethodServerFn,
} from "~/server/shipping"
import {
  shippingZonesQueryOptions,
  shippingMethodsQueryOptions,
} from "~/queries/shipping"

export const Route = createFileRoute("/admin/shipping")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(shippingZonesQueryOptions()),
  component: ShippingPage,
})

// ─── Country Data ─────────────────────────────────────────────────────────────

type Country = { code: string; name: string; region: string }

const ALL_COUNTRIES: Country[] = [
  // Asia
  { code: "MV", name: "Maldives",       region: "Asia" },
  { code: "SG", name: "Singapore",      region: "Asia" },
  { code: "MY", name: "Malaysia",       region: "Asia" },
  { code: "TH", name: "Thailand",       region: "Asia" },
  { code: "IN", name: "India",          region: "Asia" },
  { code: "LK", name: "Sri Lanka",      region: "Asia" },
  { code: "PH", name: "Philippines",    region: "Asia" },
  { code: "ID", name: "Indonesia",      region: "Asia" },
  { code: "VN", name: "Vietnam",        region: "Asia" },
  { code: "JP", name: "Japan",          region: "Asia" },
  { code: "KR", name: "South Korea",    region: "Asia" },
  { code: "CN", name: "China",          region: "Asia" },
  // Middle East
  { code: "AE", name: "UAE",            region: "Middle East" },
  { code: "SA", name: "Saudi Arabia",   region: "Middle East" },
  { code: "QA", name: "Qatar",          region: "Middle East" },
  { code: "KW", name: "Kuwait",         region: "Middle East" },
  { code: "BH", name: "Bahrain",        region: "Middle East" },
  // Europe
  { code: "GB", name: "United Kingdom", region: "Europe" },
  { code: "DE", name: "Germany",        region: "Europe" },
  { code: "FR", name: "France",         region: "Europe" },
  { code: "IT", name: "Italy",          region: "Europe" },
  { code: "ES", name: "Spain",          region: "Europe" },
  { code: "NL", name: "Netherlands",    region: "Europe" },
  { code: "SE", name: "Sweden",         region: "Europe" },
  { code: "NO", name: "Norway",         region: "Europe" },
  // Americas
  { code: "US", name: "United States",  region: "Americas" },
  { code: "CA", name: "Canada",         region: "Americas" },
  { code: "MX", name: "Mexico",         region: "Americas" },
  { code: "BR", name: "Brazil",         region: "Americas" },
  { code: "AR", name: "Argentina",      region: "Americas" },
  // Oceania
  { code: "AU", name: "Australia",      region: "Oceania" },
  { code: "NZ", name: "New Zealand",    region: "Oceania" },
  { code: "FJ", name: "Fiji",           region: "Oceania" },
]

const REGIONS = ["Asia", "Middle East", "Europe", "Americas", "Oceania"]

function countryName(code: string) {
  return ALL_COUNTRIES.find((c) => c.code === code)?.name ?? code
}

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
    const codes = ALL_COUNTRIES.filter((c) => c.region === region).map((c) => c.code)
    const allSelected = codes.every((c) => selected.includes(c))
    if (allSelected) {
      onChange(selected.filter((c) => !codes.includes(c)))
    } else {
      onChange([...new Set([...selected, ...codes])])
    }
  }

  return (
    <div className="space-y-3">
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

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search countries…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 text-sm"
        />
      </div>

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
            const allRegionSelected = regionCodes.every((c) => selected.includes(c))
            return (
              <div key={region}>
                {gi > 0 && <div className="border-t" />}
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

type ZoneFormValues = { name: string; countries: string[] }

function ZoneSheet({
  zone,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  zone: ShippingZone | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: (values: ZoneFormValues) => void
  isSaving: boolean
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
  const canSave = name.trim().length > 0 && !isSaving

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
            onClick={() => onSave({ name: name.trim(), countries })}
          >
            {isSaving ? "Saving…" : isEdit ? "Save changes" : "Add zone"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Method Sheet ─────────────────────────────────────────────────────────────

type RateType = "flat_rate" | "free" | "calculated"

type MethodFormValues = {
  name: string
  rateType: RateType
  price: string
  minOrderAmount: string
  estimatedDaysMin: string
  estimatedDaysMax: string
  isActive: boolean
}

function methodDefaults(method: ShippingMethod | null): MethodFormValues {
  if (!method) {
    return {
      name: "",
      rateType: "flat_rate",
      price: "",
      minOrderAmount: "",
      estimatedDaysMin: "3",
      estimatedDaysMax: "7",
      isActive: true,
    }
  }
  return {
    name: method.name,
    rateType: method.rateType,
    price: (method.price / 100).toFixed(2),
    minOrderAmount:
      method.minOrderAmount != null
        ? (method.minOrderAmount / 100).toFixed(2)
        : "",
    estimatedDaysMin: method.estimatedDaysMin != null ? String(method.estimatedDaysMin) : "",
    estimatedDaysMax: method.estimatedDaysMax != null ? String(method.estimatedDaysMax) : "",
    isActive: method.isActive,
  }
}

function MethodSheet({
  method,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: {
  method: ShippingMethod | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: (values: MethodFormValues) => void
  isSaving: boolean
}) {
  const [form, setForm] = React.useState<MethodFormValues>(methodDefaults(null))

  React.useEffect(() => {
    if (open) setForm(methodDefaults(method))
  }, [open, method])

  function set<K extends keyof MethodFormValues>(key: K, value: MethodFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const isEdit = !!method
  const canSave = form.name.trim().length > 0 && form.price.trim().length > 0 && !isSaving

  const rateTypeOptions: { value: RateType; label: string }[] = [
    { value: "flat_rate",   label: "Flat rate" },
    { value: "free",        label: "Free shipping" },
    { value: "calculated",  label: "Calculated" },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{isEdit ? "Edit shipping method" : "Add shipping method"}</SheetTitle>
          <SheetDescription>Configure a shipping rate for this zone.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="m-name">
              Method name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="m-name"
              placeholder="e.g. Standard Shipping"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label>Rate type</Label>
            <div className="space-y-1.5">
              {rateTypeOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors",
                    form.rateType === opt.value
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20"
                      : "bg-muted/20 hover:bg-muted/40",
                  )}
                  onClick={() => set("rateType", opt.value)}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      form.rateType === opt.value
                        ? "border-amber-500 bg-amber-500"
                        : "border-border",
                    )}
                  >
                    {form.rateType === opt.value && (
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="text-sm">{opt.label}</span>
                </div>
              ))}
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
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                className="w-32"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m-min-order">
              Minimum order amount{" "}
              <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id="m-min-order"
                type="number"
                min={0}
                step={0.01}
                placeholder="e.g. 100.00"
                value={form.minOrderAmount}
                onChange={(e) => set("minOrderAmount", e.target.value)}
                className="w-36"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to always charge this rate.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Estimated delivery</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                placeholder="min"
                value={form.estimatedDaysMin}
                onChange={(e) => set("estimatedDaysMin", e.target.value)}
                className="w-20 text-center"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="number"
                min={0}
                placeholder="max"
                value={form.estimatedDaysMax}
                onChange={(e) => set("estimatedDaysMax", e.target.value)}
                className="w-20 text-center"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          </div>

          <Separator />

          <label className="flex cursor-pointer items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {form.isActive
                  ? "This method is shown to customers at checkout."
                  : "This method is hidden from customers."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => set("isActive", !form.isActive)}
              className={cn(
                "relative mt-0.5 h-5 w-9 shrink-0 rounded-full border-2 transition-colors",
                form.isActive
                  ? "border-amber-500 bg-amber-500"
                  : "border-border bg-transparent",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-3 w-3 rounded-full transition-transform duration-200",
                  form.isActive
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
            onClick={() => onSave(form)}
          >
            {isSaving ? "Saving…" : isEdit ? "Save changes" : "Add method"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ─── Active Badge ─────────────────────────────────────────────────────────────

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

// ─── Zone Card ────────────────────────────────────────────────────────────────

type MethodSheetState = { method: ShippingMethod | null; open: boolean }

function ZoneCard({
  zone,
  defaultExpanded,
  onEditZone,
  onDeleteZone,
}: {
  zone: ShippingZone
  defaultExpanded?: boolean
  onEditZone: () => void
  onDeleteZone: () => void
}) {
  const queryClient = useQueryClient()
  const [expanded, setExpanded]           = React.useState(defaultExpanded ?? false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [confirmDeleteMethodId, setConfirmDeleteMethodId] = React.useState<string | null>(null)
  const [methodSheet, setMethodSheet]     = React.useState<MethodSheetState>({ method: null, open: false })
  const [methodError, setMethodError]     = React.useState<string | null>(null)

  const methodsQuery = useQuery({
    ...shippingMethodsQueryOptions(zone.id),
    enabled: expanded,
  })

  const methods = methodsQuery.data ?? []

  const createMethodMutation = useMutation({
    mutationFn: (values: MethodFormValues) =>
      createShippingMethodServerFn({
        data: {
          zoneId: zone.id,
          name: values.name,
          rateType: values.rateType,
          price: Math.round(parseFloat(values.price) * 100) || 0,
          minOrderAmount: values.minOrderAmount
            ? Math.round(parseFloat(values.minOrderAmount) * 100)
            : undefined,
          estimatedDaysMin: values.estimatedDaysMin
            ? parseInt(values.estimatedDaysMin)
            : undefined,
          estimatedDaysMax: values.estimatedDaysMax
            ? parseInt(values.estimatedDaysMax)
            : undefined,
          isActive: values.isActive,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(shippingMethodsQueryOptions(zone.id))
      setMethodSheet({ method: null, open: false })
      setMethodError(null)
    },
    onError: (err: Error) => setMethodError(err.message),
  })

  const updateMethodMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: MethodFormValues }) =>
      updateShippingMethodServerFn({
        data: {
          id,
          name: values.name,
          rateType: values.rateType,
          price: Math.round(parseFloat(values.price) * 100) || 0,
          minOrderAmount: values.minOrderAmount
            ? Math.round(parseFloat(values.minOrderAmount) * 100)
            : undefined,
          estimatedDaysMin: values.estimatedDaysMin
            ? parseInt(values.estimatedDaysMin)
            : undefined,
          estimatedDaysMax: values.estimatedDaysMax
            ? parseInt(values.estimatedDaysMax)
            : undefined,
          isActive: values.isActive,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(shippingMethodsQueryOptions(zone.id))
      setMethodSheet({ method: null, open: false })
      setMethodError(null)
    },
    onError: (err: Error) => setMethodError(err.message),
  })

  const deleteMethodMutation = useMutation({
    mutationFn: (id: string) =>
      deleteShippingMethodServerFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries(shippingMethodsQueryOptions(zone.id))
      setConfirmDeleteMethodId(null)
    },
  })

  function handleMethodSave(values: MethodFormValues) {
    if (methodSheet.method) {
      updateMethodMutation.mutate({ id: methodSheet.method.id, values })
    } else {
      createMethodMutation.mutate(values)
    }
  }

  const isSavingMethod =
    createMethodMutation.isPending || updateMethodMutation.isPending

  const displayCountries = zone.countries.slice(0, 4)
  const extraCount = zone.countries.length - displayCountries.length

  return (
    <div className="rounded-lg border bg-card">
      {/* Zone header */}
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
            </p>
          )}
        </div>

        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Delete this zone?</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 bg-destructive px-2.5 text-xs text-destructive-foreground hover:bg-destructive/90"
              onClick={onDeleteZone}
            >
              Delete
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-1.5 text-xs"
              onClick={onEditZone}
            >
              <PencilIcon className="h-3 w-3" />
              Edit zone
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2Icon className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Expanded content */}
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
              <p className="text-xs text-muted-foreground italic">No countries added yet.</p>
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
                onClick={() => {
                  setMethodError(null)
                  setMethodSheet({ method: null, open: true })
                }}
              >
                <PlusIcon className="h-3 w-3" />
                Add method
              </Button>
            </div>

            {methodError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {methodError}
              </p>
            )}

            {methodsQuery.isLoading ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>
            ) : methods.length === 0 ? (
              <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
                No shipping methods. Add one to start accepting orders in this zone.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <div className="grid grid-cols-[1fr_110px_110px_80px_80px] items-center bg-muted/20 px-4 py-2 text-xs font-medium text-muted-foreground">
                  <span>Method</span>
                  <span>Rate</span>
                  <span>Delivery</span>
                  <span className="text-center">Status</span>
                  <span />
                </div>

                {methods.map((method, i) => (
                  <div
                    key={method.id}
                    className={cn(
                      "grid grid-cols-[1fr_110px_110px_80px_80px] items-center px-4 py-3 transition-colors hover:bg-muted/20",
                      i < methods.length - 1 && "border-b border-border/50",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-none">{method.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                        {method.rateType.replace("_", " ")}
                      </p>
                    </div>

                    <div className="text-sm font-semibold tabular-nums">
                      {method.rateType === "free" ? (
                        <span className="text-emerald-600 dark:text-emerald-400">Free</span>
                      ) : (
                        `$${(method.price / 100).toFixed(2)}`
                      )}
                      {method.minOrderAmount != null && (
                        <p className="text-[10px] font-normal text-muted-foreground">
                          min ${(method.minOrderAmount / 100).toFixed(2)}
                        </p>
                      )}
                    </div>

                    <span className="text-sm text-muted-foreground">
                      {method.estimatedDaysMin != null && method.estimatedDaysMax != null
                        ? `${method.estimatedDaysMin}–${method.estimatedDaysMax} days`
                        : "—"}
                    </span>

                    <div className="flex justify-center">
                      <ActiveDot active={method.isActive} />
                    </div>

                    <div className="flex items-center justify-end gap-1">
                      {confirmDeleteMethodId === method.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-[11px]"
                            onClick={() => setConfirmDeleteMethodId(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="h-6 bg-destructive px-1.5 text-[11px] text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteMethodMutation.mutate(method.id)}
                          >
                            Delete
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setMethodError(null)
                              setMethodSheet({ method, open: true })
                            }}
                          >
                            <PencilIcon className="h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setConfirmDeleteMethodId(method.id)}
                          >
                            <Trash2Icon className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <MethodSheet
        method={methodSheet.method}
        open={methodSheet.open}
        onOpenChange={(v) => setMethodSheet((s) => ({ ...s, open: v }))}
        onSave={handleMethodSave}
        isSaving={isSavingMethod}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ZoneSheetState = { zone: ShippingZone | null; open: boolean }

function ShippingPage() {
  const queryClient = useQueryClient()
  const { data: zones } = useSuspenseQuery(shippingZonesQueryOptions())

  const [zoneSheet, setZoneSheet] = React.useState<ZoneSheetState>({ zone: null, open: false })
  const [zoneError, setZoneError] = React.useState<string | null>(null)

  const createZoneMutation = useMutation({
    mutationFn: (values: ZoneFormValues) =>
      createShippingZoneServerFn({
        data: { name: values.name, countries: values.countries, isDefault: false },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(shippingZonesQueryOptions())
      setZoneSheet({ zone: null, open: false })
      setZoneError(null)
    },
    onError: (err: Error) => setZoneError(err.message),
  })

  const updateZoneMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ZoneFormValues }) =>
      updateShippingZoneServerFn({
        data: { id, name: values.name, countries: values.countries },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(shippingZonesQueryOptions())
      setZoneSheet({ zone: null, open: false })
      setZoneError(null)
    },
    onError: (err: Error) => setZoneError(err.message),
  })

  const deleteZoneMutation = useMutation({
    mutationFn: (id: string) => deleteShippingZoneServerFn({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries(shippingZonesQueryOptions()),
  })

  function handleSaveZone(values: ZoneFormValues) {
    if (zoneSheet.zone) {
      updateZoneMutation.mutate({ id: zoneSheet.zone.id, values })
    } else {
      createZoneMutation.mutate(values)
    }
  }

  const isSavingZone = createZoneMutation.isPending || updateZoneMutation.isPending

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Shipping</h1>
          <p className="text-sm text-muted-foreground">
            Configure shipping zones and rates.
          </p>
        </div>
        <Button
          className="gap-2 bg-orange-700 px-5 py-2.5 text-white shadow-none hover:bg-orange-800"
          onClick={() => {
            setZoneError(null)
            setZoneSheet({ zone: null, open: true })
          }}
        >
          <PlusIcon className="h-4 w-4" />
          Add zone
        </Button>
      </div>

      {zoneError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {zoneError}
        </p>
      )}

      {/* Zone list */}
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
              onEditZone={() => {
                setZoneError(null)
                setZoneSheet({ zone, open: true })
              }}
              onDeleteZone={() => deleteZoneMutation.mutate(zone.id)}
            />
          ))
        )}
      </div>

      <ZoneSheet
        zone={zoneSheet.zone}
        open={zoneSheet.open}
        onOpenChange={(v) => setZoneSheet((s) => ({ ...s, open: v }))}
        onSave={handleSaveZone}
        isSaving={isSavingZone}
      />
    </div>
  )
}

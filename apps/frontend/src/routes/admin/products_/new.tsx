import * as React from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ArrowLeftIcon,
  PlusIcon,
  ChevronRightIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  ListIcon,
  LinkIcon,
  ImagePlusIcon,
  GripVerticalIcon,
  XIcon,
  MoreHorizontalIcon,
  SearchIcon,
} from "lucide-react"

import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Badge } from "~/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Separator } from "~/components/ui/separator"
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

export const Route = createFileRoute("/admin/products_/new")({
  component: ProductEditPage,
})

// ─── Types ────────────────────────────────────────────────────────────────────

type Variant = {
  id: string
  label: string
  sku: string
  price: string
  compareAt: string
  cost: string
  stock: string
  lowStockThreshold: string
  weight: string
  barcode: string
  allowBackorder: boolean
  active: boolean
}

type Category = {
  id: string
  label: string
}

type OptionGroup = {
  id: string
  name: string
  values: string[]
}

// ─── Fake Data ────────────────────────────────────────────────────────────────

const SEED_VARIANTS: Variant[] = [
  { id: "1", label: "S / Red",   sku: "WAVE-S-RED",   price: "149.99", compareAt: "",       cost: "75.00", stock: "12", lowStockThreshold: "5", weight: "350", barcode: "", allowBackorder: false, active: true  },
  { id: "2", label: "S / Blue",  sku: "WAVE-S-BLUE",  price: "149.99", compareAt: "",       cost: "75.00", stock: "8",  lowStockThreshold: "5", weight: "350", barcode: "", allowBackorder: false, active: true  },
  { id: "3", label: "M / Red",   sku: "WAVE-M-RED",   price: "149.99", compareAt: "",       cost: "75.00", stock: "15", lowStockThreshold: "5", weight: "360", barcode: "", allowBackorder: false, active: true  },
  { id: "4", label: "M / Blue",  sku: "WAVE-M-BLUE",  price: "149.99", compareAt: "",       cost: "75.00", stock: "20", lowStockThreshold: "5", weight: "360", barcode: "", allowBackorder: false, active: true  },
  { id: "5", label: "L / Red",   sku: "WAVE-L-RED",   price: "159.99", compareAt: "169.99", cost: "80.00", stock: "6",  lowStockThreshold: "5", weight: "370", barcode: "", allowBackorder: false, active: true  },
  { id: "6", label: "L / Blue",  sku: "WAVE-L-BLUE",  price: "159.99", compareAt: "169.99", cost: "80.00", stock: "4",  lowStockThreshold: "5", weight: "370", barcode: "", allowBackorder: false, active: true  },
  { id: "7", label: "XL / Red",  sku: "WAVE-XL-RED",  price: "169.99", compareAt: "",       cost: "85.00", stock: "2",  lowStockThreshold: "3", weight: "380", barcode: "", allowBackorder: false, active: false },
  { id: "8", label: "XL / Blue", sku: "WAVE-XL-BLUE", price: "169.99", compareAt: "",       cost: "85.00", stock: "0",  lowStockThreshold: "3", weight: "380", barcode: "", allowBackorder: true,  active: false },
]

const ALL_CATEGORIES: Category[] = [
  { id: "surf",         label: "Surfboards"   },
  { id: "short",        label: "Shortboards"  },
  { id: "long",         label: "Longboards"   },
  { id: "body",         label: "Bodyboards"   },
  { id: "apparel",      label: "Apparel"      },
  { id: "rash",         label: "Rashguards"   },
  { id: "wetsuits",     label: "Wetsuits"     },
  { id: "boardshorts",  label: "Board Shorts" },
  { id: "accessories",  label: "Accessories"  },
  { id: "electronics",  label: "Electronics"  },
  { id: "footwear",     label: "Footwear"     },
  { id: "beauty",       label: "Beauty"       },
]

const FAKE_IMAGES = [
  { id: "1", gradient: "from-blue-400 via-blue-500 to-indigo-700",  primary: true  },
  { id: "2", gradient: "from-slate-500 via-slate-600 to-slate-800", primary: false },
  { id: "3", gradient: "from-cyan-400 via-teal-500 to-cyan-700",    primary: false },
]

const INITIAL_DESCRIPTION = `The Wave Board Pro is engineered for intermediate to advanced surfers seeking a versatile, high-performance board. Constructed with our proprietary EPS foam core and wrapped in bio-resin fibreglass, it strikes the perfect balance between speed, control, and durability.

Ideal for beach breaks and point breaks alike. Three-fin (thruster) setup for maximum drive through turns.`

const INITIAL_SHORT = "High-performance surfboard for intermediate to advanced surfers. EPS core, bio-resin fibreglass."

// ─── Description Editor ───────────────────────────────────────────────────────

function DescriptionEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const toolbar = [
    [BoldIcon, "Bold"],
    [ItalicIcon, "Italic"],
    [UnderlineIcon, "Underline"],
    null,
    [ListIcon, "Bullet list"],
    [LinkIcon, "Link"],
  ] as const

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center gap-0.5 border-b bg-muted/40 px-2 py-1.5">
        {toolbar.map((item, i) =>
          item === null ? (
            <div key={`d-${i}`} className="mx-1 h-4 w-px bg-border" />
          ) : (() => {
              const Icon = item[0]
              return (
                <button
                  key={item[1]}
                  type="button"
                  title={item[1]}
                  className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              )
            })(),
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={7}
        className="w-full resize-none bg-background px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
        placeholder="Describe your product…"
      />
    </div>
  )
}

// ─── Media Gallery ────────────────────────────────────────────────────────────

function MediaGallery() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2.5">
        {FAKE_IMAGES.map((img) => (
          <div key={img.id} className="group relative h-[88px] w-[88px] cursor-move overflow-hidden rounded-lg">
            <div className={`h-full w-full bg-gradient-to-br ${img.gradient}`} />
            <div className="absolute left-1.5 top-1.5 opacity-0 transition-opacity group-hover:opacity-100">
              <GripVerticalIcon className="h-3.5 w-3.5 text-white drop-shadow" />
            </div>
            <button
              type="button"
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
            >
              <XIcon className="h-3 w-3" />
            </button>
            {img.primary && (
              <div className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-white">
                  Primary
                </span>
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          className="flex h-[88px] w-[88px] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-amber-400 hover:bg-amber-50/40 hover:text-amber-600 dark:hover:bg-amber-950/10"
        >
          <ImagePlusIcon className="h-5 w-5" />
          <span className="text-[10px] font-medium">Add</span>
        </button>
      </div>

      <div className="cursor-pointer rounded-lg border-2 border-dashed border-border bg-muted/20 py-6 text-center transition-colors hover:border-amber-400 hover:bg-amber-50/30 dark:hover:bg-amber-950/10">
        <ImagePlusIcon className="mx-auto mb-1.5 h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium text-muted-foreground">Drop images here, or click to upload</p>
        <p className="mt-0.5 text-xs text-muted-foreground/60">JPEG, PNG, WebP · Max 5 MB each</p>
      </div>
    </div>
  )
}

// ─── Variant Row ──────────────────────────────────────────────────────────────

function VariantRow({
  v,
  isOpen,
  onToggle,
  onUpdate,
}: {
  v: Variant
  isOpen: boolean
  onToggle: () => void
  onUpdate: (patch: Partial<Variant>) => void
}) {

  return (
    <div className={cn("border-b border-border/50 last:border-0", isOpen && "bg-muted/10")}>
      {/* Summary row */}
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/20"
        onClick={onToggle}
      >
        <ChevronRightIcon
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-90",
          )}
        />

        {/* Label */}
        <span className="min-w-0 flex-1 text-sm font-medium">{v.label}</span>

        {/* SKU */}
        <span className="hidden w-32 truncate font-mono text-xs text-muted-foreground sm:block">
          {v.sku}
        </span>

        {/* Price */}
        <span className="w-20 text-right text-sm font-semibold tabular-nums">${v.price}</span>

        {/* Stock */}
        <div className="w-24 text-right">
          <span className="text-sm tabular-nums text-muted-foreground">
            {v.stock || "—"}
          </span>
        </div>

        {/* Active toggle */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onUpdate({ active: !v.active }) }}
          className={cn(
            "relative ml-3 h-5 w-9 shrink-0 rounded-full border-2 transition-colors",
            v.active ? "border-amber-500 bg-amber-500" : "border-border bg-transparent",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-3 w-3 rounded-full transition-transform duration-200",
              v.active
                ? "left-0.5 translate-x-4 bg-white"
                : "left-0.5 translate-x-0 bg-muted-foreground/40",
            )}
          />
        </button>

        {/* Overflow menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground">
              <MoreHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              Delete variant
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Inline detail form */}
      {isOpen && (
        <div className="border-t border-border/40 bg-background/60 px-6 py-5">
          <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                SKU <span className="text-destructive">*</span>
              </Label>
              <Input
                value={v.sku}
                onChange={(e) => onUpdate({ sku: e.target.value })}
                className="h-9 font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Price <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input value={v.price} onChange={(e) => onUpdate({ price: e.target.value })} className="h-9 pl-6 text-sm" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Compare-at price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input value={v.compareAt} onChange={(e) => onUpdate({ compareAt: e.target.value })} className="h-9 pl-6 text-sm" placeholder="—" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Cost price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input value={v.cost} onChange={(e) => onUpdate({ cost: e.target.value })} className="h-9 pl-6 text-sm" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Weight (g)</Label>
              <Input value={v.weight} onChange={(e) => onUpdate({ weight: e.target.value })} className="h-9 text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Barcode</Label>
              <Input value={v.barcode} onChange={(e) => onUpdate({ barcode: e.target.value })} className="h-9 font-mono text-sm" placeholder="ISBN, UPC, GTIN…" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Stock quantity</Label>
              <Input value={v.stock} onChange={(e) => onUpdate({ stock: e.target.value })} className="h-9 text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Low stock threshold</Label>
              <Input value={v.lowStockThreshold} onChange={(e) => onUpdate({ lowStockThreshold: e.target.value })} className="h-9 text-sm" />
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              id={`backorder-${v.id}`}
              checked={v.allowBackorder}
              onChange={(e) => onUpdate({ allowBackorder: e.target.checked })}
              className="h-4 w-4 rounded border-border accent-amber-500"
            />
            <span className="text-sm">Allow backorder when out of stock</span>
          </label>
        </div>
      )}
    </div>
  )
}

// ─── Variant Options Card ─────────────────────────────────────────────────────

function VariantOptionsCard({
  options,
  onChange,
  onGenerate,
}: {
  options: OptionGroup[]
  onChange: (opts: OptionGroup[]) => void
  onGenerate: () => void
}) {
  const [inputs, setInputs] = React.useState<Record<string, string>>({})

  function updateOption(id: string, patch: Partial<OptionGroup>) {
    onChange(options.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  }

  function commitValue(optId: string) {
    const raw = (inputs[optId] ?? "").trim().replace(/,+$/, "")
    if (!raw) return
    const opt = options.find((o) => o.id === optId)
    if (!opt || opt.values.includes(raw)) return
    updateOption(optId, { values: [...opt.values, raw] })
    setInputs((prev) => ({ ...prev, [optId]: "" }))
  }

  function removeValue(optId: string, value: string) {
    const opt = options.find((o) => o.id === optId)
    if (!opt) return
    updateOption(optId, { values: opt.values.filter((v) => v !== value) })
  }

  function removeOption(id: string) {
    onChange(options.filter((o) => o.id !== id))
  }

  function addOption() {
    onChange([...options, { id: String(Date.now()), name: "", values: [] }])
  }

  const totalCombinations = options
    .filter((o) => o.values.length > 0)
    .reduce((acc, o) => acc * o.values.length, 1)

  const canGenerate = options.some((o) => o.name.trim() && o.values.length > 0)

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <div>
          <p className="text-sm font-semibold">Variants</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Define options — combinations are generated automatically.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {options.map((opt, i) => (
          <div key={opt.id} className="space-y-2">
            {/* Option name row */}
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-5 shrink-0 items-end justify-center pb-1.5 text-xs font-medium text-muted-foreground">
                {i + 1}.
              </span>
              <Input
                value={opt.name}
                onChange={(e) => updateOption(opt.id, { name: e.target.value })}
                placeholder="Option name (e.g. Size)"
                className="h-8 flex-1 text-sm"
              />
              {options.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeOption(opt.id)}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Tag input */}
            <div
              className="ml-7 flex min-h-[38px] cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
              onClick={(e) => (e.currentTarget.querySelector("input") as HTMLInputElement | null)?.focus()}
            >
              {opt.values.map((val) => (
                <span
                  key={val}
                  className="group inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium"
                >
                  {val}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeValue(opt.id, val) }}
                    className="-mr-0.5 ml-0.5 rounded-full p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                value={inputs[opt.id] ?? ""}
                onChange={(e) => setInputs((prev) => ({ ...prev, [opt.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault()
                    commitValue(opt.id)
                  } else if (e.key === "Backspace" && !inputs[opt.id] && opt.values.length > 0) {
                    removeValue(opt.id, opt.values[opt.values.length - 1])
                  }
                }}
                onBlur={() => commitValue(opt.id)}
                placeholder={opt.values.length === 0 ? "Type a value, press Enter to add…" : "Add…"}
                className="min-w-[140px] flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        ))}

        {options.length < 3 && (
          <div className="ml-7">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={addOption}
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Add another option
            </Button>
          </div>
        )}

        <Separator />

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {canGenerate
              ? `${totalCombinations} variant${totalCombinations !== 1 ? "s" : ""} will be generated`
              : "Add at least one option with values to continue."}
          </p>
          <Button
            size="sm"
            disabled={!canGenerate}
            className="h-8 bg-orange-700 px-4 text-white shadow-none hover:bg-orange-800 disabled:opacity-40"
            onClick={onGenerate}
          >
            Generate variants
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Variants Card ────────────────────────────────────────────────────────────

function VariantsCard({
  options,
  onDirty,
  onEditOptions,
}: {
  options: OptionGroup[]
  onDirty: () => void
  onEditOptions: () => void
}) {
  const [variants, setVariants] = React.useState<Variant[]>(SEED_VARIANTS)
  const [openId, setOpenId] = React.useState<string | null>(null)

  function updateVariant(id: string, patch: Partial<Variant>) {
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)))
    onDirty()
  }

  return (
    <Card className="overflow-hidden gap-0 py-0">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-4">
        <div>
          <p className="text-sm font-semibold">Variants</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {variants.length} variants · {options.map((o) => o.name).join(" × ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs">
            Bulk edit prices
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <PlusIcon className="h-3.5 w-3.5" />
            Add variant
          </Button>
        </div>
      </div>

      <Separator />

      {/* Options pills */}
      <div className="flex flex-wrap items-center gap-2 bg-muted/30 px-4 py-3">
        <span className="text-xs font-medium text-muted-foreground">Options:</span>
        {options.map((o) => (
          <Badge key={o.id} variant="outline" className="bg-background text-xs font-medium">
            {o.name}: {o.values.join(", ")}
          </Badge>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-7 text-xs text-muted-foreground hover:text-foreground"
          onClick={onEditOptions}
        >
          Edit options
        </Button>
      </div>

      <Separator />

      {/* Table column headers */}
      <div className="flex items-center gap-3 bg-muted/20 px-4 py-2.5">
        <div className="w-4 shrink-0" />
        <span className="flex-1 text-xs font-medium text-muted-foreground">Variant</span>
        <span className="hidden w-32 text-xs font-medium text-muted-foreground sm:block">SKU</span>
        <span className="w-20 text-right text-xs font-medium text-muted-foreground">Price</span>
        <span className="w-24 text-right text-xs font-medium text-muted-foreground">Stock</span>
        <span className="ml-3 w-9 text-center text-xs font-medium text-muted-foreground">Active</span>
        <div className="w-7 shrink-0" />
      </div>

      <Separator />

      {/* Rows */}
      <div>
        {variants.map((v) => (
          <VariantRow
            key={v.id}
            v={v}
            isOpen={openId === v.id}
            onToggle={() => setOpenId(openId === v.id ? null : v.id)}
            onUpdate={(patch) => updateVariant(v.id, patch)}
          />
        ))}
      </div>
    </Card>
  )
}

// ─── Categories Card ──────────────────────────────────────────────────────────

function CategoriesCard({
  selected,
  onAdd,
  onRemove,
}: {
  selected: Category[]
  onAdd: (cat: Category) => void
  onRemove: (id: string) => void
}) {
  const [query, setQuery] = React.useState("")
  const [focused, setFocused] = React.useState(false)

  const suggestions = ALL_CATEGORIES.filter(
    (c) =>
      !selected.some((s) => s.id === c.id) &&
      c.label.toLowerCase().includes(query.toLowerCase()),
  )

  const showDropdown = focused && suggestions.length > 0

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-sm font-semibold">Categories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {/* Search input */}
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 120)}
            placeholder="Search categories…"
            className="h-9 pl-8 text-sm"
          />

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-md">
              {suggestions.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onMouseDown={() => { onAdd(cat); setQuery("") }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted/60"
                >
                  <PlusIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected badges */}
        {selected.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((cat) => (
              <span
                key={cat.id}
                className="group inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium"
              >
                {cat.label}
                <button
                  type="button"
                  onClick={() => onRemove(cat.id)}
                  className="ml-0.5 -mr-0.5 rounded-full p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No categories selected.</p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Status badge helper ──────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  active:   "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400",
  draft:    "text-muted-foreground border-border bg-muted/40",
  archived: "text-destructive border-destructive/20 bg-destructive/10",
}

const STATUS_HINTS: Record<string, string> = {
  active:   "Visible and purchasable in your storefront.",
  draft:    "Hidden from the storefront. Still editable.",
  archived: "Hidden from the storefront and locked from edits.",
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ProductEditPage() {
  const [title, setTitle]         = React.useState("Wave Board Pro")
  const [description, setDesc]    = React.useState(INITIAL_DESCRIPTION)
  const [shortDesc, setShortDesc] = React.useState(INITIAL_SHORT)
  const [status, setStatus]       = React.useState("active")
  const [featured, setFeatured]   = React.useState(false)
  const [selectedCats, setCats]   = React.useState<Category[]>([
    { id: "surf",  label: "Surfboards"  },
    { id: "short", label: "Shortboards" },
  ])
  const [slug, setSlug]           = React.useState("wave-board-pro")
  const [metaTitle, setMetaTitle] = React.useState("Wave Board Pro — Surfboards")
  const [metaDesc, setMetaDesc]   = React.useState(INITIAL_SHORT)
  const [variantOptions, setVariantOptions] = React.useState<OptionGroup[]>([
    { id: "size",  name: "Size",  values: ["S", "M", "L", "XL"] },
    { id: "color", name: "Color", values: ["Red", "Blue"]        },
  ])
  const [variantsGenerated, setVariantsGenerated] = React.useState(true)
  const [isDirty, setIsDirty]     = React.useState(false)

  const dirty = () => setIsDirty(true)

  function wrap<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); dirty() }
  }

  function addCat(cat: Category) {
    setCats((prev) => [...prev, cat])
    dirty()
  }

  function removeCat(id: string) {
    setCats((prev) => prev.filter((c) => c.id !== id))
    dirty()
  }

  function handleSave() {
    setIsDirty(false)
  }

  return (
    <div className="space-y-6 pb-28">

      {/* ── Page header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {/* Breadcrumb */}
          <div className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link
              to="/admin/products"
              className="flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Products
            </Link>
            <ChevronRightIcon className="h-3.5 w-3.5" />
            <span className="text-foreground">Add product</span>
          </div>

          <h1 className="text-2xl font-semibold leading-tight">
            {title.trim() || "Untitled product"}
          </h1>

          <div className="mt-1.5 flex items-center gap-2.5">
            <Badge
              variant="outline"
              className={`px-2 py-0 text-[11px] font-medium capitalize ${STATUS_STYLES[status]}`}
            >
              {status}
            </Badge>
            <span className="text-xs text-muted-foreground">8 variants</span>
          </div>
        </div>

        {/* Header actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="lg" className="h-9 px-4" asChild>
            <Link to="/admin/products">Discard</Link>
          </Button>
          <Button
            size="lg"
            className="h-9 px-5 bg-orange-700 text-white shadow-none hover:bg-orange-800"
            onClick={handleSave}
          >
            Save product
          </Button>
        </div>
      </div>

      {/* ── Two-column grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ── Left column (2 / 3) ─────────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">

          {/* Basic information */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-semibold">Basic information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Product title <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={title}
                  onChange={(e) => wrap(setTitle)(e.target.value)}
                  className="h-10 text-sm"
                  placeholder="e.g. Wave Board Pro"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Description</Label>
                <DescriptionEditor value={description} onChange={wrap(setDesc)} />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Short description</Label>
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      shortDesc.length > 480 ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {shortDesc.length} / 500
                  </span>
                </div>
                <textarea
                  value={shortDesc}
                  onChange={(e) => wrap(setShortDesc)(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground transition-[border-color,box-shadow] focus:border-ring focus:ring-3 focus:ring-ring/50"
                  placeholder="Brief summary shown in search results and product cards…"
                />
              </div>
            </CardContent>
          </Card>

          {/* Media */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-semibold">Media</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <MediaGallery />
            </CardContent>
          </Card>

          {/* Variants */}
          {variantsGenerated ? (
            <VariantsCard
              options={variantOptions}
              onDirty={dirty}
              onEditOptions={() => setVariantsGenerated(false)}
            />
          ) : (
            <VariantOptionsCard
              options={variantOptions}
              onChange={setVariantOptions}
              onGenerate={() => { setVariantsGenerated(true); dirty() }}
            />
          )}
        </div>

        {/* ── Right column (1 / 3) ────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Status */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-semibold">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Visibility
                </Label>
                <Select value={status} onValueChange={(v) => { setStatus(v); dirty() }}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{STATUS_HINTS[status]}</p>
              </div>

              <Separator />

              <label className="group flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => { setFeatured(e.target.checked); dirty() }}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-amber-500"
                />
                <div>
                  <p className="text-sm font-medium">Featured product</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Pinned in your storefront's featured section.
                  </p>
                </div>
              </label>
            </CardContent>
          </Card>

          {/* Categories */}
          <CategoriesCard
            selected={selectedCats}
            onAdd={addCat}
            onRemove={removeCat}
          />

          {/* SEO */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-semibold">SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* URL slug */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  URL slug
                </Label>
                <div className="flex h-9 overflow-hidden rounded-lg border border-border">
                  <span className="flex shrink-0 items-center border-r border-border bg-muted px-3 text-xs text-muted-foreground">
                    /products/
                  </span>
                  <input
                    value={slug}
                    onChange={(e) => wrap(setSlug)(e.target.value)}
                    className="min-w-0 flex-1 bg-background px-3 text-sm outline-none"
                  />
                </div>
              </div>

              {/* Meta title */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Meta title
                  </Label>
                  <span className={cn("text-xs tabular-nums", metaTitle.length > 55 ? "text-amber-600" : "text-muted-foreground")}>
                    {metaTitle.length} / 60
                  </span>
                </div>
                <Input
                  value={metaTitle}
                  onChange={(e) => wrap(setMetaTitle)(e.target.value)}
                  className="h-9 text-sm"
                  placeholder="Page title for search engines"
                />
              </div>

              {/* Meta description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Meta description
                  </Label>
                  <span className={cn("text-xs tabular-nums", metaDesc.length > 145 ? "text-amber-600" : "text-muted-foreground")}>
                    {metaDesc.length} / 160
                  </span>
                </div>
                <textarea
                  value={metaDesc}
                  onChange={(e) => wrap(setMetaDesc)(e.target.value)}
                  rows={3}
                  maxLength={160}
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground transition-[border-color,box-shadow] focus:border-ring focus:ring-3 focus:ring-ring/50"
                  placeholder="Description for search results…"
                />
              </div>

              {/* SERP preview */}
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-0.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Preview</p>
                <p className="text-sm font-medium text-blue-600 truncate leading-snug">
                  {metaTitle || title || "Untitled"}
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-500">
                  yourstore.com/products/{slug || "product-slug"}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                  {metaDesc || shortDesc || "No description provided."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Sticky save bar ───────────────────────────────────────────────────── */}
      {isDirty && (
        <div className="sticky bottom-0 -mx-6 -mb-6 z-20 border-t border-border bg-background/95 px-6 py-3.5 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-muted-foreground">
              Unsaved changes
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setIsDirty(false)}
              >
                Discard
              </Button>
              <Button
                size="sm"
                className="h-8 bg-orange-700 px-4 text-white shadow-none hover:bg-orange-800"
                onClick={handleSave}
              >
                Save product
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

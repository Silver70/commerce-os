import * as React from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ChevronRightIcon,
  PencilIcon,
  ImageIcon,
  PlusIcon,
  AlertTriangleIcon,
} from "lucide-react"

import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Separator } from "~/components/ui/separator"
import {
  ProductStatusBadge,
  ProductThumbnail,
  formatPrice,
  type ProductStatus,
} from "~/routes/admin/products_/index"

export const Route = createFileRoute("/admin/products_/$productId")({
  component: ProductDetailPage,
})

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductVariant = {
  id: string
  label: string
  sku: string
  barcode: string
  price: number       // cents
  compareAt: number   // cents, 0 = none
  cost: number        // cents
  weight: number      // grams
  stock: number
  lowStockThreshold: number
  allowBackorder: boolean
  active: boolean
}

type OptionGroup = {
  id: string
  name: string
  values: string[]
}

type ProductImage = {
  id: string
  alt: string
  gradient: string
}

type ProductDetail = {
  id: string
  name: string
  slug: string
  status: ProductStatus
  description: string
  categories: string[]
  options: OptionGroup[]
  variants: ProductVariant[]
  images: ProductImage[]
  createdAt: string
  updatedAt: string
}

// ─── Fake Data ────────────────────────────────────────────────────────────────

const SEED_PRODUCT: ProductDetail = {
  id: "2",
  name: "Merino Wool Crewneck",
  slug: "merino-wool-crewneck",
  status: "active",
  description:
    "A classic crewneck sweater crafted from 100% superfine Merino wool. Naturally temperature-regulating, incredibly soft against the skin, and built to last season after season. Features a relaxed yet tailored fit with reinforced shoulder seams and a ribbed collar, cuffs, and hem.\n\nIdeal for layering or wearing solo. Machine washable on cold — lay flat to dry.",
  categories: ["Apparel"],
  options: [
    { id: "1", name: "Size",  values: ["S", "M", "L", "XL"] },
    { id: "2", name: "Color", values: ["Navy", "Stone", "Charcoal", "Rust"] },
  ],
  variants: [
    { id: "1",  label: "S / Navy",      sku: "MWC-S-NVY",  barcode: "012345678901", price: 8900, compareAt: 0,     cost: 3800, weight: 320, stock: 24, lowStockThreshold: 5,  allowBackorder: false, active: true  },
    { id: "2",  label: "S / Stone",     sku: "MWC-S-STN",  barcode: "012345678902", price: 8900, compareAt: 0,     cost: 3800, weight: 320, stock: 18, lowStockThreshold: 5,  allowBackorder: false, active: true  },
    { id: "3",  label: "S / Charcoal",  sku: "MWC-S-CHR",  barcode: "012345678903", price: 8900, compareAt: 0,     cost: 3800, weight: 320, stock: 3,  lowStockThreshold: 5,  allowBackorder: false, active: true  },
    { id: "4",  label: "S / Rust",      sku: "MWC-S-RST",  barcode: "012345678904", price: 8900, compareAt: 0,     cost: 3800, weight: 320, stock: 9,  lowStockThreshold: 5,  allowBackorder: false, active: true  },
    { id: "5",  label: "M / Navy",      sku: "MWC-M-NVY",  barcode: "012345678905", price: 8900, compareAt: 0,     cost: 3800, weight: 335, stock: 31, lowStockThreshold: 5,  allowBackorder: false, active: true  },
    { id: "6",  label: "M / Stone",     sku: "MWC-M-STN",  barcode: "012345678906", price: 8900, compareAt: 0,     cost: 3800, weight: 335, stock: 22, lowStockThreshold: 5,  allowBackorder: false, active: true  },
    { id: "7",  label: "M / Charcoal",  sku: "MWC-M-CHR",  barcode: "012345678907", price: 8900, compareAt: 0,     cost: 3800, weight: 335, stock: 0,  lowStockThreshold: 5,  allowBackorder: true,  active: true  },
    { id: "8",  label: "M / Rust",      sku: "MWC-M-RST",  barcode: "012345678908", price: 8900, compareAt: 0,     cost: 3800, weight: 335, stock: 14, lowStockThreshold: 5,  allowBackorder: false, active: true  },
    { id: "9",  label: "L / Navy",      sku: "MWC-L-NVY",  barcode: "012345678909", price: 9900, compareAt: 11900, cost: 4200, weight: 350, stock: 14, lowStockThreshold: 5,  allowBackorder: false, active: true  },
    { id: "10", label: "L / Stone",     sku: "MWC-L-STN",  barcode: "012345678910", price: 9900, compareAt: 11900, cost: 4200, weight: 350, stock: 4,  lowStockThreshold: 5,  allowBackorder: false, active: true  },
    { id: "11", label: "L / Charcoal",  sku: "MWC-L-CHR",  barcode: "012345678911", price: 9900, compareAt: 11900, cost: 4200, weight: 350, stock: 7,  lowStockThreshold: 5,  allowBackorder: false, active: true  },
    { id: "12", label: "L / Rust",      sku: "MWC-L-RST",  barcode: "012345678912", price: 9900, compareAt: 11900, cost: 4200, weight: 350, stock: 2,  lowStockThreshold: 5,  allowBackorder: false, active: true  },
    { id: "13", label: "XL / Navy",     sku: "MWC-XL-NVY", barcode: "012345678913", price: 9900, compareAt: 11900, cost: 4200, weight: 365, stock: 0,  lowStockThreshold: 3,  allowBackorder: false, active: false },
    { id: "14", label: "XL / Stone",    sku: "MWC-XL-STN", barcode: "012345678914", price: 9900, compareAt: 11900, cost: 4200, weight: 365, stock: 0,  lowStockThreshold: 3,  allowBackorder: false, active: false },
    { id: "15", label: "XL / Charcoal", sku: "MWC-XL-CHR", barcode: "012345678915", price: 9900, compareAt: 11900, cost: 4200, weight: 365, stock: 0,  lowStockThreshold: 3,  allowBackorder: false, active: false },
    { id: "16", label: "XL / Rust",     sku: "MWC-XL-RST", barcode: "012345678916", price: 9900, compareAt: 11900, cost: 4200, weight: 365, stock: 0,  lowStockThreshold: 3,  allowBackorder: true,  active: true  },
  ],
  images: [
    { id: "1", alt: "Front view — Navy",      gradient: "from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700"            },
    { id: "2", alt: "Front view — Stone",     gradient: "from-stone-200 to-stone-300 dark:from-stone-800 dark:to-stone-700"            },
    { id: "3", alt: "Back view — Navy",       gradient: "from-blue-100 to-blue-200 dark:from-blue-950/60 dark:to-blue-900/60"         },
    { id: "4", alt: "Detail — collar & cuff", gradient: "from-violet-100 to-violet-200 dark:from-violet-950/50 dark:to-violet-900/50" },
  ],
  createdAt: "Jan 3, 2025",
  updatedAt: "May 19, 2026",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type StockState = { dot: string; valueClass: string; label: string }

function stockState(v: ProductVariant): StockState {
  if (v.stock === 0 && v.allowBackorder)
    return { dot: "bg-amber-400",   valueClass: "text-amber-600 dark:text-amber-400",     label: "Backorder"    }
  if (v.stock === 0)
    return { dot: "bg-destructive", valueClass: "text-destructive",                       label: "Out of stock" }
  if (v.stock <= v.lowStockThreshold)
    return { dot: "bg-amber-400",   valueClass: "text-amber-600 dark:text-amber-400",     label: "Low"          }
  return   { dot: "bg-emerald-500", valueClass: "text-emerald-600 dark:text-emerald-400", label: "In stock"     }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MediaGallery({ images }: { images: ProductImage[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Media</CardTitle>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
            <PlusIcon className="h-3.5 w-3.5" />
            Add media
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3">
          {images.map((img, i) => (
            <div
              key={img.id}
              className={cn(
                "group relative aspect-square overflow-hidden rounded-lg border border-border/50 bg-gradient-to-br",
                img.gradient,
              )}
            >
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Cover
                </span>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                <ImageIcon className="h-5 w-5 text-foreground/30" />
              </div>
              <p className="absolute bottom-0 left-0 right-0 truncate bg-black/40 px-1.5 py-1 text-[10px] text-white/90">
                {img.alt}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function OptionsCard({ options }: { options: OptionGroup[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {options.map((group) => (
          <div key={group.id} className="flex items-start gap-3">
            <span className="w-16 shrink-0 pt-0.5 text-sm text-muted-foreground">{group.name}</span>
            <div className="flex flex-wrap gap-1.5">
              {group.values.map((v) => (
                <Badge key={v} variant="outline" className="px-2 py-0.5 text-xs font-normal">
                  {v}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function VariantsCard({ variants }: { variants: ProductVariant[] }) {
  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold">Variants</CardTitle>
          <Badge variant="secondary" className="text-xs font-normal">
            {variants.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0 pt-3">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/30">
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Variant</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">SKU</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Price</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Cost</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Stock</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {variants.map((v) => {
                const s = stockState(v)
                return (
                  <tr key={v.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{v.label}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{v.sku}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold tabular-nums">{formatPrice(v.price)}</span>
                      {v.compareAt > 0 && (
                        <span className="ml-1.5 text-xs text-muted-foreground line-through tabular-nums">
                          {formatPrice(v.compareAt)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground tabular-nums">
                      {formatPrice(v.cost)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", s.dot)} />
                        <span className={cn("tabular-nums", s.valueClass)}>
                          {v.stock > 0 ? v.stock : s.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          "px-1.5 py-0 text-[11px]",
                          v.active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400"
                            : "text-muted-foreground",
                        )}
                      >
                        {v.active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ProductDetailPage() {
  const product = SEED_PRODUCT

  const totalStock      = product.variants.reduce((sum, v) => sum + v.stock, 0)
  const lowStockCount   = product.variants.filter((v) => v.stock > 0 && v.stock <= v.lowStockThreshold).length
  const outOfStockCount = product.variants.filter((v) => v.stock === 0 && !v.allowBackorder).length
  const activeCount     = product.variants.filter((v) => v.active).length
  const onSaleCount     = product.variants.filter((v) => v.compareAt > 0).length
  const avgCost         = Math.round(product.variants.reduce((s, v) => s + v.cost, 0) / product.variants.length)

  const priceMin = Math.min(...product.variants.map((v) => v.price))
  const priceMax = Math.max(...product.variants.map((v) => v.price))
  const priceLabel = priceMin === priceMax
    ? formatPrice(priceMin)
    : `${formatPrice(priceMin)} – ${formatPrice(priceMax)}`

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <nav className="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/admin/products" className="transition-colors hover:text-foreground">
            Products
          </Link>
          <ChevronRightIcon className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{product.name}</span>
        </nav>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <ProductThumbnail name={product.name} categories={product.categories} />
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-semibold">{product.name}</h1>
                <ProductStatusBadge status={product.status} />
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {product.categories.join(", ")}
                {" · "}
                {product.variants.length} variants
                {" · "}
                {priceLabel}
              </p>
            </div>
          </div>
          <Button
            asChild
            className="gap-2 bg-orange-700 text-white shadow-none hover:bg-orange-800"
          >
            <Link to="/admin/products/new">
              <PencilIcon className="h-4 w-4" />
              Edit product
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">

          {/* Description */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Description</CardTitle>
            </CardHeader>
            <CardContent>
              {product.description ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
              ) : (
                <p className="text-sm italic text-muted-foreground/60">No description added.</p>
              )}
            </CardContent>
          </Card>

          {/* Media */}
          <MediaGallery images={product.images} />

          {/* Options */}
          <OptionsCard options={product.options} />

          {/* Variants */}
          <VariantsCard variants={product.variants} />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Product info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Product info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <ProductStatusBadge status={product.status} />
              </div>
              <Separator />
              <div className="flex items-start justify-between gap-2">
                <span className="shrink-0 text-muted-foreground">Slug</span>
                <span className="break-all text-right font-mono text-xs">{product.slug}</span>
              </div>
              <Separator />
              <div className="flex items-start justify-between gap-2">
                <span className="shrink-0 text-muted-foreground">Categories</span>
                <div className="flex flex-wrap justify-end gap-1">
                  {product.categories.map((c) => (
                    <Badge key={c} variant="secondary" className="text-xs font-normal">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{product.createdAt}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last updated</span>
                <span>{product.updatedAt}</span>
              </div>
            </CardContent>
          </Card>

          {/* Inventory */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total in stock</span>
                <span className="font-semibold tabular-nums">{totalStock.toLocaleString()}</span>
              </div>
              {lowStockCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Low stock</span>
                  <span className="flex items-center gap-1.5 font-medium tabular-nums text-amber-600 dark:text-amber-400">
                    <AlertTriangleIcon className="h-3.5 w-3.5" />
                    {lowStockCount} variant{lowStockCount !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
              {outOfStockCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Out of stock</span>
                  <span className="font-medium tabular-nums text-destructive">
                    {outOfStockCount} variant{outOfStockCount !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total variants</span>
                <span className="tabular-nums">{product.variants.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active</span>
                <span className="tabular-nums">{activeCount}</span>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Price range</span>
                <span className="font-semibold tabular-nums">{priceLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Avg. cost</span>
                <span className="tabular-nums text-muted-foreground">{formatPrice(avgCost)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">On sale</span>
                <span className="tabular-nums">
                  {onSaleCount > 0 ? `${onSaleCount} variant${onSaleCount !== 1 ? "s" : ""}` : "—"}
                </span>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}

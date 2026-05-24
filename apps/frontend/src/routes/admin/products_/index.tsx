import * as React from "react"
import { createFileRoute } from "@tanstack/react-router"
import { PlusIcon, EyeIcon } from "lucide-react"
import { Link } from "@tanstack/react-router"

import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import { DataTable, type DataTableColumn, type DataTableFilter } from "~/components/data-table"

export const Route = createFileRoute("/admin/products_/")({
  component: ProductsPage,
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductStatus = "active" | "draft" | "archived"

export type Product = {
  id: string
  name: string
  status: ProductStatus
  categories: string[]
  variantCount: number
  sku?: string            // only present when variantCount === 1
  priceRange: { min: number; max: number }  // in cents
  totalInventory: number
}

// ─── Fake Data ────────────────────────────────────────────────────────────────

const PRODUCTS: Product[] = [
  { id: "1",  name: "Classic Leather Wallet",               categories: ["Accessories"],           status: "active",   variantCount: 1, sku: "ACC-0012", priceRange: { min: 4999,  max: 4999  }, totalInventory: 142 },
  { id: "2",  name: "Merino Wool Crewneck",                 categories: ["Apparel"],               status: "active",   variantCount: 4,                  priceRange: { min: 8900,  max: 9900  }, totalInventory: 87  },
  { id: "3",  name: "Running Shorts Pro",                   categories: ["Sports"],                status: "active",   variantCount: 3,                  priceRange: { min: 3850,  max: 3850  }, totalInventory: 210 },
  { id: "4",  name: "Wireless Noise-Cancelling Headphones", categories: ["Electronics"],           status: "active",   variantCount: 2,                  priceRange: { min: 22900, max: 27900 }, totalInventory: 64  },
  { id: "5",  name: "Canvas Tote Bag",                      categories: ["Accessories"],           status: "active",   variantCount: 1, sku: "ACC-0045", priceRange: { min: 2400,  max: 2400  }, totalInventory: 385 },
  { id: "6",  name: "Slim Fit Chinos",                      categories: ["Apparel"],               status: "draft",    variantCount: 5,                  priceRange: { min: 6500,  max: 6500  }, totalInventory: 0   },
  { id: "7",  name: "Foam Yoga Mat",                        categories: ["Sports"],                status: "active",   variantCount: 1, sku: "SPT-0210", priceRange: { min: 4495,  max: 4495  }, totalInventory: 52  },
  { id: "8",  name: "USB-C Hub 7-in-1",                     categories: ["Electronics"],           status: "active",   variantCount: 1, sku: "ELC-0312", priceRange: { min: 5999,  max: 5999  }, totalInventory: 180 },
  { id: "9",  name: "Minimalist Desk Lamp",                 categories: ["Home & Living"],         status: "active",   variantCount: 3,                  priceRange: { min: 7900,  max: 9900  }, totalInventory: 29  },
  { id: "10", name: "Bamboo Cutting Board Set",             categories: ["Home & Living"],         status: "active",   variantCount: 1, sku: "HOM-0212", priceRange: { min: 3450,  max: 3450  }, totalInventory: 73  },
  { id: "11", name: "Retro Sunglasses",                     categories: ["Accessories"],           status: "active",   variantCount: 4,                  priceRange: { min: 2800,  max: 3200  }, totalInventory: 156 },
  { id: "12", name: "Organic Face Serum",                   categories: ["Beauty"],                status: "active",   variantCount: 2,                  priceRange: { min: 5400,  max: 7200  }, totalInventory: 98  },
  { id: "13", name: "Trail Running Shoes",                  categories: ["Footwear", "Sports"],    status: "draft",    variantCount: 6,                  priceRange: { min: 13500, max: 13500 }, totalInventory: 0   },
  { id: "14", name: "Leather Belt — Cognac",                categories: ["Accessories"],           status: "archived", variantCount: 3,                  priceRange: { min: 4200,  max: 4200  }, totalInventory: 0   },
  { id: "15", name: "Performance Polo Shirt",               categories: ["Apparel"],               status: "active",   variantCount: 5,                  priceRange: { min: 5500,  max: 5500  }, totalInventory: 114 },
  { id: "16", name: "Portable Bluetooth Speaker",           categories: ["Electronics"],           status: "active",   variantCount: 1, sku: "ELC-0678", priceRange: { min: 9900,  max: 9900  }, totalInventory: 41  },
  { id: "17", name: "Heavyweight Hoodie",                   categories: ["Apparel"],               status: "active",   variantCount: 4,                  priceRange: { min: 7200,  max: 7200  }, totalInventory: 230 },
  { id: "18", name: "Ceramic Pour-Over Set",                categories: ["Home & Living"],         status: "draft",    variantCount: 1, sku: "HOM-0305", priceRange: { min: 4800,  max: 4800  }, totalInventory: 0   },
  { id: "19", name: "Slip-On Leather Loafers",              categories: ["Footwear"],              status: "active",   variantCount: 5,                  priceRange: { min: 11800, max: 11800 }, totalInventory: 38  },
  { id: "20", name: "Vitamin C Brightening Cream",          categories: ["Beauty"],                status: "active",   variantCount: 1, sku: "BTY-0071", priceRange: { min: 3800,  max: 3800  }, totalInventory: 62  },
  { id: "21", name: "Stainless Steel Water Bottle",         categories: ["Sports"],                status: "active",   variantCount: 3,                  priceRange: { min: 2995,  max: 3495  }, totalInventory: 319 },
  { id: "22", name: "Quilted Down Jacket",                  categories: ["Apparel"],               status: "archived", variantCount: 4,                  priceRange: { min: 19500, max: 19500 }, totalInventory: 0   },
  { id: "23", name: "Mechanical Keyboard TKL",              categories: ["Electronics"],           status: "draft",    variantCount: 2,                  priceRange: { min: 14900, max: 16900 }, totalInventory: 0   },
  { id: "24", name: "Linen Throw Pillow Covers",            categories: ["Home & Living"],         status: "active",   variantCount: 1, sku: "HOM-0419", priceRange: { min: 2200,  max: 2200  }, totalInventory: 187 },
  { id: "25", name: "Classic White Sneakers",               categories: ["Footwear"],              status: "active",   variantCount: 4,                  priceRange: { min: 8900,  max: 8900  }, totalInventory: 92  },
]

// ─── Thumbnail ────────────────────────────────────────────────────────────────

export const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  "Electronics":   { bg: "bg-blue-50 dark:bg-blue-950/40",    text: "text-blue-600 dark:text-blue-400"    },
  "Apparel":       { bg: "bg-violet-50 dark:bg-violet-950/40", text: "text-violet-600 dark:text-violet-400" },
  "Footwear":      { bg: "bg-amber-50 dark:bg-amber-950/40",   text: "text-amber-600 dark:text-amber-400"   },
  "Accessories":   { bg: "bg-rose-50 dark:bg-rose-950/40",     text: "text-rose-600 dark:text-rose-400"     },
  "Home & Living": { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-600 dark:text-emerald-400" },
  "Sports":        { bg: "bg-orange-50 dark:bg-orange-950/40", text: "text-orange-600 dark:text-orange-400" },
  "Beauty":        { bg: "bg-pink-50 dark:bg-pink-950/40",     text: "text-pink-600 dark:text-pink-400"     },
}

export function ProductThumbnail({ name, categories }: { name: string; categories: string[] }) {
  const colors = CATEGORY_COLORS[categories[0]] ?? {
    bg: "bg-muted",
    text: "text-muted-foreground",
  }
  return (
    <div
      className={`flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-lg border border-border/50 ${colors.bg}`}
    >
      <span className={`text-sm font-bold ${colors.text}`}>{name[0]}</span>
    </div>
  )
}

export function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function PriceDisplay({ priceRange }: { priceRange: { min: number; max: number } }) {
  if (priceRange.min === priceRange.max) {
    return <span className="text-sm font-semibold tabular-nums">{formatPrice(priceRange.min)}</span>
  }
  return (
    <span className="text-sm font-semibold tabular-nums">
      {formatPrice(priceRange.min)}
      <span className="font-normal text-muted-foreground"> – </span>
      {formatPrice(priceRange.max)}
    </span>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

export const STATUS_STYLES: Record<ProductStatus, string> = {
  active:   "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400",
  draft:    "text-muted-foreground border-border bg-muted/40",
  archived: "text-destructive border-destructive/20 bg-destructive/10",
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return (
    <Badge
      variant="outline"
      className={`text-[11px] font-medium capitalize px-2 py-0 ${STATUS_STYLES[status]}`}
    >
      {status}
    </Badge>
  )
}

// ─── Column Definitions ───────────────────────────────────────────────────────

const COLUMNS: DataTableColumn<Product>[] = [
  {
    key: "product",
    header: "Product",
    render: (row) => (
      <div className="flex items-center gap-3">
        <ProductThumbnail name={row.name} categories={row.categories} />
        <div className="min-w-0">
          <p className="text-sm font-medium leading-none">{row.name}</p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {row.variantCount === 1 && row.sku
              ? row.sku
              : `${row.variantCount} variants`}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    className: "w-28",
    render: (row) => <ProductStatusBadge status={row.status} />,
  },
  {
    key: "inventory",
    header: "Inventory",
    align: "center",
    className: "w-28",
    render: (row) => (
      <span
        className={`text-sm tabular-nums ${
          row.totalInventory === 0 ? "text-muted-foreground" : ""
        }`}
      >
        {row.totalInventory === 0 ? "—" : row.totalInventory.toLocaleString()}
      </span>
    ),
  },
  {
    key: "price",
    header: "Price",
    align: "right",
    className: "w-36",
    render: (row) => <PriceDisplay priceRange={row.priceRange} />,
  },
  {
    key: "view",
    header: "View details",
    align: "center",
    className: "w-28 pl-8",
    render: (row) => (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        asChild
      >
        <Link to="/admin/products/$productId" params={{ productId: row.id }}>
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
      { label: "Draft",    value: "draft"    },
      { label: "Archived", value: "archived" },
    ],
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

function ProductsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage your product catalog, pricing, and availability.
          </p>
        </div>
      </div>

      <DataTable
        data={PRODUCTS}
        columns={COLUMNS}
        rowKey={(row) => row.id}
        filters={FILTERS}
        pageSize={10}
        action={
          <Button className="gap-2 bg-orange-700 px-5 py-2.5 text-white shadow-none hover:bg-orange-800" asChild>
            <Link to="/admin/products/new">
              <PlusIcon className="h-4 w-4" />
              Add product
            </Link>
          </Button>
        }
        emptyMessage="No products match your filters."
      />
    </div>
  )
}

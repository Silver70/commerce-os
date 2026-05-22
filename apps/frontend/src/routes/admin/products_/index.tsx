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

type ProductStatus = "active" | "draft" | "archived"

type Product = {
  id: string
  name: string
  sku: string
  category: string
  status: ProductStatus
  inventory: number
  price: number
}

// ─── Fake Data ────────────────────────────────────────────────────────────────

const PRODUCTS: Product[] = [
  { id: "1",  name: "Classic Leather Wallet",            sku: "ACC-0012", category: "Accessories",  status: "active",   inventory: 142, price: 49.99  },
  { id: "2",  name: "Merino Wool Crewneck",              sku: "APP-0231", category: "Apparel",      status: "active",   inventory: 87,  price: 89.00  },
  { id: "3",  name: "Running Shorts Pro",                sku: "SPT-0088", category: "Sports",       status: "active",   inventory: 210, price: 38.50  },
  { id: "4",  name: "Wireless Noise-Cancelling Headphones", sku: "ELC-0501", category: "Electronics", status: "active", inventory: 64,  price: 229.00 },
  { id: "5",  name: "Canvas Tote Bag",                   sku: "ACC-0045", category: "Accessories",  status: "active",   inventory: 385, price: 24.00  },
  { id: "6",  name: "Slim Fit Chinos",                   sku: "APP-0102", category: "Apparel",      status: "draft",    inventory: 0,   price: 65.00  },
  { id: "7",  name: "Foam Yoga Mat",                     sku: "SPT-0210", category: "Sports",       status: "active",   inventory: 52,  price: 44.95  },
  { id: "8",  name: "USB-C Hub 7-in-1",                  sku: "ELC-0312", category: "Electronics",  status: "active",   inventory: 180, price: 59.99  },
  { id: "9",  name: "Minimalist Desk Lamp",              sku: "HOM-0076", category: "Home & Living", status: "active",  inventory: 29,  price: 79.00  },
  { id: "10", name: "Bamboo Cutting Board Set",          sku: "HOM-0212", category: "Home & Living", status: "active",  inventory: 73,  price: 34.50  },
  { id: "11", name: "Retro Sunglasses",                  sku: "ACC-0090", category: "Accessories",  status: "active",   inventory: 156, price: 28.00  },
  { id: "12", name: "Organic Face Serum",                sku: "BTY-0033", category: "Beauty",       status: "active",   inventory: 98,  price: 54.00  },
  { id: "13", name: "Trail Running Shoes",               sku: "FTW-0441", category: "Footwear",     status: "draft",    inventory: 0,   price: 135.00 },
  { id: "14", name: "Leather Belt — Cognac",             sku: "ACC-0023", category: "Accessories",  status: "archived", inventory: 0,   price: 42.00  },
  { id: "15", name: "Performance Polo Shirt",            sku: "APP-0318", category: "Apparel",      status: "active",   inventory: 114, price: 55.00  },
  { id: "16", name: "Portable Bluetooth Speaker",        sku: "ELC-0678", category: "Electronics",  status: "active",   inventory: 41,  price: 99.00  },
  { id: "17", name: "Heavyweight Hoodie",                sku: "APP-0407", category: "Apparel",      status: "active",   inventory: 230, price: 72.00  },
  { id: "18", name: "Ceramic Pour-Over Set",             sku: "HOM-0305", category: "Home & Living", status: "draft",   inventory: 0,   price: 48.00  },
  { id: "19", name: "Slip-On Leather Loafers",           sku: "FTW-0112", category: "Footwear",     status: "active",   inventory: 38,  price: 118.00 },
  { id: "20", name: "Vitamin C Brightening Cream",       sku: "BTY-0071", category: "Beauty",       status: "active",   inventory: 62,  price: 38.00  },
  { id: "21", name: "Stainless Steel Water Bottle",      sku: "SPT-0330", category: "Sports",       status: "active",   inventory: 319, price: 29.95  },
  { id: "22", name: "Quilted Down Jacket",               sku: "APP-0552", category: "Apparel",      status: "archived", inventory: 0,   price: 195.00 },
  { id: "23", name: "Mechanical Keyboard TKL",           sku: "ELC-0890", category: "Electronics",  status: "draft",    inventory: 0,   price: 149.00 },
  { id: "24", name: "Linen Throw Pillow Covers",         sku: "HOM-0419", category: "Home & Living", status: "active",  inventory: 187, price: 22.00  },
  { id: "25", name: "Classic White Sneakers",            sku: "FTW-0203", category: "Footwear",     status: "active",   inventory: 92,  price: 89.00  },
]

// ─── Thumbnail ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  "Electronics":   { bg: "bg-blue-50 dark:bg-blue-950/40",    text: "text-blue-600 dark:text-blue-400"    },
  "Apparel":       { bg: "bg-violet-50 dark:bg-violet-950/40", text: "text-violet-600 dark:text-violet-400" },
  "Footwear":      { bg: "bg-amber-50 dark:bg-amber-950/40",   text: "text-amber-600 dark:text-amber-400"   },
  "Accessories":   { bg: "bg-rose-50 dark:bg-rose-950/40",     text: "text-rose-600 dark:text-rose-400"     },
  "Home & Living": { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-600 dark:text-emerald-400" },
  "Sports":        { bg: "bg-orange-50 dark:bg-orange-950/40", text: "text-orange-600 dark:text-orange-400" },
  "Beauty":        { bg: "bg-pink-50 dark:bg-pink-950/40",     text: "text-pink-600 dark:text-pink-400"     },
}

function ProductThumbnail({ name, category }: { name: string; category: string }) {
  const colors = CATEGORY_COLORS[category] ?? {
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

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<ProductStatus, string> = {
  active:   "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400",
  draft:    "text-muted-foreground border-border bg-muted/40",
  archived: "text-destructive border-destructive/20 bg-destructive/10",
}

function StatusBadge({ status }: { status: ProductStatus }) {
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
        <ProductThumbnail name={row.name} category={row.category} />
        <div className="min-w-0">
          <p className="text-sm font-medium leading-none">{row.name}</p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{row.sku}</p>
        </div>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    className: "w-28",
    render: (row) => <StatusBadge status={row.status} />,
  },
  {
    key: "inventory",
    header: "Inventory",
    align: "center",
    className: "w-28",
    render: (row) => (
      <span
        className={`text-sm tabular-nums ${
          row.inventory === 0 ? "text-muted-foreground" : ""
        }`}
      >
        {row.inventory === 0 ? "—" : row.inventory.toLocaleString()}
      </span>
    ),
  },
  {
    key: "price",
    header: "Price",
    align: "right",
    className: "w-24",
    render: (row) => (
      <span className="text-sm font-semibold tabular-nums">
        ${row.price.toFixed(2)}
      </span>
    ),
  },
  {
    key: "view",
    header: "View details",
    align: "center",
    className: "w-28 pl-8",
    render: () => (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
      >
        <EyeIcon className="h-4 w-4" />
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

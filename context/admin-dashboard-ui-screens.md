# Admin Dashboard — UI Screens Specification

**Companion to:** Headless Commerce Engine MVP PRD
**Tech Stack:** Next.js (App Router) + shadcn/ui + TanStack Table + React Hook Form + Zod
**Auth:** WorkOS AuthKit (hosted login, org-scoped sessions)
**Date:** May 2026

---

## 1. Global Layout & Navigation

### 1.1 Shell Layout

Every authenticated page shares the same shell:

```
┌──────────────────────────────────────────────────────────┐
│  TOPBAR                                                  │
│  ┌────────┐                              ┌─────────────┐│
│  │ Logo / │    [Search ____________]     │ Org Switcher ││
│  │ Brand  │                              │ User Avatar  ││
│  └────────┘                              └─────────────┘│
├────────────┬─────────────────────────────────────────────┤
│            │                                             │
│  SIDEBAR   │             MAIN CONTENT                    │
│            │                                             │
│  Dashboard │  ┌─────────────────────────────────────┐    │
│  ─────────── │  Page Header                         │    │
│  Products  │ │  Title + description + primary CTA   │    │
│  Inventory │ └─────────────────────────────────────┘    │
│  Orders    │                                             │
│  Customers │  ┌─────────────────────────────────────┐    │
│  Discounts │  │                                     │    │
│  ─────────── │  Page Content                        │    │
│  Shipping  │ │                                     │    │
│  Settings  │ │                                     │    │
│            │ └─────────────────────────────────────┘    │
│            │                                             │
└────────────┴─────────────────────────────────────────────┘
```

**Topbar (64px height)**
- Left: Logo/brand mark (links to Dashboard). On mobile, hamburger menu toggle.
- Center: Global search — command-palette style (`Cmd+K` / `Ctrl+K` shortcut). Searches across orders (by number/email), products (by name/SKU), and customers (by name/email). Results grouped by type with keyboard navigation.
- Right: Organization switcher dropdown (shows current org name, list of orgs user belongs to, "Create new store" link for super_admin). User avatar with dropdown menu (profile, preferences, sign out).

**Sidebar (240px width, collapsible to 64px icons-only)**
- Navigation grouped into sections with subtle dividers (no section headers — the grouping is visual).
- Primary group: Dashboard, Products, Inventory, Orders, Customers, Discounts.
- Secondary group: Shipping, Settings.
- Each item: icon + label. Active state: background highlight + left border accent.
- Collapse/expand toggle at bottom of sidebar (persists preference to localStorage).
- On mobile (below 768px): sidebar becomes an overlay drawer triggered by topbar hamburger.
- Badge counts on relevant items: Orders (pending count), Inventory (low-stock count).

### 1.2 Page Header Pattern

Every page follows the same header structure:

```
┌─────────────────────────────────────────────────────────┐
│  Breadcrumbs (if nested: Settings > Tax Rates)          │
│                                                         │
│  Page Title                              [Primary CTA]  │
│  Optional subtitle / description                        │
└─────────────────────────────────────────────────────────┘
```

- Title: `text-2xl font-semibold`
- Primary CTA: right-aligned button (e.g. "Add product", "Create discount")
- Breadcrumbs: shown only on nested pages (product detail, order detail, settings sub-pages)

### 1.3 Role-Based Navigation Visibility

Not all sidebar items are visible to all roles. Items the user doesn't have access to are hidden entirely (not greyed out).

| Sidebar Item | super_admin | product_manager | support_agent |
|-------------|------------|----------------|--------------|
| Dashboard | ✓ | ✓ | ✓ |
| Products | ✓ | ✓ | ✓ (read-only) |
| Inventory | ✓ | ✓ | ✓ (read-only) |
| Orders | ✓ | ✓ (read-only) | ✓ |
| Customers | ✓ | ✓ (read-only) | ✓ |
| Discounts | ✓ | ✓ | Hidden |
| Shipping | ✓ | Hidden | Hidden |
| Settings | ✓ | Hidden | Hidden |

### 1.4 Notifications & Toasts

- **Toast notifications** (bottom-right, auto-dismiss after 5s): success messages (product saved, order updated), error messages (failed to refund, stock adjustment error).
- **No persistent notification center for MVP.** Low-stock and pending orders are visible on the dashboard home. Real-time notifications are post-MVP.

---

## 2. Auth Screens

### 2.1 Login Screen

Not built by us — this is WorkOS AuthKit's hosted login page. Customizable with brand colors and logo through the WorkOS dashboard.

WorkOS AuthKit provides: email/password form, Google OAuth button, Microsoft OAuth button, "Forgot password" flow, email verification. We configure, not build.

### 2.2 Organization Picker

**When shown:** After WorkOS login, if the user belongs to multiple organizations. If only one org, skip straight to dashboard.

```
┌─────────────────────────────────────────┐
│                                         │
│           [Logo]                        │
│                                         │
│     Choose a store to manage            │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  🏪  Acme Surf Shop              │  │
│  │      acme-surf.mycommerce.com    │  │
│  │      Role: Super Admin           │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  🏪  Island Bikes MV             │  │
│  │      island-bikes.mycommerce.com │  │
│  │      Role: Product Manager       │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  +  Create a new store           │  │
│  └───────────────────────────────────┘  │
│                                         │
│            [Sign out]                   │
│                                         │
└─────────────────────────────────────────┘
```

- Each org card shows: store name, slug/domain, user's role in that org.
- Clicking a card sets the active org session cookie and redirects to `/dashboard`.
- "Create a new store" only visible if user has an account-level flag allowing store creation (or always visible in MVP — tenant provisioning flow handles the rest).
- "Sign out" link at the bottom clears the WorkOS session.

### 2.3 Onboarding (New Tenant Setup)

**When shown:** After "Create a new store" is clicked from org picker, or for first-time users with no orgs.

**Step 1 — Store Details**
```
┌─────────────────────────────────────────┐
│                                         │
│     Set up your store                   │
│     Step 1 of 3                         │
│                                         │
│  Store name *                           │
│  [________________________]             │
│                                         │
│  Store URL slug *                       │
│  [________________________]             │
│  yourstore.mycommerce.com               │
│                                         │
│  Default currency *                     │
│  [USD - US Dollar          ▼]           │
│                                         │
│  Timezone *                             │
│  [UTC                      ▼]           │
│                                         │
│                        [Continue →]     │
│                                         │
└─────────────────────────────────────────┘
```

**Step 2 — Shipping Basics**
```
┌─────────────────────────────────────────┐
│                                         │
│     Where do you ship?                  │
│     Step 2 of 3                         │
│                                         │
│  Shipping country/region *              │
│  [Country multiselect         ▼]        │
│                                         │
│  Default shipping rate *                │
│  [_______] USD flat rate                │
│                                         │
│  Free shipping above (optional)         │
│  [_______] USD                          │
│                                         │
│               [← Back]  [Continue →]    │
│                                         │
└─────────────────────────────────────────┘
```

**Step 3 — Done**
```
┌─────────────────────────────────────────┐
│                                         │
│     ✓  Your store is ready!             │
│                                         │
│  We've set up the basics. You can       │
│  change any of these in Settings later. │
│                                         │
│  Your API key for storefronts:          │
│  ┌─────────────────────────────────┐    │
│  │ sk_live_a8f3...  [Copy] [Show] │    │
│  └─────────────────────────────────┘    │
│  ⚠ Save this — it won't be shown again │
│                                         │
│  What would you like to do first?       │
│                                         │
│  [Add your first product]               │
│  [Go to dashboard]                      │
│                                         │
└─────────────────────────────────────────┘
```

Behind the scenes: Step 1 creates the WorkOS Organization + DB tenant record. Step 2 creates default shipping zone + method. Step 3 generates the first API key.

---

## 3. Dashboard Home

**Route:** `/dashboard`
**Access:** All roles

```
┌─────────────────────────────────────────────────────────┐
│  Dashboard                                              │
│  Welcome back. Here's what's happening with your store. │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────┐ │
│  │ Today's    │ │ Today's    │ │ Pending    │ │ Low  │ │
│  │ Orders     │ │ Revenue    │ │ Orders     │ │Stock │ │
│  │            │ │            │ │            │ │Items │ │
│  │    12      │ │  $1,847    │ │     3      │ │   5  │ │
│  │  +20% ↑   │ │  +8% ↑    │ │            │ │      │ │
│  └────────────┘ └────────────┘ └────────────┘ └──────┘ │
│                                                         │
│  ┌────────────────────────────┬──────────────────────┐  │
│  │  Recent Orders             │  Activity Feed       │  │
│  │                            │                      │  │
│  │  ORD-20260513-0012         │  Jane updated        │  │
│  │  john@email.com            │  product "Wave       │  │
│  │  $149.99 • Paid            │  Board Pro"          │  │
│  │  2 min ago                 │  12 min ago          │  │
│  │                            │                      │  │
│  │  ORD-20260513-0011         │  System: Low stock   │  │
│  │  sara@email.com            │  alert — "Blue       │  │
│  │  $89.50 • Processing      │  Rashguard M" (3     │  │
│  │  34 min ago                │  remaining)          │  │
│  │                            │  45 min ago          │  │
│  │  ORD-20260513-0010         │                      │  │
│  │  guest@email.com           │  You issued a        │  │
│  │  $234.00 • Shipped        │  refund of $49.99    │  │
│  │  1 hr ago                  │  on ORD-...0008      │  │
│  │                            │  2 hrs ago           │  │
│  │  [View all orders →]       │  [View all →]        │  │
│  └────────────────────────────┴──────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Stat Cards (top row)**
- Today's Orders: count, percentage change vs yesterday.
- Today's Revenue: sum of captured payments today, percentage change vs yesterday.
- Pending Orders: count of orders in `pending` or `processing` status. Clickable → navigates to orders list filtered by pending.
- Low Stock Items: count of inventory items below threshold. Clickable → navigates to inventory low-stock view.
- All values scoped to current tenant. Percentages compared to same day last week (not yesterday) if yesterday was atypical — but MVP can use simple yesterday comparison.

**Recent Orders (left column)**
- Last 5 orders, most recent first.
- Each row: order number, customer email, total (formatted), status badge, relative time.
- Clicking a row navigates to the order detail page.
- "View all orders" link at bottom.

**Activity Feed (right column)**
- Last 10 audit log entries, human-readable.
- Each entry: actor name ("Jane", "System", "You"), action description, relative time.
- Entries sourced from `audit_logs` table, filtered to current tenant.
- "View all" links to the audit log page.

---

## 4. Products

### 4.1 Product List

**Route:** `/products`
**Access:** All roles can view. super_admin + product_manager can create/edit/delete.

```
┌─────────────────────────────────────────────────────────┐
│  Products                                [+ Add product]│
│  Manage your product catalog                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Search products_____________]                         │
│                                                         │
│  Filters: [Status ▼] [Category ▼]    Showing 48 of 127 │
│                                                         │
│  ☐ │ Image │ Name          │ Status │ Inventory│ Price  │
│  ──┼───────┼───────────────┼────────┼──────────┼────────│
│  ☐ │ 🖼    │ Wave Board Pro│ Active │ 24 in    │ $149   │
│    │       │ 3 variants    │        │ stock    │ .99    │
│  ──┼───────┼───────────────┼────────┼──────────┼────────│
│  ☐ │ 🖼    │ Blue Rashguard│ Active │ ⚠ 3 low │ $49    │
│    │       │ 6 variants    │        │ stock    │ .99    │
│  ──┼───────┼───────────────┼────────┼──────────┼────────│
│  ☐ │ 🖼    │ Reef Sandals  │ Draft  │ 0        │ $29    │
│    │       │ 4 variants    │        │          │ .99    │
│  ──┼───────┼───────────────┼────────┼──────────┼────────│
│                                                         │
│  Bulk actions (when rows selected):                     │
│  [Set Active] [Archive] [Delete]                        │
│                                                         │
│  ← 1 2 3 ... 6 →                                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Table columns:**
- Checkbox: for bulk selection.
- Image: primary product image thumbnail (48x48, rounded corners). Placeholder icon if no image.
- Name: product name (bold, clickable link to detail), variant count below in muted text.
- Status: badge — Active (green), Draft (yellow), Archived (gray).
- Inventory: total stock across all variants. Shows "⚠ X low stock" in amber if any variant is below threshold. Shows "Out of stock" in red if all variants are zero.
- Price: price range if variants have different prices ("$29.99 – $49.99"), single price if uniform.

**Interactions:**
- Search: filters by product name, SKU (debounced, 300ms).
- Status filter: dropdown with All, Active, Draft, Archived.
- Category filter: dropdown populated from tenant's category tree (nested display with indentation).
- Sorting: click column headers (Name A-Z/Z-A, Price low-high/high-low, newest/oldest).
- Bulk actions appear in a sticky bar at bottom when 1+ rows selected.
- Row click navigates to product edit page. Clicking the checkbox does NOT navigate.
- Pagination: 25 items per page, cursor-based.

### 4.2 Product Create / Edit

**Route:** `/products/new` (create) or `/products/:id` (edit)
**Access:** super_admin, product_manager

This is the most complex form in the admin. It's organized into sections with a sticky save bar.

```
┌─────────────────────────────────────────────────────────┐
│  ← Products / Add product                    [Save] [▼]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────┬────────────────────┐  │
│  │  LEFT COLUMN (65%)           │ RIGHT COLUMN (35%) │  │
│  │                              │                    │  │
│  │  ┌────────────────────────┐  │ ┌────────────────┐ │  │
│  │  │ BASIC INFORMATION      │  │ │ STATUS         │ │  │
│  │  │                        │  │ │                │ │  │
│  │  │ Title *                │  │ │ [Draft    ▼]   │ │  │
│  │  │ [___________________]  │  │ │                │ │  │
│  │  │                        │  │ │ ☐ Featured     │ │  │
│  │  │ Description            │  │ │   product      │ │  │
│  │  │ ┌──────────────────┐   │  │ └────────────────┘ │  │
│  │  │ │ Rich text editor │   │  │                    │  │
│  │  │ │ B I U | H1 H2 |  │   │  │ ┌────────────────┐ │  │
│  │  │ │ • | 1. | link   │   │  │ │ CATEGORIES     │ │  │
│  │  │ │                  │   │  │ │                │ │  │
│  │  │ │                  │   │  │ │ ☐ Surfboards   │ │  │
│  │  │ └──────────────────┘   │  │ │   ☐ Shortboard│ │  │
│  │  │                        │  │ │   ☐ Longboard │ │  │
│  │  │ Short description      │  │ │ ☐ Apparel     │ │  │
│  │  │ [___________________]  │  │ │   ☐ Rashguards│ │  │
│  │  │ (max 500 chars)        │  │ │   ☐ Wetsuits  │ │  │
│  │  └────────────────────────┘  │ │                │ │  │
│  │                              │ └────────────────┘ │  │
│  │  ┌────────────────────────┐  │                    │  │
│  │  │ MEDIA                  │  │ ┌────────────────┐ │  │
│  │  │                        │  │ │ SEO            │ │  │
│  │  │ ┌────┐ ┌────┐ ┌────┐  │  │ │                │ │  │
│  │  │ │ 🖼 │ │ 🖼 │ │ +  │  │  │ │ URL slug       │ │  │
│  │  │ │    │ │    │ │ Add│  │  │ │ [wave-board-  │ │  │
│  │  │ └────┘ └────┘ └────┘  │  │ │  pro]          │ │  │
│  │  │ Drag to reorder.      │  │ │                │ │  │
│  │  │ First image = primary. │  │ │ Meta title     │ │  │
│  │  └────────────────────────┘  │ │ [____________]│ │  │
│  │                              │ │                │ │  │
│  │  ┌────────────────────────┐  │ │ Meta desc      │ │  │
│  │  │ OPTIONS + VARIANTS     │  │ │ [____________]│ │  │
│  │  │ (see 4.3 below)       │  │ └────────────────┘ │  │
│  │  └────────────────────────┘  │                    │  │
│  └──────────────────────────────┴────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────────┐│
│  │  STICKY SAVE BAR (bottom of viewport)               ││
│  │  Unsaved changes                     [Discard] [Save]││
│  └──────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

**Left Column (65% width)**

- **Basic Information**: Title (required, auto-generates slug), Description (rich text editor with basic formatting — bold, italic, headings, lists, links), Short description (plain text, character counter).
- **Media**: drag-and-drop upload zone. Shows thumbnails in a grid. Drag to reorder — first image is the primary product image. Click thumbnail to view full size or delete. Supported formats: JPEG, PNG, WebP. Max file size: 5MB per image. Upload goes to S3/R2, URL stored in `product_media` table.
- **Options + Variants**: detailed in section 4.3 below.

**Right Column (35% width)**

- **Status**: dropdown (Draft, Active, Archived). "Featured product" checkbox.
- **Categories**: tree of checkboxes matching the tenant's category hierarchy. Multiple categories can be selected.
- **SEO**: URL slug (auto-generated from title, editable). Meta title and description (for storefronts to use in `<head>`).

**Save behavior:**
- Sticky bar appears at bottom when form has unsaved changes.
- "Save" button: validates with Zod, submits via REST, shows toast on success/failure.
- Save dropdown (▼): "Save and continue editing", "Save and go back to list".
- Navigation guard: if user tries to leave with unsaved changes, confirm dialog.

### 4.3 Variant Editor (within Product Create/Edit)

The variant system is the most complex UI component. It has two states: defining options, and managing the generated variant table.

**State 1: Defining Options (before variants exist)**

```
┌──────────────────────────────────────────────────────┐
│  OPTIONS + VARIANTS                                  │
│                                                      │
│  This product has multiple options (like size or     │
│  color).                                             │
│                                                      │
│  Option 1                                            │
│  Name: [Size        ▼]    Values: [S] [M] [L] [XL]  │
│  (or type custom)          [+ Add value]             │
│                                                      │
│  Option 2                                            │
│  Name: [Color       ▼]    Values: [Red] [Blue]       │
│  (or type custom)          [+ Add value]             │
│                                                      │
│  [+ Add another option]    (max 3 options)           │
│                                                      │
│  This will generate 8 variants (4 sizes × 2 colors) │
│                                                      │
│  [Generate variants]                                 │
│                                                      │
└──────────────────────────────────────────────────────┘
```

- Option name: dropdown with common presets (Size, Color, Material, Style) or free-text input.
- Values: tag-style input. Type a value and press Enter to add. Click X on tag to remove.
- Max 3 options per product (Size × Color × Material = manageable). More than 3 creates too many combinations.
- Preview count: "This will generate N variants" updates live as you add options/values.
- "Generate variants" button creates all combinations and transitions to State 2.

**State 2: Managing Generated Variants**

```
┌──────────────────────────────────────────────────────────┐
│  VARIANTS (8 total)                                      │
│                                                          │
│  [Expand all] [Collapse all]        [Bulk edit prices]   │
│                                                          │
│  ┌──────────────────────────────────────────────────────┐│
│  │ Variant │ SKU          │ Price  │ Stock │ Active │ ▼ ││
│  │─────────┼──────────────┼────────┼───────┼────────┼───││
│  │ S / Red │ WAVE-S-RED   │ $149.99│  12   │  ✓     │ ⋮ ││
│  │ S / Blue│ WAVE-S-BLUE  │ $149.99│   8   │  ✓     │ ⋮ ││
│  │ M / Red │ WAVE-M-RED   │ $149.99│  15   │  ✓     │ ⋮ ││
│  │ M / Blue│ WAVE-M-BLUE  │ $149.99│  20   │  ✓     │ ⋮ ││
│  │ L / Red │ WAVE-L-RED   │ $159.99│   6   │  ✓     │ ⋮ ││
│  │ L / Blue│ WAVE-L-BLUE  │ $159.99│   4   │  ✓     │ ⋮ ││
│  │ XL/ Red │ WAVE-XL-RED  │ $169.99│   2   │  ☐     │ ⋮ ││
│  │ XL/ Blue│ WAVE-XL-BLUE │ $169.99│   0   │  ☐     │ ⋮ ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  Clicking a variant row expands it:                      │
│  ┌──────────────────────────────────────────────────────┐│
│  │ ▼ S / Red                                           ││
│  │                                                      ││
│  │  SKU *            Price *          Compare-at price  ││
│  │  [WAVE-S-RED ]    [$149.99]        [$___.__]         ││
│  │                                                      ││
│  │  Cost price       Weight (g)       Barcode           ││
│  │  [$75.00   ]      [350     ]       [__________]      ││
│  │                                                      ││
│  │  Stock quantity    Low stock threshold                ││
│  │  [12      ]        [5       ]                        ││
│  │                                                      ││
│  │  ☐ Allow backorder                                   ││
│  │                                                      ││
│  │  Variant images (optional — falls back to product):  ││
│  │  [+ Add images]                                      ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- Compact table view by default. Each row shows: variant name (option values joined), SKU (auto-generated from product slug + option values, editable), price, stock, active toggle.
- Click a row to expand inline detail form: all variant fields (SKU, price, compare-at price, cost price, weight, barcode, stock quantity, low stock threshold, allow backorder, variant-specific images).
- "Bulk edit prices" opens a modal to set price across all variants, or by option value (e.g. "all XL variants = $169.99").
- SKU auto-generation: `{PRODUCT_SLUG}-{OPTION1}-{OPTION2}`, uppercase. Editable per variant.
- ⋮ overflow menu per row: "Edit", "Duplicate", "Delete variant".
- Adding a new option value after variants exist: prompts "This will add X new variants. Continue?"

### 4.4 Category Management

**Route:** `/products/categories`
**Access:** super_admin, product_manager

```
┌─────────────────────────────────────────────────────────┐
│  ← Products / Categories                [+ Add category]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ▶ Surfboards (12 products)              [⋮]     │   │
│  │   ├── Shortboards (5 products)          [⋮]     │   │
│  │   ├── Longboards (4 products)           [⋮]     │   │
│  │   └── Bodyboards (3 products)           [⋮]     │   │
│  │                                                  │   │
│  │ ▶ Apparel (34 products)                 [⋮]     │   │
│  │   ├── Rashguards (15 products)          [⋮]     │   │
│  │   ├── Wetsuits (12 products)            [⋮]     │   │
│  │   └── Board Shorts (7 products)         [⋮]     │   │
│  │                                                  │   │
│  │ ▶ Accessories (18 products)             [⋮]     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- Tree view with expand/collapse. Product counts per category.
- Drag-and-drop to reorder within a level or move between parents.
- ⋮ menu: Edit, Add subcategory, Delete (with confirmation — reassign or orphan products).
- Add/Edit opens an inline form or a side sheet: name, slug, description, parent category selector.

---

## 5. Inventory

### 5.1 Inventory List

**Route:** `/inventory`
**Access:** All roles can view. super_admin + product_manager can adjust.

```
┌─────────────────────────────────────────────────────────┐
│  Inventory                                              │
│  Track and manage stock levels                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Search by SKU or product name____]                    │
│                                                         │
│  Tabs: [All SKUs] [Low Stock (5)] [Out of Stock (2)]    │
│                                                         │
│  SKU          │ Product        │ Available │ Reserved │  │
│  ─────────────┼────────────────┼───────────┼──────────│  │
│  WAVE-S-RED   │ Wave Board Pro │    12     │    2     │  │
│               │ S / Red        │           │          │  │
│  ─────────────┼────────────────┼───────────┼──────────│  │
│  RASH-M-BLUE  │ Blue Rashguard │  ⚠ 3     │    0     │  │
│               │ M / Blue       │           │          │  │
│  ─────────────┼────────────────┼───────────┼──────────│  │
│  SAND-L-BLK   │ Reef Sandals   │  🔴 0    │    0     │  │
│               │ L / Black      │           │          │  │
│  ─────────────┼────────────────┼───────────┼──────────│  │
│                                                         │
│  Click a row to adjust stock:                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Adjust stock: WAVE-S-RED (Wave Board Pro S/Red)  │   │
│  │                                                  │   │
│  │ Current: 12    Reserved: 2    Available: 10      │   │
│  │                                                  │   │
│  │ Adjustment:  [+] [-]  [______]                   │   │
│  │                                                  │   │
│  │ Reason *                                         │   │
│  │ [Restock / Damage / Correction / Other  ▼]       │   │
│  │                                                  │   │
│  │ Notes (optional)                                 │   │
│  │ [________________________________]               │   │
│  │                                                  │   │
│  │                           [Cancel] [Adjust stock]│   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- Tabs filter the view: All, Low Stock (below threshold, amber), Out of Stock (zero, red).
- Badge counts on tabs update in real-time.
- Available = quantity - reserved. Reserved shows active checkout reservations.
- Click row → inline expansion or modal for stock adjustment.
- Adjustment form: +/- toggle, quantity input, required reason dropdown (Restock, Damage/Loss, Correction, Return, Other), optional free-text notes.
- All adjustments logged to audit trail with actor, reason, old/new values.

---

## 6. Orders

### 6.1 Order List

**Route:** `/orders`
**Access:** All roles can view. super_admin + support_agent can update status.

```
┌─────────────────────────────────────────────────────────┐
│  Orders                                                 │
│  Manage and fulfill customer orders                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Search by order # or email_____]                      │
│                                                         │
│  Filters: [Status ▼] [Payment ▼] [Date range 📅]       │
│                                                         │
│  Tabs: [All] [Pending (3)] [Processing (2)] [Shipped]   │
│                                                         │
│  Order        │ Customer       │ Date    │ Total │Status│
│  ─────────────┼────────────────┼─────────┼───────┼──────│
│  ORD-0512-012 │ john@email.com │ Today   │$149.99│ Paid │
│               │                │ 2:34 PM │       │      │
│  ─────────────┼────────────────┼─────────┼───────┼──────│
│  ORD-0512-011 │ sara@email.com │ Today   │ $89.50│ Pro- │
│               │                │ 1:15 PM │       │cess. │
│  ─────────────┼────────────────┼─────────┼───────┼──────│
│  ORD-0512-010 │ guest@e.com    │ Today   │$234.00│Ship- │
│               │                │11:02 AM │       │ ped  │
│  ─────────────┼────────────────┼─────────┼───────┼──────│
│                                                         │
│  ← 1 2 3 ... 12 →                                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- Status badges: Pending (yellow), Paid (green), Processing (blue), Shipped (purple), Delivered (gray), Cancelled (red), Refunded (red outline).
- Date range picker: preset options (Today, Last 7 days, Last 30 days, Custom range).
- Clicking a row navigates to order detail.

### 6.2 Order Detail

**Route:** `/orders/:id`
**Access:** All roles can view. Actions restricted by role.

This is a two-column layout with order information on the left and a timeline + actions on the right.

```
┌─────────────────────────────────────────────────────────┐
│  ← Orders / ORD-20260512-0012                           │
│  Placed May 12, 2026 at 2:34 PM                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────┬───────────────────────┐  │
│  │  LEFT COLUMN (60%)        │ RIGHT COLUMN (40%)    │  │
│  │                           │                       │  │
│  │  ┌─────────────────────┐  │ ┌───────────────────┐ │  │
│  │  │ STATUS               │  │ │ ACTIONS           │ │  │
│  │  │                      │  │ │                   │ │  │
│  │  │ Order: [Paid      ▼] │  │ │ [Mark processing] │ │  │
│  │  │ Payment: Captured    │  │ │ [Create shipment] │ │  │
│  │  │ Fulfillment: Unfulf. │  │ │ [Issue refund]    │ │  │
│  │  └─────────────────────┘  │ └───────────────────┘ │  │
│  │                           │                       │  │
│  │  ┌─────────────────────┐  │ ┌───────────────────┐ │  │
│  │  │ LINE ITEMS           │  │ │ TIMELINE          │ │  │
│  │  │                      │  │ │                   │ │  │
│  │  │ 🖼 Wave Board Pro    │  │ │ ● Order placed    │ │  │
│  │  │    S / Red           │  │ │   May 12, 2:34 PM │ │  │
│  │  │    SKU: WAVE-S-RED   │  │ │                   │ │  │
│  │  │    1 × $149.99       │  │ │ ● Payment         │ │  │
│  │  │                      │  │ │   captured $149.99│ │  │
│  │  │ ───────────────────  │  │ │   May 12, 2:35 PM │ │  │
│  │  │ Subtotal:   $149.99  │  │ │   via Stripe      │ │  │
│  │  │ Shipping:    $10.00  │  │ │                   │ │  │
│  │  │ Tax:          $12.00 │  │ │ ● Status changed  │ │  │
│  │  │ Discount:    −$0.00  │  │ │   pending → paid  │ │  │
│  │  │ ═══════════════════  │  │ │   System          │ │  │
│  │  │ TOTAL:      $171.99  │  │ │   May 12, 2:35 PM │ │  │
│  │  └─────────────────────┘  │ │                   │ │  │
│  │                           │ │ [+ Add note]      │ │  │
│  │  ┌─────────────────────┐  │ └───────────────────┘ │  │
│  │  │ CUSTOMER             │  │                       │  │
│  │  │ John Smith           │  │ ┌───────────────────┐ │  │
│  │  │ john@email.com       │  │ │ PAYMENT           │ │  │
│  │  │ [View profile →]     │  │ │                   │ │  │
│  │  └─────────────────────┘  │ │ Stripe             │ │  │
│  │                           │ │ pi_3abc...xyz      │ │  │
│  │  ┌─────────────────────┐  │ │ Status: Captured   │ │  │
│  │  │ SHIPPING ADDRESS     │  │ │ Amount: $171.99   │ │  │
│  │  │ John Smith           │  │ └───────────────────┘ │  │
│  │  │ 123 Beach Road       │  │                       │  │
│  │  │ Malé, MV 20001       │  │                       │  │
│  │  └─────────────────────┘  │                       │  │
│  │                           │                       │  │
│  │  ┌─────────────────────┐  │                       │  │
│  │  │ BILLING ADDRESS      │  │                       │  │
│  │  │ (same as shipping)   │  │                       │  │
│  │  └─────────────────────┘  │                       │  │
│  │                           │                       │  │
│  └───────────────────────────┴───────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Left Column**

- **Status card**: Order status (dropdown to change — validates allowed transitions), payment status (read-only), fulfillment status (read-only).
- **Line items**: each item shows thumbnail (snapshot), product name, variant name, SKU, quantity × price, line total. Pricing breakdown below: subtotal, shipping, tax, discount, total.
- **Customer card**: name, email, link to customer profile.
- **Addresses**: shipping and billing addresses (from order snapshot, not live customer data). "Same as shipping" if identical.

**Right Column**

- **Actions card**: contextual buttons based on current state. Only shows valid next actions.
  - Paid → "Mark as processing"
  - Processing → "Create shipment" (opens shipment form)
  - Any (except pending) → "Issue refund" (opens refund modal)
  - Pending → "Cancel order"
- **Timeline**: chronological list of all events from `order_timeline` table. Each entry: dot indicator (color-coded by type), title, description, actor, timestamp. "Add note" button at bottom opens inline text input for internal notes (not visible to customer).
- **Payment card**: provider (Stripe), payment intent ID (truncated, copyable), status, amount.

**Refund Modal:**

```
┌──────────────────────────────────────────────┐
│  Issue Refund                                │
│                                              │
│  Order: ORD-20260512-0012                    │
│  Total paid: $171.99                         │
│                                              │
│  Refund amount *                             │
│  [$171.99     ]   [Full refund ▼]            │
│                                              │
│  Reason                                      │
│  [Customer request / Defective / Other  ▼]   │
│                                              │
│  ☑ Restock items                             │
│                                              │
│  Note (optional)                             │
│  [________________________________]          │
│                                              │
│  ⚠ This will refund $171.99 to the          │
│    customer's original payment method        │
│    via Stripe. This action cannot be undone. │
│                                              │
│                     [Cancel] [Issue refund]   │
│                                              │
└──────────────────────────────────────────────┘
```

**Shipment Form (inline expansion or modal):**

```
┌──────────────────────────────────────────────┐
│  Create Shipment                             │
│                                              │
│  Carrier *                                   │
│  [DHL / FedEx / UPS / Other       ▼]        │
│                                              │
│  Tracking number *                           │
│  [________________________________]          │
│                                              │
│  ☑ Notify customer by email                  │
│                                              │
│                 [Cancel] [Create shipment]    │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 7. Customers

### 7.1 Customer List

**Route:** `/customers`
**Access:** All roles can view. super_admin + support_agent can edit.

```
┌─────────────────────────────────────────────────────────┐
│  Customers                                              │
│  View and manage customer accounts                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Search by name or email_____________]                 │
│                                                         │
│  Filters: [Status ▼]      Sort: [Total spent ▼]        │
│                                                         │
│  Name          │ Email          │ Orders │ Total  │ Sta │
│  ──────────────┼────────────────┼────────┼────────┼─────│
│  John Smith    │ john@email.com │   8    │ $1,247 │ Act │
│  ──────────────┼────────────────┼────────┼────────┼─────│
│  Sara Johnson  │ sara@email.com │   3    │   $268 │ Act │
│  ──────────────┼────────────────┼────────┼────────┼─────│
│  Guest         │ guest@temp.com │   1    │    $89 │ Act │
│  ──────────────┼────────────────┼────────┼────────┼─────│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 7.2 Customer Detail

**Route:** `/customers/:id`

```
┌─────────────────────────────────────────────────────────┐
│  ← Customers / John Smith                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────┬───────────────────────┐  │
│  │  PROFILE                  │ STATS                 │  │
│  │                           │                       │  │
│  │  Name: John Smith         │ Total orders: 8       │  │
│  │  Email: john@email.com    │ Total spent: $1,247   │  │
│  │  Phone: +960 773-1234     │ Avg order: $155.88    │  │
│  │  Status: [Active     ▼]   │ Customer since:       │  │
│  │  Marketing: ☑ Opted in    │ Jan 15, 2026          │  │
│  │  Last login: May 11, 2026 │                       │  │
│  └───────────────────────────┴───────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  ADDRESSES                            [+ Add]    │   │
│  │                                                  │   │
│  │  🏠 Home (default shipping + billing)            │   │
│  │  123 Beach Road, Malé, MV 20001                  │   │
│  │  [Edit] [Remove]                                 │   │
│  │                                                  │   │
│  │  🏢 Office                                       │   │
│  │  45 Business Ave, Malé, MV 20002                 │   │
│  │  [Edit] [Remove] [Set as default]                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  ORDER HISTORY                                   │   │
│  │                                                  │   │
│  │  ORD-0512-012 │ May 12 │ $149.99 │ Paid         │   │
│  │  ORD-0505-009 │ May 5  │ $234.00 │ Delivered    │   │
│  │  ORD-0428-007 │ Apr 28 │  $89.50 │ Delivered    │   │
│  │  ... (show last 10, "View all" link)             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- Status dropdown: Active, Suspended, Banned. Changing to Suspended/Banned prevents customer login.
- Order history: last 10 orders inline, each clickable to navigate to order detail.
- Addresses: list with edit/remove/set-as-default actions.

---

## 8. Discounts & Coupons

### 8.1 Discount List

**Route:** `/discounts`
**Access:** super_admin, product_manager

```
┌─────────────────────────────────────────────────────────┐
│  Discounts & Coupons                   [+ Create discount]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Tabs: [Active (4)] [Scheduled (1)] [Expired (12)]      │
│                                                         │
│  Name          │ Type  │ Value │ Scope   │ Usage │Status│
│  ──────────────┼───────┼───────┼─────────┼───────┼──────│
│  Summer Sale   │ %     │ 20%   │ All     │ 45/100│Active│
│  2 coupons     │       │       │ orders  │       │      │
│  ──────────────┼───────┼───────┼─────────┼───────┼──────│
│  Rashguard     │ Fixed │ $10   │ Category│ 12/∞  │Active│
│  Deal          │       │       │ Apparel │       │      │
│  1 coupon      │       │       │         │       │      │
│  ──────────────┼───────┼───────┼─────────┼───────┼──────│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 8.2 Discount Create / Edit

**Route:** `/discounts/new` or `/discounts/:id`

```
┌─────────────────────────────────────────────────────────┐
│  ← Discounts / Create discount              [Save]      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  DISCOUNT DETAILS                                │   │
│  │                                                  │   │
│  │  Internal name *                                 │   │
│  │  [Summer Sale 2026________]                      │   │
│  │                                                  │   │
│  │  Discount type *                                 │   │
│  │  (●) Percentage    ( ) Fixed amount              │   │
│  │                                                  │   │
│  │  Value *                                         │   │
│  │  [20    ] %                                      │   │
│  │                                                  │   │
│  │  Applies to *                                    │   │
│  │  (●) Entire order                                │   │
│  │  ( ) Specific category  [Select category  ▼]     │   │
│  │  ( ) Specific product   [Search product   ▼]     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  CONDITIONS                                      │   │
│  │                                                  │   │
│  │  Minimum purchase amount (optional)              │   │
│  │  [$50.00        ]                                │   │
│  │                                                  │   │
│  │  Active period *                                 │   │
│  │  Start: [2026-06-01  📅]  End: [2026-08-31  📅]  │   │
│  │                         or ☐ No end date         │   │
│  │                                                  │   │
│  │  Usage limit (optional)                          │   │
│  │  [100     ] total uses   (leave empty = unlimited)│  │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  COUPON CODES                        [+ Add code]│   │
│  │                                                  │   │
│  │  Code          │ Max uses │ Per customer │ Used  │   │
│  │  ──────────────┼──────────┼─────────────┼───────│   │
│  │  SUMMER20      │   50     │      1       │  23   │   │
│  │  VIP2026       │   ∞      │      1       │  22   │   │
│  │                                                  │   │
│  │  Generate code:                                  │   │
│  │  Code: [__________] or [Auto-generate]           │   │
│  │  Max uses: [___] Per customer: [1__]             │   │
│  │                              [Add coupon code]   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- Discount type: radio buttons (Percentage / Fixed amount). Value input adapts (shows % or $ prefix).
- Scope: radio buttons. Selecting "Specific category" or "Specific product" reveals a searchable dropdown.
- Coupon codes section: table of codes linked to this discount. "Add code" form inline at bottom. Auto-generate creates a random alphanumeric code (e.g. `SUMMER-A8F3`).

---

## 9. Shipping

**Route:** `/shipping`
**Access:** super_admin only

```
┌─────────────────────────────────────────────────────────┐
│  Shipping                                 [+ Add zone]  │
│  Configure shipping zones and rates                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  ▼ Domestic (Maldives)                    [Edit] │   │
│  │    Countries: MV                                 │   │
│  │                                                  │   │
│  │    Methods:                        [+ Add method]│   │
│  │    ┌────────────────────────────────────────────┐│   │
│  │    │ Standard Shipping  │ Flat $5.00 │ Active  ││   │
│  │    │ 3-5 days           │            │ [Edit]  ││   │
│  │    ├────────────────────┼────────────┼─────────┤│   │
│  │    │ Express Shipping   │ Flat $15.00│ Active  ││   │
│  │    │ 1-2 days           │            │ [Edit]  ││   │
│  │    ├────────────────────┼────────────┼─────────┤│   │
│  │    │ Free Shipping      │ $0.00      │ Active  ││   │
│  │    │ Orders over $100   │ min: $100  │ [Edit]  ││   │
│  │    └────────────────────────────────────────────┘│   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  ▶ Asia (collapsed)                       [Edit] │   │
│  │    Countries: SG, MY, TH, IN, LK + 3 more       │   │
│  │    2 methods                                     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- Zones displayed as collapsible cards. Each zone shows its countries and methods.
- Zone edit: side sheet with name input and country multiselect (searchable, with region shortcuts like "Select all Asia").
- Method edit: side sheet with name, description, type (flat rate for MVP), price, minimum order amount for free shipping, estimated delivery days range, active toggle.

---

## 10. Settings

**Route:** `/settings` (with sub-routes)
**Access:** super_admin only

Settings is organized into sub-pages accessible via a secondary nav within the settings area.

```
┌─────────────────────────────────────────────────────────┐
│  Settings                                               │
├────────────┬────────────────────────────────────────────┤
│            │                                            │
│  SETTINGS  │  (content of selected sub-page)            │
│  NAV       │                                            │
│            │                                            │
│  General   │                                            │
│  Team      │                                            │
│  API Keys  │                                            │
│  Tax Rates │                                            │
│  Audit Log │                                            │
│            │                                            │
└────────────┴────────────────────────────────────────────┘
```

### 10.1 General Settings

**Route:** `/settings/general`

```
┌──────────────────────────────────────────────────────┐
│  General                                     [Save]  │
│                                                      │
│  STORE INFORMATION                                   │
│                                                      │
│  Store name *                                        │
│  [Acme Surf Shop__________]                          │
│                                                      │
│  Store URL slug                                      │
│  [acme-surf] .mycommerce.com    (read-only for MVP)  │
│                                                      │
│  Default currency *                                  │
│  [USD - US Dollar          ▼]                        │
│                                                      │
│  Timezone *                                          │
│  [Indian/Maldives (UTC+5)  ▼]                        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 10.2 Team Management

**Route:** `/settings/team`

```
┌──────────────────────────────────────────────────────┐
│  Team                                [+ Invite member]│
│                                                      │
│  Name          │ Email          │ Role       │       │
│  ──────────────┼────────────────┼────────────┼───────│
│  Silver (you)  │ silver@e.com   │ Super Admin│       │
│  ──────────────┼────────────────┼────────────┼───────│
│  Jane Park     │ jane@e.com     │ Product Mgr│ [⋮]  │
│  ──────────────┼────────────────┼────────────┼───────│
│  Ali Hassan    │ ali@e.com      │ Support    │ [⋮]  │
│  ──────────────┼────────────────┼────────────┼───────│
│                                                      │
│  Pending invitations:                                │
│  ┌──────────────────────────────────────────────────┐│
│  │ mark@email.com │ Product Manager │ Sent May 10  ││
│  │                               [Resend] [Revoke] ││
│  └──────────────────────────────────────────────────┘│
│                                                      │
└──────────────────────────────────────────────────────┘
```

- ⋮ menu: Change role, Remove from team.
- "Invite member" opens a modal: email input + role selector. Sends invitation through WorkOS.
- Current user's row is marked "(you)" and cannot be removed or demoted.
- Pending invitations section shows sent but unaccepted invites with resend/revoke options.

### 10.3 API Keys

**Route:** `/settings/api-keys`

```
┌──────────────────────────────────────────────────────┐
│  API Keys                            [+ Generate key] │
│                                                      │
│  Name             │ Key         │ Last used │        │
│  ─────────────────┼─────────────┼───────────┼────────│
│  Next.js Store    │ sk_live_a8f3│ 2 min ago │ [⋮]   │
│  ─────────────────┼─────────────┼───────────┼────────│
│  Mobile App       │ sk_live_b2e1│ Never     │ [⋮]   │
│  ─────────────────┼─────────────┼───────────┼────────│
│                                                      │
│  ⚠ API keys grant access to your store data.        │
│  Only share them with trusted applications.          │
│                                                      │
└──────────────────────────────────────────────────────┘
```

- "Generate key" modal: name input → generates key → shows full key ONCE with copy button and warning that it won't be shown again.
- Table shows key prefix only (first 8 chars + "...").
- ⋮ menu: Rename, Revoke (with confirmation dialog — "This will immediately break any application using this key").

### 10.4 Tax Rates

**Route:** `/settings/tax-rates`

```
┌──────────────────────────────────────────────────────┐
│  Tax Rates                              [+ Add rate]  │
│                                                      │
│  Name         │ Rate  │ Region    │ Type    │        │
│  ─────────────┼───────┼───────────┼─────────┼────────│
│  GST          │ 6.00% │ MV        │ Excl.   │ [Edit] │
│  ─────────────┼───────┼───────────┼─────────┼────────│
│  US Sales Tax │ 7.25% │ US - CA   │ Excl.   │ [Edit] │
│  ─────────────┼───────┼───────────┼─────────┼────────│
│  UK VAT       │20.00% │ GB        │ Incl.   │ [Edit] │
│  ─────────────┼───────┼───────────┼─────────┼────────│
│                                                      │
└──────────────────────────────────────────────────────┘
```

- Add/Edit opens a side sheet: name, rate (percentage input), country (dropdown), state/province (conditional — shown for US), type (exclusive/inclusive radio), active toggle.

### 10.5 Audit Log

**Route:** `/settings/audit-log`

```
┌──────────────────────────────────────────────────────┐
│  Audit Log                                           │
│                                                      │
│  Filters: [Entity ▼] [Actor ▼] [Date range 📅]       │
│                                                      │
│  Time        │ Actor     │ Action                    │
│  ────────────┼───────────┼──────────────────────────│
│  May 12      │ Jane Park │ Updated product           │
│  2:15 PM     │           │ "Wave Board Pro"          │
│              │           │ price: $139.99 → $149.99  │
│  ────────────┼───────────┼──────────────────────────│
│  May 12      │ Silver    │ Issued refund $49.99      │
│  1:30 PM     │           │ on ORD-20260510-0008      │
│  ────────────┼───────────┼──────────────────────────│
│  May 12      │ System    │ Stock adjusted            │
│  11:00 AM    │           │ RASH-M-BLUE: 10 → 3      │
│              │           │ Reason: Damage            │
│  ────────────┼───────────┼──────────────────────────│
│                                                      │
│  Click a row to view full change details:            │
│  ┌──────────────────────────────────────────────┐    │
│  │ Changes:                                     │    │
│  │ {                                            │    │
│  │   "price": {                                 │    │
│  │     "old": 13999,                            │    │
│  │     "new": 14999                             │    │
│  │   }                                          │    │
│  │ }                                            │    │
│  │                                              │    │
│  │ IP: 203.0.113.42                             │    │
│  │ User Agent: Mozilla/5.0 ...                  │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

- Entity filter: Products, Orders, Customers, Inventory, Discounts, Settings.
- Actor filter: list of team members + "System".
- Date range: preset options + custom range picker.
- Row expansion shows the raw JSON diff of changes, IP address, and user agent.
- product_manager and support_agent only see their own actions (filtered by actor_id = current user).

---

## 11. Empty States & Loading

Every list page has a designed empty state — not just blank white space.

**Products (no products yet):**
```
┌──────────────────────────────────────────────┐
│                                              │
│           📦                                 │
│                                              │
│     No products yet                          │
│                                              │
│     Add your first product to start          │
│     building your catalog.                   │
│                                              │
│     [+ Add your first product]               │
│                                              │
└──────────────────────────────────────────────┘
```

**Orders (no orders yet):**
```
┌──────────────────────────────────────────────┐
│                                              │
│           🧾                                 │
│                                              │
│     No orders yet                            │
│                                              │
│     When customers place orders through      │
│     your storefront, they'll appear here.    │
│                                              │
│     Make sure your storefront is connected   │
│     with an API key. [Go to API keys →]      │
│                                              │
└──────────────────────────────────────────────┘
```

**Loading states:**
- Tables: skeleton rows (animated pulse) matching the table column layout. 5 skeleton rows.
- Cards/stats: skeleton rectangles matching card dimensions.
- Detail pages: skeleton blocks matching the layout structure.
- Never show a spinner alone. Always show the page structure with skeleton placeholders.

**Error states:**
- API errors on list pages: "Something went wrong loading products. [Try again]" with retry button.
- 404 (entity not found): "This product doesn't exist or was deleted. [Back to products]".
- 403 (no permission): "You don't have permission to view this page. Contact your store admin."

---

## 12. Responsive Behavior

The admin dashboard targets desktop-first but must be functional on tablets.

| Breakpoint | Behavior |
|-----------|----------|
| Desktop (1280px+) | Full two-column layouts, expanded sidebar, all features visible |
| Tablet (768px–1279px) | Sidebar collapses to icons-only by default. Two-column layouts stack to single column on product edit and order detail. Tables become horizontally scrollable. |
| Mobile (below 768px) | Sidebar becomes overlay drawer. All layouts single-column. Tables show condensed columns (hide less important ones). Not the primary target — functional but not optimized. |

---

## 13. Screen Inventory (Summary)

Total unique screens/views in the admin dashboard:

| # | Screen | Route | Primary Role |
|---|--------|-------|-------------|
| 1 | Org Picker | `/org-select` | All |
| 2 | Onboarding (3 steps) | `/onboarding` | super_admin |
| 3 | Dashboard Home | `/dashboard` | All |
| 4 | Product List | `/products` | All |
| 5 | Product Create | `/products/new` | super_admin, product_manager |
| 6 | Product Edit | `/products/:id` | super_admin, product_manager |
| 7 | Category Management | `/products/categories` | super_admin, product_manager |
| 8 | Inventory List | `/inventory` | All |
| 9 | Order List | `/orders` | All |
| 10 | Order Detail | `/orders/:id` | All |
| 11 | Customer List | `/customers` | All |
| 12 | Customer Detail | `/customers/:id` | All |
| 13 | Discount List | `/discounts` | super_admin, product_manager |
| 14 | Discount Create/Edit | `/discounts/new` or `/discounts/:id` | super_admin, product_manager |
| 15 | Shipping Zones | `/shipping` | super_admin |
| 16 | General Settings | `/settings/general` | super_admin |
| 17 | Team Management | `/settings/team` | super_admin |
| 18 | API Keys | `/settings/api-keys` | super_admin |
| 19 | Tax Rates | `/settings/tax-rates` | super_admin |
| 20 | Audit Log | `/settings/audit-log` | super_admin (all), others (own) |

**Modals / Sheets (not standalone pages):**
- Stock adjustment modal (from Inventory)
- Refund modal (from Order Detail)
- Shipment creation form (from Order Detail)
- Invite team member modal (from Team)
- Generate API key modal (from API Keys)
- Add/Edit tax rate sheet (from Tax Rates)
- Add/Edit shipping method sheet (from Shipping)
- Add/Edit category sheet (from Categories)
- Coupon code form (inline on Discount Create/Edit)
- Bulk edit variant prices modal (from Product Edit)

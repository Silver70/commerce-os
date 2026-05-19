import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
} from "lucide-react"

import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { Card } from "~/components/ui/card"

// ─── Public Types ─────────────────────────────────────────────────────────────

export type DataTableColumn<T> = {
  key: string
  header: string
  align?: "left" | "center" | "right"
  className?: string
  render: (row: T) => React.ReactNode
}

export type DataTableFilter = {
  key: string
  placeholder: string
  options: { label: string; value: string }[]
}

export interface DataTableProps<T extends object> {
  data: T[]
  columns: DataTableColumn<T>[]
  rowKey?: (row: T) => string
  filters?: DataTableFilter[]
  pageSize?: number
  action?: React.ReactNode
  emptyMessage?: string
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

const ALIGN: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
}

const CLEAR = "__all__"

function buildPageList(page: number, totalPages: number): (number | "…")[] {
  const visible = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  )
  const result: (number | "…")[] = []
  visible.forEach((p, i) => {
    if (i > 0 && p - visible[i - 1] > 1) result.push("…")
    result.push(p)
  })
  return result
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DataTable<T extends object>({
  data,
  columns,
  rowKey,
  filters = [],
  pageSize = 10,
  action,
  emptyMessage = "No results.",
}: DataTableProps<T>) {
  const [activeFilters, setActiveFilters] = React.useState<Record<string, string>>({})
  const [page, setPage] = React.useState(1)

  const filtered = React.useMemo(
    () =>
      data.filter((row) =>
        filters.every(({ key }) => {
          const v = activeFilters[key]
          return !v || String((row as Record<string, unknown>)[key] ?? "") === v
        }),
      ),
    [data, activeFilters, filters],
  )

  React.useEffect(() => {
    setPage(1)
  }, [activeFilters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize)
  const pageNumbers = React.useMemo(() => buildPageList(page, totalPages), [page, totalPages])

  const hasActive = Object.values(activeFilters).some(Boolean)

  function setFilter(key: string, value: string) {
    setActiveFilters((prev) => ({ ...prev, [key]: value }))
  }

  function clearFilter(key: string) {
    setActiveFilters((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function clearAll() {
    setActiveFilters({})
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter selects */}
          {filters.map((f) => (
            <Select
              key={f.key}
              value={activeFilters[f.key] ?? CLEAR}
              onValueChange={(v) =>
                v === CLEAR ? clearFilter(f.key) : setFilter(f.key, v)
              }
            >
              <SelectTrigger className="h-9 w-40 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CLEAR}>{f.placeholder}</SelectItem>
                {f.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}

          {/* Reset button */}
          {hasActive && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={clearAll}
            >
              <XIcon className="mr-1 h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      {/* Table card */}
      <Card className="overflow-hidden py-0 gap-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                {columns.map((col, i) => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      "py-3 text-sm font-medium whitespace-nowrap",
                      ALIGN[col.align ?? "left"],
                      i === 0 && "pl-5",
                      i === columns.length - 1 && "pr-5",
                      col.className,
                    )}
                  >
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-sm text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                pageData.map((row, ri) => (
                  <TableRow
                    key={rowKey ? rowKey(row) : ri}
                    className="transition-colors hover:bg-muted/30"
                  >
                    {columns.map((col, ci) => (
                      <TableCell
                        key={col.key}
                        className={cn(
                          "py-3",
                          ALIGN[col.align ?? "left"],
                          ci === 0 && "pl-5",
                          ci === columns.length - 1 && "pr-5",
                          col.className,
                        )}
                      >
                        {col.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Footer: count + pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filtered.length === 0
            ? "No results"
            : totalPages === 1
              ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`
              : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)} of ${filtered.length}`}
        </span>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>

            {pageNumbers.map((p, i) =>
              p === "…" ? (
                <span key={`el-${i}`} className="px-1 text-xs">
                  …
                </span>
              ) : (
                <Button
                  key={p}
                  variant={page === p ? "default" : "outline"}
                  size="icon"
                  className={cn(
                    "h-8 w-8 text-xs",
                    page === p &&
                      "border-amber-500 bg-amber-500 text-white shadow-none hover:bg-amber-600",
                  )}
                  onClick={() => setPage(p as number)}
                >
                  {p}
                </Button>
              ),
            )}

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

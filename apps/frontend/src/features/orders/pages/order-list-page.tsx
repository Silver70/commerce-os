import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { EyeIcon, PlusIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFilter,
} from "~/components/data-table";
import { formatMoney } from "~/lib/money";
import type { Order, OrdersResponse } from "~/types/api";
import { ordersQueryOptions } from "../queries";
import { getOrdersServerFn } from "../server";
import { OrderStatusBadge } from "../components/order-status-badge";

const COLUMNS: DataTableColumn<Order>[] = [
  {
    key: "order",
    header: "Order",
    render: (row) => (
      <div>
        <p className="font-mono text-sm font-semibold">{row.orderNumber}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {new Date(row.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    ),
  },
  {
    key: "customer",
    header: "Customer",
    render: (row) => (
      <div>
        <p className="text-sm font-medium">{row.customerName}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {row.customerEmail}
        </p>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    className: "w-28",
    render: (row) => <OrderStatusBadge status={row.status} />,
  },
  {
    key: "items",
    header: "Items",
    align: "center",
    className: "w-20",
    render: (row) => (
      <span className="text-sm tabular-nums text-muted-foreground">
        {row.lineItems?.length ?? "—"}
      </span>
    ),
  },
  {
    key: "total",
    header: "Total",
    align: "right",
    className: "w-28",
    render: (row) => (
      <span className="text-sm font-semibold tabular-nums">
        {formatMoney(row.total, row.currency)}
      </span>
    ),
  },
  {
    key: "view",
    header: "",
    align: "center",
    className: "w-14 pl-6",
    render: (row) => (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        asChild
      >
        <Link to="/admin/orders/$orderId" params={{ orderId: row.id }}>
          <EyeIcon className="h-4 w-4" />
        </Link>
      </Button>
    ),
  },
];

const FILTERS: DataTableFilter[] = [
  {
    key: "status",
    placeholder: "All statuses",
    options: [
      { label: "Pending", value: "pending" },
      { label: "Paid", value: "paid" },
      { label: "Processing", value: "processing" },
      { label: "Shipped", value: "shipped" },
      { label: "Delivered", value: "delivered" },
      { label: "Cancelled", value: "cancelled" },
      { label: "Refunded", value: "refunded" },
    ],
  },
];

export function OrderListPage() {
  const page: OrdersResponse = useSuspenseQuery(ordersQueryOptions()).data;
  const [items, setItems] = React.useState<Order[]>(page.orders);
  const [nextCursor, setNextCursor] = React.useState<string | null>(
    page.nextCursor,
  );
  const [loadingMore, setLoadingMore] = React.useState(false);

  React.useEffect(() => {
    setItems(page.orders);
    setNextCursor(page.nextCursor);
  }, [page]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const more = await getOrdersServerFn({ data: { cursor: nextCursor } });
      setItems((prev) => [...prev, ...more.orders]);
      setNextCursor(more.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="text-sm text-muted-foreground">
          Manage and fulfill customer orders.
        </p>
      </div>

      <DataTable
        data={items}
        columns={COLUMNS}
        rowKey={(row) => row.id}
        filters={FILTERS}
        pageSize={25}
        emptyMessage="No orders match your filters."
        action={
          <Button
            className="gap-2 px-5 py-2.5"
            asChild
          >
            <Link to="/admin/orders/new">
              <PlusIcon className="h-4 w-4" />
              Create order
            </Link>
          </Button>
        }
      />

      {nextCursor && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}

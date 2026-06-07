import { useSuspenseQuery } from "@tanstack/react-query";
import { formatMoney } from "~/lib/money";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type { OrdersResponse, OrderStatus } from "~/types/api";
import { ordersQueryOptions } from "~/features/orders/queries";

// Dashboard uses its own status palette, intentionally distinct from the
// orders feature's OrderStatusBadge.
const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "text-muted-foreground border-border bg-muted/40",
  paid: "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900",
  processing:
    "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900",
  shipped:
    "text-violet-600 border-violet-200 bg-violet-50 dark:bg-violet-950/20 dark:border-violet-900",
  delivered:
    "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900",
  refunded: "text-destructive border-destructive/20 bg-destructive/10",
  cancelled: "text-destructive border-destructive/30 bg-transparent",
};

export function RecentOrders() {
  const data: OrdersResponse = useSuspenseQuery(ordersQueryOptions({})).data;
  const orders = data.orders.slice(0, 7);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
        <CardDescription className="text-xs">
          Latest orders across all channels
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 px-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="pl-6 text-xs font-medium">Order</TableHead>
              <TableHead className="text-xs font-medium">Customer</TableHead>
              <TableHead className="text-xs font-medium">Date</TableHead>
              <TableHead className="text-xs font-medium">Status</TableHead>
              <TableHead className="text-xs font-medium text-right pr-6">
                Total
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id} className="group">
                <TableCell className="pl-6 text-sm font-mono font-medium text-muted-foreground">
                  {order.orderNumber}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium leading-none">
                      {order.customerName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {order.customerEmail}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {new Date(order.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-[11px] px-2 py-0 capitalize font-medium ${ORDER_STATUS_STYLES[order.status]}`}
                  >
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm font-semibold pr-6">
                  {formatMoney(order.total, order.currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

import { Badge } from "~/components/ui/badge";
import type { OrderStatus } from "~/types/api";

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending:
    "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400",
  paid: "text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400",
  processing:
    "text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900/50 dark:text-blue-400",
  shipped:
    "text-violet-700 border-violet-200 bg-violet-50 dark:bg-violet-950/20 dark:border-violet-900/50 dark:text-violet-400",
  delivered: "text-muted-foreground border-border bg-muted/40",
  cancelled: "text-destructive border-destructive/20 bg-destructive/10",
  refunded: "text-destructive border-destructive/30 bg-transparent",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge
      variant="outline"
      className={`text-[11px] font-medium capitalize px-2 py-0 ${ORDER_STATUS_STYLES[status]}`}
    >
      {status}
    </Badge>
  );
}

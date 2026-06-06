import { Badge } from "~/components/ui/badge";
import type { CustomerStatus } from "~/types/api";

export const CUSTOMER_STATUS_STYLES: Record<CustomerStatus, string> = {
  active:
    "text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400",
  disabled: "text-muted-foreground border-border bg-muted/40",
};

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  return (
    <Badge
      variant="outline"
      className={`px-2 py-0 text-[11px] font-medium capitalize ${CUSTOMER_STATUS_STYLES[status]}`}
    >
      {status}
    </Badge>
  );
}

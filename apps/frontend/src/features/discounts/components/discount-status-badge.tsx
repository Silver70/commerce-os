import { Badge } from "~/components/ui/badge";
import type { DiscountStatus } from "~/types/api";

export const DISCOUNT_STATUS_STYLES: Record<DiscountStatus, string> = {
  active:
    "text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400",
  scheduled:
    "text-violet-700 border-violet-200 bg-violet-50 dark:bg-violet-950/20 dark:border-violet-900/50 dark:text-violet-400",
  expired: "text-muted-foreground border-border bg-muted/40",
};

export function DiscountStatusBadge({ status }: { status: DiscountStatus }) {
  return (
    <Badge
      variant="outline"
      className={`px-2 py-0 text-[11px] font-medium capitalize ${DISCOUNT_STATUS_STYLES[status]}`}
    >
      {status}
    </Badge>
  );
}

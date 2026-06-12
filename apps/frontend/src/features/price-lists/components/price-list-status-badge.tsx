import { Badge } from "~/components/ui/badge";
import type { PriceListStatus } from "~/types/api";

export const PRICE_LIST_STATUS_STYLES: Record<PriceListStatus, string> = {
  active:
    "text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400",
  scheduled:
    "text-violet-700 border-violet-200 bg-violet-50 dark:bg-violet-950/20 dark:border-violet-900/50 dark:text-violet-400",
  expired: "text-muted-foreground border-border bg-muted/40",
};

export function PriceListStatusBadge({ status }: { status: PriceListStatus }) {
  return (
    <Badge
      variant="outline"
      className={`px-2 py-0 text-[11px] font-medium capitalize ${PRICE_LIST_STATUS_STYLES[status]}`}
    >
      {status}
    </Badge>
  );
}

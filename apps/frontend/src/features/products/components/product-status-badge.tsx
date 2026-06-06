import { Badge } from "~/components/ui/badge";
import type { ProductStatus } from "~/types/api";

export const STATUS_STYLES: Record<ProductStatus, string> = {
  active:
    "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400",
  draft: "text-muted-foreground border-border bg-muted/40",
  archived: "text-destructive border-destructive/20 bg-destructive/10",
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return (
    <Badge
      variant="outline"
      className={`text-[11px] font-medium capitalize px-2 py-0 ${STATUS_STYLES[status]}`}
    >
      {status}
    </Badge>
  );
}

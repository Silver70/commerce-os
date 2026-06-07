import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";

export function ActiveDot({ active }: { active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "px-2 py-0 text-[11px] font-medium capitalize",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400"
          : "border-border bg-muted/40 text-muted-foreground",
      )}
    >
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

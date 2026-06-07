import { Badge } from "~/components/ui/badge";
import type { AdminRole } from "~/types/api";
import { ROLE_LABELS } from "../constants";

export function RoleBadge({ role }: { role: AdminRole }) {
  const styles: Record<AdminRole, string> = {
    super_admin:
      "border-violet-200 bg-violet-50 text-violet-700 dark:bg-violet-950/20 dark:border-violet-900/50 dark:text-violet-400",
    product_manager:
      "border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900/50 dark:text-blue-400",
    support_agent: "border-border bg-muted/40 text-muted-foreground",
  };
  return (
    <Badge
      variant="outline"
      className={`px-2 py-0 text-[11px] font-medium ${styles[role]}`}
    >
      {ROLE_LABELS[role]}
    </Badge>
  );
}

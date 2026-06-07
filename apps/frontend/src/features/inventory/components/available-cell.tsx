import { AlertTriangleIcon } from "lucide-react";
import type { InventoryItem } from "~/types/api";
import { available, stockStatus } from "../utils";

export function AvailableCell({ item }: { item: InventoryItem }) {
  const status = stockStatus(item);
  const avail = available(item);

  if (status === "out") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium tabular-nums text-destructive">
        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />0
      </span>
    );
  }
  if (status === "low") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium tabular-nums text-amber-600 dark:text-amber-400">
        <AlertTriangleIcon className="h-3.5 w-3.5" />
        {avail}
      </span>
    );
  }
  return <span className="text-sm tabular-nums">{avail.toLocaleString()}</span>;
}

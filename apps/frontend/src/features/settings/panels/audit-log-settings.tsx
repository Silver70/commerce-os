import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { AuditEntry } from "~/types/api";
import { auditLogsQueryOptions } from "../queries";

export function AuditLogSettings() {
  const { data: page } = useQuery(auditLogsQueryOptions());
  const entries: AuditEntry[] = page?.items ?? [];

  const [resourceFilter, setResourceFilter] = React.useState("all");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const resources = Array.from(new Set(entries.map((e) => e.resource))).sort();

  const filtered = entries.filter((e) => {
    if (resourceFilter !== "all" && e.resource !== resourceFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Audit Log</h2>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={resourceFilter} onValueChange={setResourceFilter}>
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="All resources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All resources</SelectItem>
            {resources.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {resourceFilter !== "all" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => setResourceFilter("all")}
          >
            Clear filters
          </Button>
        )}
      </div>

      <Card className="overflow-hidden gap-0 py-0">
        <div className="grid grid-cols-[160px_180px_1fr] items-center border-b bg-muted/20 px-5 py-2.5 text-xs font-medium text-muted-foreground">
          <span>Time</span>
          <span>Actor</span>
          <span>Action</span>
        </div>

        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No log entries match your filters.
          </p>
        ) : (
          filtered.map((entry, i) => (
            <div key={entry.id}>
              <button
                type="button"
                className={cn(
                  "grid w-full grid-cols-[160px_180px_1fr] items-start px-5 py-3.5 text-left transition-colors hover:bg-muted/20",
                  expandedId === entry.id && "bg-muted/10",
                  i < filtered.length - 1 &&
                    expandedId !== entry.id &&
                    "border-b border-border/50",
                )}
                onClick={() =>
                  setExpandedId(expandedId === entry.id ? null : entry.id)
                }
              >
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {new Date(entry.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-sm font-medium">{entry.actorEmail}</span>
                <div className="min-w-0">
                  <p className="text-sm">{entry.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.resource}
                    {entry.resourceId ? ` · ${entry.resourceId}` : ""}
                  </p>
                </div>
              </button>

              {expandedId === entry.id && (
                <div
                  className={cn(
                    "border-t bg-muted/5 px-5 py-4 space-y-3",
                    i < filtered.length - 1 && "border-b border-border/50",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="px-2 py-0 text-[11px] font-medium"
                    >
                      {entry.resource}
                    </Badge>
                    {entry.ipAddress && (
                      <span className="text-xs text-muted-foreground">
                        IP: {entry.ipAddress}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

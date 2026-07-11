import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontalIcon, PlusIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { TaxRate } from "~/types/api";
import { taxRatesQueryOptions } from "../queries";
import { deleteTaxRateServerFn } from "../server";
import { TAX_COUNTRIES } from "../constants";
import { TaxRateSheet } from "../components/tax-rate-sheet";

export function TaxRatesSettings() {
  const queryClient = useQueryClient();
  const { data: rates = [] } = useQuery(taxRatesQueryOptions());
  const [sheet, setSheet] = React.useState<{
    open: boolean;
    rate: TaxRate | null;
  }>({ open: false, rate: null });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTaxRateServerFn({ data: { id } }),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["settings", "tax-rates"],
      }),
  });

  const countryName = (code: string) =>
    TAX_COUNTRIES.find((c) => c.code === code)?.name ?? code;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tax Rates</h2>
        <Button
          className="gap-2 px-5"
          onClick={() => setSheet({ open: true, rate: null })}
        >
          <PlusIcon className="h-4 w-4" />
          Add rate
        </Button>
      </div>

      <Card className="overflow-hidden gap-0 py-0">
        <div className="grid grid-cols-[1fr_70px_150px_90px_80px_64px] items-center border-b bg-muted/20 px-5 py-2.5 text-xs font-medium text-muted-foreground">
          <span>Name</span>
          <span>Rate</span>
          <span>Region</span>
          <span>Type</span>
          <span className="text-center">Status</span>
          <span />
        </div>
        {rates.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No tax rates configured.
          </p>
        ) : (
          rates.map((r, i) => (
            <div
              key={r.id}
              className={cn(
                "grid grid-cols-[1fr_70px_150px_90px_80px_64px] items-center px-5 py-4 transition-colors hover:bg-muted/20",
                i < rates.length - 1 && "border-b border-border/50",
              )}
            >
              <span className="text-sm font-medium">{r.name}</span>
              <span className="text-sm font-semibold tabular-nums">
                {(r.rate / 100).toFixed(2)}%
              </span>
              <span className="text-sm text-muted-foreground">
                {countryName(r.countryCode)}
                {r.stateCode ? ` – ${r.stateCode}` : ""}
              </span>
              <span className="text-sm text-muted-foreground">
                {r.isInclusive ? "Incl." : "Excl."}
              </span>
              <div className="flex justify-center">
                <Badge
                  variant="outline"
                  className={cn(
                    "px-2 py-0 text-[11px] font-medium capitalize",
                    r.isActive
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400"
                      : "border-border bg-muted/40 text-muted-foreground",
                  )}
                >
                  {r.isActive ? "Active" : "Off"}
                </Badge>
              </div>
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                    >
                      <MoreHorizontalIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem
                      onClick={() => setSheet({ open: true, rate: r })}
                    >
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(r.id)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </Card>

      <TaxRateSheet
        rate={sheet.rate}
        open={sheet.open}
        onOpenChange={(v) => setSheet((s) => ({ ...s, open: v }))}
      />
    </div>
  );
}

import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  LoaderCircleIcon,
  Trash2Icon,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { priceListQueryOptions, priceListsQueryOptions } from "../queries";
import { deletePriceListServerFn, updatePriceListServerFn } from "../server";
import {
  basisPointsToPercent,
  computePriceListStatus,
  percentToBasisPoints,
} from "../utils";
import { PriceListStatusBadge } from "../components/price-list-status-badge";
import { PriceEditor } from "../components/price-editor";
import { AssignmentManager } from "../components/assignment-manager";

type AdjustmentDirection = "off" | "markup";

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export function PriceListDetailPage({ priceListId }: { priceListId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const detail = useSuspenseQuery(priceListQueryOptions(priceListId)).data;

  const [name, setName] = React.useState(detail.name);
  const [priority, setPriority] = React.useState(String(detail.priority));
  const [isActive, setIsActive] = React.useState(detail.isActive);
  const [startDate, setStartDate] = React.useState(
    toDateInput(detail.startsAt),
  );
  const [endDate, setEndDate] = React.useState(toDateInput(detail.endsAt));
  const [direction, setDirection] = React.useState<AdjustmentDirection>(
    (detail.adjustmentBasisPoints ?? 0) > 0 ? "markup" : "off",
  );
  const [percent, setPercent] = React.useState(
    detail.adjustmentBasisPoints != null
      ? String(Math.abs(basisPointsToPercent(detail.adjustmentBasisPoints)))
      : "",
  );
  const [error, setError] = React.useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const signedPercent =
        direction === "off" ? -parseFloat(percent) : parseFloat(percent);
      return updatePriceListServerFn({
        data: {
          priceListId,
          name: name.trim(),
          priority: priority ? parseInt(priority, 10) : undefined,
          isActive,
          adjustmentBasisPoints:
            detail.type === "adjustment" && percent
              ? percentToBasisPoints(signedPercent)
              : undefined,
          startsAt: startDate ? new Date(startDate).toISOString() : undefined,
          endsAt: endDate ? new Date(endDate).toISOString() : undefined,
        },
      });
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({
        queryKey: priceListQueryOptions(priceListId).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: priceListsQueryOptions().queryKey,
      });
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Failed to save"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePriceListServerFn({ data: { priceListId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: priceListsQueryOptions().queryKey,
      });
      navigate({ to: "/admin/price-lists" });
    },
  });

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            to="/admin/price-lists"
            className="flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Price Lists
          </Link>
          <ChevronRightIcon className="h-3.5 w-3.5" />
          <span className="text-foreground">{detail.name}</span>
        </div>

        <div className="flex items-center gap-3">
          <PriceListStatusBadge status={computePriceListStatus(detail)} />
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-destructive hover:text-destructive"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (
                window.confirm(
                  `Delete "${detail.name}"? This removes its prices and assignments.`,
                )
              ) {
                deleteMutation.mutate();
              }
            }}
          >
            <Trash2Icon className="h-3.5 w-3.5" />
            Delete
          </Button>
          <Button
            size="sm"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="px-5"
          >
            {saveMutation.isPending ? (
              <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {/* Settings */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="space-y-1.5">
                <Label htmlFor="pl-name">Name</Label>
                <Input
                  id="pl-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {detail.type === "adjustment" && (
                <div className="space-y-1.5">
                  <Label>Adjustment</Label>
                  <div className="flex items-center gap-2">
                    <select
                      value={direction}
                      onChange={(e) =>
                        setDirection(e.target.value as AdjustmentDirection)
                      }
                      className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                    >
                      <option value="off">% off</option>
                      <option value="markup">% markup</option>
                    </select>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={percent}
                      onChange={(e) => setPercent(e.target.value)}
                      className="w-28"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pl-priority">Priority</Label>
                  <Input
                    id="pl-priority"
                    type="number"
                    min={0}
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-28"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pl-start" className="text-muted-foreground">
                    Start date
                  </Label>
                  <Input
                    id="pl-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pl-end" className="text-muted-foreground">
                    End date
                  </Label>
                  <Input
                    id="pl-end"
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 accent-amber-500"
                />
                Active
              </label>
            </CardContent>
          </Card>

          {/* Fixed price editor */}
          {detail.type === "fixed" && (
            <PriceEditor priceListId={priceListId} prices={detail.prices} />
          )}
        </div>

        {/* Assignments */}
        <div className="space-y-5">
          <AssignmentManager
            priceListId={priceListId}
            assignments={detail.assignments}
          />
        </div>
      </div>
    </div>
  );
}

import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, ChevronRightIcon, LoaderCircleIcon } from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { PriceListType } from "~/types/api";
import { priceListsQueryOptions } from "../queries";
import { createPriceListServerFn } from "../server";
import { percentToBasisPoints } from "../utils";

type AdjustmentDirection = "off" | "markup";

export function PriceListNewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<PriceListType>("fixed");
  const [direction, setDirection] = React.useState<AdjustmentDirection>("off");
  const [percent, setPercent] = React.useState("");
  const [priority, setPriority] = React.useState("100");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const canSave =
    name.trim().length > 0 &&
    (type === "fixed" || parseFloat(percent) > 0);

  const createMutation = useMutation({
    mutationFn: async () => {
      const fieldErrors: Record<string, string> = {};
      if (!name.trim()) fieldErrors.name = "Name is required";
      if (type === "adjustment") {
        const pct = parseFloat(percent);
        if (!pct || pct <= 0)
          fieldErrors.percent = "Enter a positive percentage";
      }
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        throw new Error("Validation failed");
      }
      setErrors({});

      const signedPercent =
        direction === "off" ? -parseFloat(percent) : parseFloat(percent);

      return createPriceListServerFn({
        data: {
          name: name.trim(),
          type,
          adjustmentBasisPoints:
            type === "adjustment"
              ? percentToBasisPoints(signedPercent)
              : undefined,
          priority: priority ? parseInt(priority, 10) : undefined,
          isActive: true,
          startsAt: startDate ? new Date(startDate).toISOString() : undefined,
          endsAt: endDate ? new Date(endDate).toISOString() : undefined,
        },
      });
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({
        queryKey: priceListsQueryOptions().queryKey,
      });
      navigate({
        to: "/admin/price-lists/$priceListId",
        params: { priceListId: created.id },
      });
    },
    onError: (err) => {
      if (err.message !== "Validation failed") {
        setErrors({
          _root:
            err instanceof Error ? err.message : "Failed to create price list",
        });
      }
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
          <span className="text-foreground">Create price list</span>
        </div>

        <div className="flex items-center gap-3">
          {errors._root && (
            <p className="text-xs text-destructive">{errors._root}</p>
          )}
          <Button
            disabled={!canSave || createMutation.isPending}
            onClick={() => createMutation.mutate()}
            className="bg-orange-700 px-5 text-white shadow-none hover:bg-orange-800 disabled:opacity-50"
          >
            {createMutation.isPending ? (
              <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-5">
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Price List Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="pl-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pl-name"
                placeholder="e.g. Wholesale Tier 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            <Separator />

            {/* Type */}
            <div className="space-y-2.5">
              <Label>
                Pricing model <span className="text-destructive">*</span>
              </Label>
              <div className="flex flex-col gap-2">
                {(
                  [
                    {
                      value: "fixed" as const,
                      label: "Fixed prices",
                      hint: "Set an explicit price per variant",
                    },
                    {
                      value: "adjustment" as const,
                      label: "Adjustment",
                      hint: "A percentage off or over the base price",
                    },
                  ]
                ).map((t) => (
                  <label
                    key={t.value}
                    className="flex cursor-pointer items-start gap-2.5"
                    onClick={() => setType(t.value)}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        type === t.value
                          ? "border-amber-500 bg-amber-500"
                          : "border-border bg-transparent",
                      )}
                    >
                      {type === t.value && (
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-sm leading-tight">
                      {t.label}
                      <span className="block text-xs text-muted-foreground">
                        {t.hint}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Adjustment value */}
            {type === "adjustment" && (
              <div className="space-y-1.5">
                <Label htmlFor="pl-percent">
                  Adjustment <span className="text-destructive">*</span>
                </Label>
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
                    id="pl-percent"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="15"
                    value={percent}
                    onChange={(e) => setPercent(e.target.value)}
                    className="w-28"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                {errors.percent && (
                  <p className="text-xs text-destructive">{errors.percent}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Applied to each variant's base price at resolution time.
                </p>
              </div>
            )}

            {type === "fixed" && (
              <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                After saving, set per-variant prices on the price list page.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Priority & Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            {/* Priority */}
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
              <p className="text-xs text-muted-foreground">
                Lower wins when multiple lists apply. Default 100.
              </p>
            </div>

            <Separator />

            {/* Schedule */}
            <div className="space-y-3">
              <Label>
                Active period{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="pl-start"
                    className="text-xs text-muted-foreground"
                  >
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
                  <Label
                    htmlFor="pl-end"
                    className="text-xs text-muted-foreground"
                  >
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

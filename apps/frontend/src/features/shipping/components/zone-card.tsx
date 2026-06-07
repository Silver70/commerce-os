import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  GlobeIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import type { ShippingMethod, ShippingZone } from "~/types/api";
import { shippingMethodsQueryOptions } from "../queries";
import {
  createShippingMethodServerFn,
  deleteShippingMethodServerFn,
  updateShippingMethodServerFn,
} from "../server";
import { countryName } from "../utils";
import type { MethodFormValues } from "../types";
import { ActiveDot } from "./active-dot";
import { MethodSheet } from "./method-sheet";

type MethodSheetState = { method: ShippingMethod | null; open: boolean };

export function ZoneCard({
  zone,
  defaultExpanded,
  onEditZone,
  onDeleteZone,
}: {
  zone: ShippingZone;
  defaultExpanded?: boolean;
  onEditZone: () => void;
  onDeleteZone: () => void;
}) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = React.useState(defaultExpanded ?? false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [confirmDeleteMethodId, setConfirmDeleteMethodId] = React.useState<
    string | null
  >(null);
  const [methodSheet, setMethodSheet] = React.useState<MethodSheetState>({
    method: null,
    open: false,
  });
  const [methodError, setMethodError] = React.useState<string | null>(null);

  const methodsQuery = useQuery({
    ...shippingMethodsQueryOptions(zone.id),
    enabled: expanded,
  });

  const methods: ShippingMethod[] = methodsQuery.data ?? [];

  const createMethodMutation = useMutation({
    mutationFn: (values: MethodFormValues) =>
      createShippingMethodServerFn({
        data: {
          zoneId: zone.id,
          name: values.name,
          rateType: values.rateType,
          price: Math.round(parseFloat(values.price) * 100) || 0,
          minOrderAmount: values.minOrderAmount
            ? Math.round(parseFloat(values.minOrderAmount) * 100)
            : undefined,
          estimatedDaysMin: values.estimatedDaysMin
            ? parseInt(values.estimatedDaysMin)
            : undefined,
          estimatedDaysMax: values.estimatedDaysMax
            ? parseInt(values.estimatedDaysMax)
            : undefined,
          isActive: values.isActive,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(shippingMethodsQueryOptions(zone.id));
      setMethodSheet({ method: null, open: false });
      setMethodError(null);
    },
    onError: (err: Error) => setMethodError(err.message),
  });

  const updateMethodMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: MethodFormValues }) =>
      updateShippingMethodServerFn({
        data: {
          id,
          name: values.name,
          rateType: values.rateType,
          price: Math.round(parseFloat(values.price) * 100) || 0,
          minOrderAmount: values.minOrderAmount
            ? Math.round(parseFloat(values.minOrderAmount) * 100)
            : undefined,
          estimatedDaysMin: values.estimatedDaysMin
            ? parseInt(values.estimatedDaysMin)
            : undefined,
          estimatedDaysMax: values.estimatedDaysMax
            ? parseInt(values.estimatedDaysMax)
            : undefined,
          isActive: values.isActive,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(shippingMethodsQueryOptions(zone.id));
      setMethodSheet({ method: null, open: false });
      setMethodError(null);
    },
    onError: (err: Error) => setMethodError(err.message),
  });

  const deleteMethodMutation = useMutation({
    mutationFn: (id: string) => deleteShippingMethodServerFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries(shippingMethodsQueryOptions(zone.id));
      setConfirmDeleteMethodId(null);
    },
  });

  function handleMethodSave(values: MethodFormValues) {
    if (methodSheet.method) {
      updateMethodMutation.mutate({ id: methodSheet.method.id, values });
    } else {
      createMethodMutation.mutate(values);
    }
  }

  const isSavingMethod =
    createMethodMutation.isPending || updateMethodMutation.isPending;

  const displayCountries = zone.countries.slice(0, 4);
  const extraCount = zone.countries.length - displayCountries.length;

  return (
    <div className="rounded-lg border bg-card">
      {/* Zone header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{zone.name}</p>
          {!expanded && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {zone.countries.length === 0
                ? "No countries"
                : displayCountries.map((c) => countryName(c)).join(", ") +
                  (extraCount > 0 ? ` + ${extraCount} more` : "")}
            </p>
          )}
        </div>

        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Delete this zone?
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 bg-destructive px-2.5 text-xs text-destructive-foreground hover:bg-destructive/90"
              onClick={onDeleteZone}
            >
              Delete
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-1.5 text-xs"
              onClick={onEditZone}
            >
              <PencilIcon className="h-3 w-3" />
              Edit zone
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2Icon className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t px-5 pb-5 pt-4 space-y-5">
          {/* Countries */}
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <GlobeIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Countries
              </span>
            </div>
            {zone.countries.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No countries added yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {zone.countries.map((code) => (
                  <span
                    key={code}
                    className="rounded-md border bg-muted/30 px-2 py-0.5 text-xs font-medium"
                    title={countryName(code)}
                  >
                    {code}
                  </span>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Methods */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Shipping methods
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2.5 text-xs"
                onClick={() => {
                  setMethodError(null);
                  setMethodSheet({ method: null, open: true });
                }}
              >
                <PlusIcon className="h-3 w-3" />
                Add method
              </Button>
            </div>

            {methodError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {methodError}
              </p>
            )}

            {methodsQuery.isLoading ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Loading…
              </p>
            ) : methods.length === 0 ? (
              <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
                No shipping methods. Add one to start accepting orders in this
                zone.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <div className="grid grid-cols-[1fr_110px_110px_80px_80px] items-center bg-muted/20 px-4 py-2 text-xs font-medium text-muted-foreground">
                  <span>Method</span>
                  <span>Rate</span>
                  <span>Delivery</span>
                  <span className="text-center">Status</span>
                  <span />
                </div>

                {methods.map((method, i) => (
                  <div
                    key={method.id}
                    className={cn(
                      "grid grid-cols-[1fr_110px_110px_80px_80px] items-center px-4 py-3 transition-colors hover:bg-muted/20",
                      i < methods.length - 1 && "border-b border-border/50",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-none">
                        {method.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                        {method.rateType.replace("_", " ")}
                      </p>
                    </div>

                    <div className="text-sm font-semibold tabular-nums">
                      {method.rateType === "free" ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Free
                        </span>
                      ) : (
                        `$${(method.price / 100).toFixed(2)}`
                      )}
                      {method.minOrderAmount != null && (
                        <p className="text-[10px] font-normal text-muted-foreground">
                          min ${(method.minOrderAmount / 100).toFixed(2)}
                        </p>
                      )}
                    </div>

                    <span className="text-sm text-muted-foreground">
                      {method.estimatedDaysMin != null &&
                      method.estimatedDaysMax != null
                        ? `${method.estimatedDaysMin}–${method.estimatedDaysMax} days`
                        : "—"}
                    </span>

                    <div className="flex justify-center">
                      <ActiveDot active={method.isActive} />
                    </div>

                    <div className="flex items-center justify-end gap-1">
                      {confirmDeleteMethodId === method.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-[11px]"
                            onClick={() => setConfirmDeleteMethodId(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="h-6 bg-destructive px-1.5 text-[11px] text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteMethodMutation.mutate(method.id)}
                          >
                            Delete
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setMethodError(null);
                              setMethodSheet({ method, open: true });
                            }}
                          >
                            <PencilIcon className="h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setConfirmDeleteMethodId(method.id)}
                          >
                            <Trash2Icon className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <MethodSheet
        method={methodSheet.method}
        open={methodSheet.open}
        onOpenChange={(v) => setMethodSheet((s) => ({ ...s, open: v }))}
        onSave={handleMethodSave}
        isSaving={isSavingMethod}
      />
    </div>
  );
}

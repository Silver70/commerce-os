import * as React from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { GlobeIcon, PlusIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import type { ShippingZone } from "~/types/api";
import { shippingZonesQueryOptions } from "../queries";
import {
  createShippingZoneServerFn,
  deleteShippingZoneServerFn,
  updateShippingZoneServerFn,
} from "../server";
import type { ZoneFormValues } from "../types";
import { ZoneCard } from "../components/zone-card";
import { ZoneSheet } from "../components/zone-sheet";

type ZoneSheetState = { zone: ShippingZone | null; open: boolean };

export function ShippingPage() {
  const queryClient = useQueryClient();
  const zones: ShippingZone[] = useSuspenseQuery(
    shippingZonesQueryOptions(),
  ).data;

  const [zoneSheet, setZoneSheet] = React.useState<ZoneSheetState>({
    zone: null,
    open: false,
  });
  const [zoneError, setZoneError] = React.useState<string | null>(null);

  const createZoneMutation = useMutation({
    mutationFn: (values: ZoneFormValues) =>
      createShippingZoneServerFn({
        data: { name: values.name, countries: values.countries, isDefault: false },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(shippingZonesQueryOptions());
      setZoneSheet({ zone: null, open: false });
      setZoneError(null);
    },
    onError: (err: Error) => setZoneError(err.message),
  });

  const updateZoneMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ZoneFormValues }) =>
      updateShippingZoneServerFn({
        data: { id, name: values.name, countries: values.countries },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(shippingZonesQueryOptions());
      setZoneSheet({ zone: null, open: false });
      setZoneError(null);
    },
    onError: (err: Error) => setZoneError(err.message),
  });

  const deleteZoneMutation = useMutation({
    mutationFn: (id: string) => deleteShippingZoneServerFn({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries(shippingZonesQueryOptions()),
  });

  function handleSaveZone(values: ZoneFormValues) {
    if (zoneSheet.zone) {
      updateZoneMutation.mutate({ id: zoneSheet.zone.id, values });
    } else {
      createZoneMutation.mutate(values);
    }
  }

  const isSavingZone =
    createZoneMutation.isPending || updateZoneMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Shipping</h1>
          <p className="text-sm text-muted-foreground">
            Configure shipping zones and rates.
          </p>
        </div>
        <Button
          className="gap-2 px-5 py-2.5"
          onClick={() => {
            setZoneError(null);
            setZoneSheet({ zone: null, open: true });
          }}
        >
          <PlusIcon className="h-4 w-4" />
          Add zone
        </Button>
      </div>

      {zoneError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {zoneError}
        </p>
      )}

      {/* Zone list */}
      <div className="space-y-3">
        {zones.length === 0 ? (
          <div className="rounded-lg border border-dashed py-16 text-center">
            <GlobeIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No shipping zones yet. Add one to get started.
            </p>
          </div>
        ) : (
          zones.map((zone, i) => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              defaultExpanded={i === 0}
              onEditZone={() => {
                setZoneError(null);
                setZoneSheet({ zone, open: true });
              }}
              onDeleteZone={() => deleteZoneMutation.mutate(zone.id)}
            />
          ))
        )}
      </div>

      <ZoneSheet
        zone={zoneSheet.zone}
        open={zoneSheet.open}
        onOpenChange={(v) => setZoneSheet((s) => ({ ...s, open: v }))}
        onSave={handleSaveZone}
        isSaving={isSavingZone}
      />
    </div>
  );
}

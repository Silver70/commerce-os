import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { parseApiError } from "~/lib/errors";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { orderQueryOptions } from "../queries";
import { createShipmentServerFn } from "../server";

const shipmentSchema = z.object({
  carrier: z.string().min(1, "Carrier is required"),
  trackingNumber: z.string().min(1, "Tracking number is required"),
  trackingUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export function ShipmentSheet({
  orderId,
  open,
  onClose,
}: {
  orderId: string;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [carrier, setCarrier] = React.useState("");
  const [trackingNumber, setTrackingNumber] = React.useState("");
  const [trackingUrl, setTrackingUrl] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: {
      carrier: string;
      trackingNumber: string;
      trackingUrl?: string;
    }) => createShipmentServerFn({ data: { orderId, ...payload } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orderQueryOptions(orderId).queryKey,
      });
      onClose();
    },
    onError: (err) => {
      const msg = parseApiError(err).message;
      setError(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  function handleSubmit() {
    setError(null);
    const result = shipmentSchema.safeParse({
      carrier,
      trackingNumber,
      trackingUrl: trackingUrl || undefined,
    });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    mutation.mutate({
      carrier: result.data.carrier,
      trackingNumber: result.data.trackingNumber,
      trackingUrl: result.data.trackingUrl || undefined,
    });
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Create Shipment</SheetTitle>
          <SheetDescription>
            Enter tracking details for this shipment.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="carrier">
              Carrier <span className="text-destructive">*</span>
            </Label>
            <Input
              id="carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="e.g. UPS, FedEx, USPS"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trackingNumber">
              Tracking number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="trackingNumber"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. 1Z999AA10123456784"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trackingUrl">Tracking URL (optional)</Label>
            <Input
              id="trackingUrl"
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className="flex-1 bg-violet-600 text-white shadow-none hover:bg-violet-700"
            >
              {mutation.isPending ? "Creating…" : "Create shipment"}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

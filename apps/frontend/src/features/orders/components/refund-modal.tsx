import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangleIcon } from "lucide-react";
import { z } from "zod";
import { formatMoney } from "~/lib/money";
import { parseApiError } from "~/lib/errors";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { orderQueryOptions } from "../queries";
import { refundOrderServerFn } from "../server";

const refundSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  reason: z.string().optional(),
});

export function RefundModal({
  totalCents,
  currency,
  orderNumber,
  orderId,
  onClose,
}: {
  totalCents: number;
  currency: string;
  orderNumber: string;
  orderId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = React.useState((totalCents / 100).toFixed(2));
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: { amount: number; reason: string }) =>
      refundOrderServerFn({
        data: { orderId, amount: payload.amount, reason: payload.reason },
      }),
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
    const result = refundSchema.safeParse({
      amount,
      reason: reason || undefined,
    });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    mutation.mutate({
      amount: Math.round(result.data.amount * 100),
      reason: result.data.reason ?? "",
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-base font-semibold">Issue Refund</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="space-y-0.5 text-sm text-muted-foreground">
            <p>
              Order:{" "}
              <span className="font-mono font-medium text-foreground">
                {orderNumber}
              </span>
            </p>
            <p>
              Total paid:{" "}
              <span className="font-semibold text-foreground">
                {formatMoney(totalCents, currency)}
              </span>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Refund amount <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-9 pl-6 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Reason
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select a reason…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer_request">
                  Customer request
                </SelectItem>
                <SelectItem value="defective">Defective item</SelectItem>
                <SelectItem value="not_received">Item not received</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5">
            <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-xs leading-relaxed text-destructive/80">
              This will refund <strong>${amount}</strong> to the customer via
              Stripe. This action cannot be undone.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-9 bg-destructive px-4 text-white shadow-none hover:bg-destructive/90"
              onClick={handleSubmit}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Processing…" : "Issue refund"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

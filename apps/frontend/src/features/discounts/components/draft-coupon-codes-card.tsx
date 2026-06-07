import * as React from "react";
import { PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { autoGenerateCode } from "../utils";
import type { CouponCode } from "../types";

/**
 * Coupon-code editor for the create-discount flow. Works on a local draft
 * array; codes are persisted after the discount is created. The detail page
 * uses `CouponCodesCard`, which mutates real coupons directly.
 */
export function DraftCouponCodesCard({
  codes,
  onChange,
}: {
  codes: CouponCode[];
  onChange: (codes: CouponCode[]) => void;
}) {
  const [newCode, setNewCode] = React.useState("");
  const [newMax, setNewMax] = React.useState("");
  const [newPerCust, setNewPerCust] = React.useState("1");
  const [codeError, setCodeError] = React.useState("");

  function handleAdd() {
    const trimmed = newCode.trim().toUpperCase();
    if (!trimmed) {
      setCodeError("Code is required.");
      return;
    }
    if (codes.some((c) => c.code === trimmed)) {
      setCodeError("Code already exists.");
      return;
    }
    onChange([
      ...codes,
      {
        code: trimmed,
        maxUses: newMax.trim() === "" ? null : parseInt(newMax, 10),
        perCustomer: parseInt(newPerCust, 10) || 1,
        used: 0,
      },
    ]);
    setNewCode("");
    setNewMax("");
    setNewPerCust("1");
    setCodeError("");
  }

  function handleRemove(code: string) {
    onChange(codes.filter((c) => c.code !== code));
  }

  function handleGenerate() {
    setNewCode(autoGenerateCode());
    setCodeError("");
  }

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Coupon Codes
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Existing codes table */}
        {codes.length > 0 ? (
          <div className="overflow-hidden rounded-lg border">
            <div className="grid grid-cols-[1fr_80px_96px_60px_36px] items-center bg-muted/20 px-4 py-2 text-xs font-medium text-muted-foreground">
              <span>Code</span>
              <span className="text-center">Max uses</span>
              <span className="text-center">Per customer</span>
              <span className="text-center">Used</span>
              <span />
            </div>
            {codes.map((c, i) => (
              <div
                key={c.code}
                className={cn(
                  "grid grid-cols-[1fr_80px_96px_60px_36px] items-center px-4 py-3",
                  i < codes.length - 1 && "border-b border-border/50",
                )}
              >
                <span className="font-mono text-sm font-semibold tracking-wide">
                  {c.code}
                </span>
                <span className="text-center text-sm text-muted-foreground tabular-nums">
                  {c.maxUses === null ? "∞" : c.maxUses}
                </span>
                <span className="text-center text-sm text-muted-foreground tabular-nums">
                  {c.perCustomer}
                </span>
                <span className="text-center text-sm text-muted-foreground tabular-nums">
                  {c.used}
                </span>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(c.code)}
                  >
                    <Trash2Icon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-2 text-sm text-muted-foreground">
            No coupon codes yet. Add one below.
          </p>
        )}

        <Separator />

        {/* Add code form */}
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Add coupon code
          </p>

          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="new-code" className="text-xs">
                Code
              </Label>
              <div className="flex gap-1.5">
                <Input
                  id="new-code"
                  placeholder="e.g. SUMMER20"
                  value={newCode}
                  onChange={(e) => {
                    setNewCode(e.target.value.toUpperCase());
                    setCodeError("");
                  }}
                  className="font-mono uppercase"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={handleGenerate}
                  title="Auto-generate"
                >
                  <RefreshCwIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="w-24 space-y-1.5">
              <Label htmlFor="new-max" className="text-xs">
                Max uses
              </Label>
              <Input
                id="new-max"
                type="number"
                min={1}
                placeholder="∞"
                value={newMax}
                onChange={(e) => setNewMax(e.target.value)}
              />
            </div>
            <div className="w-28 space-y-1.5">
              <Label htmlFor="new-per" className="text-xs">
                Per customer
              </Label>
              <Input
                id="new-per"
                type="number"
                min={1}
                value={newPerCust}
                onChange={(e) => setNewPerCust(e.target.value)}
              />
            </div>
          </div>

          {codeError && <p className="text-xs text-destructive">{codeError}</p>}

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleAdd}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add coupon code
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

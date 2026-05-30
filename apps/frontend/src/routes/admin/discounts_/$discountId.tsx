import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  useSuspenseQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { z } from "zod";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  LoaderCircleIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  updateDiscountServerFn,
  deleteDiscountServerFn,
  createCouponServerFn,
  deleteCouponServerFn,
} from "~/server/discounts";
import {
  discountQueryOptions,
  discountsQueryOptions,
  couponsQueryOptions,
} from "~/queries/discounts";
import {
  DiscountStatusBadge,
  computeDiscountStatus,
} from "~/routes/admin/discounts_/index";
import type { Coupon, Discount, DiscountType } from "~/types/api";

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const updateDiscountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["percentage", "fixed_amount"]),
  value: z.coerce.number().positive("Value must be positive"),
  scope: z.enum(["product", "category", "order"]),
  scopeId: z.string().optional(),
  minOrderAmount: z.coerce.number().min(0).optional(),
  isActive: z.boolean(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
});

export const Route = createFileRoute("/admin/discounts_/$discountId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      discountQueryOptions(params.discountId),
    ),
  component: DiscountEditPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type AppliesTo = "order" | "category" | "product";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function autoGenerateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const part = Array.from(
    { length: 4 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
  return `DISC-${part}`;
}

// ─── Delete Discount Button ───────────────────────────────────────────────────

function DeleteDiscountButton({ discountId }: { discountId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = React.useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => deleteDiscountServerFn({ data: { discountId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discountsQueryOptions().queryKey });
      navigate({ to: "/admin/discounts" });
    },
  });

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setConfirming(true)}
      >
        <Trash2Icon className="h-3.5 w-3.5" />
        Delete discount
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Are you sure?</span>
      <Button
        variant="destructive"
        size="sm"
        className="h-7 px-3 text-xs"
        onClick={() => deleteMutation.mutate()}
        disabled={deleteMutation.isPending}
      >
        {deleteMutation.isPending ? (
          <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" />
        ) : (
          "Delete"
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-3 text-xs"
        onClick={() => setConfirming(false)}
      >
        Cancel
      </Button>
    </div>
  );
}

// ─── Coupon Codes Card ────────────────────────────────────────────────────────

function CouponCodesCard({
  discount,
  coupons,
}: {
  discount: Discount;
  coupons: Coupon[];
}) {
  const queryClient = useQueryClient();
  const [newCode, setNewCode] = React.useState("");
  const [newMax, setNewMax] = React.useState("");
  const [newPerCust, setNewPerCust] = React.useState("1");
  const [codeError, setCodeError] = React.useState("");

  const createMutation = useMutation({
    mutationFn: (vars: { code: string; maxUses: number | null; perCustomer: number }) =>
      createCouponServerFn({
        data: {
          code: vars.code,
          type: discount.type,
          value: discount.value,
          maxUsageCount: vars.maxUses ?? undefined,
          maxUsagePerCustomer: vars.perCustomer,
          isActive: true,
          startsAt: discount.startsAt ?? undefined,
          endsAt: discount.endsAt ?? undefined,
        },
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: couponsQueryOptions().queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (couponId: string) =>
      deleteCouponServerFn({ data: { couponId } }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: couponsQueryOptions().queryKey }),
  });

  function handleAdd() {
    const trimmed = newCode.trim().toUpperCase();
    if (!trimmed) {
      setCodeError("Code is required.");
      return;
    }
    if (coupons.some((c) => c.code === trimmed)) {
      setCodeError("Code already exists.");
      return;
    }
    const maxUses = newMax.trim() === "" ? null : parseInt(newMax, 10);
    const perCustomer = parseInt(newPerCust, 10) || 1;
    createMutation.mutate(
      { code: trimmed, maxUses, perCustomer },
      {
        onSuccess: () => {
          setNewCode("");
          setNewMax("");
          setNewPerCust("1");
          setCodeError("");
        },
        onError: (err) => {
          setCodeError(err instanceof Error ? err.message : "Failed to create coupon");
        },
      },
    );
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
        {coupons.length > 0 ? (
          <div className="overflow-hidden rounded-lg border">
            <div className="grid grid-cols-[1fr_80px_96px_60px_36px] items-center bg-muted/20 px-4 py-2 text-xs font-medium text-muted-foreground">
              <span>Code</span>
              <span className="text-center">Max uses</span>
              <span className="text-center">Per customer</span>
              <span className="text-center">Used</span>
              <span />
            </div>
            {coupons.map((c, i) => (
              <div
                key={c.id}
                className={cn(
                  "grid grid-cols-[1fr_80px_96px_60px_36px] items-center px-4 py-3",
                  i < coupons.length - 1 && "border-b border-border/50",
                )}
              >
                <span className="font-mono text-sm font-semibold tracking-wide">
                  {c.code}
                </span>
                <span className="text-center text-sm tabular-nums text-muted-foreground">
                  {c.maxUsageCount === null ? "∞" : c.maxUsageCount}
                </span>
                <span className="text-center text-sm tabular-nums text-muted-foreground">
                  {c.maxUsagePerCustomer ?? "∞"}
                </span>
                <span className="text-center text-sm tabular-nums text-muted-foreground">
                  {c.usageCount}
                </span>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate(c.id)}
                    disabled={deleteMutation.isPending}
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
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <PlusIcon className="h-3.5 w-3.5" />
            )}
            Add coupon code
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function DiscountEditPage() {
  const { discountId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: discount } = useSuspenseQuery(discountQueryOptions(discountId));
  const { data: allCoupons = [] } = useQuery(couponsQueryOptions());

  // Discount details
  const [name, setName] = React.useState(discount.name);
  const [type, setType] = React.useState<DiscountType>(discount.type);
  const [value, setValue] = React.useState(
    discount.type === "fixed_amount"
      ? String(discount.value / 100)
      : String(discount.value),
  );
  const [appliesTo, setAppliesTo] = React.useState<AppliesTo>(discount.scope);
  const [category, setCategory] = React.useState(
    discount.scope === "category" ? (discount.scopeId ?? "") : "",
  );
  const [product, setProduct] = React.useState(
    discount.scope === "product" ? (discount.scopeId ?? "") : "",
  );

  // Conditions
  const [minPurchase, setMinPurchase] = React.useState(
    discount.minOrderAmount != null
      ? String(discount.minOrderAmount / 100)
      : "",
  );
  const [startDate, setStartDate] = React.useState(
    discount.startsAt ? discount.startsAt.slice(0, 10) : "",
  );
  const [endDate, setEndDate] = React.useState(
    discount.endsAt ? discount.endsAt.slice(0, 10) : "",
  );
  const [noEndDate, setNoEndDate] = React.useState(!discount.endsAt);

  // Errors
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const canSave = name.trim().length > 0 && value.trim().length > 0;

  const updateMutation = useMutation({
    mutationFn: () => {
      const rawValue = parseFloat(value);
      const sentValue =
        type === "fixed_amount" ? Math.round(rawValue * 100) : rawValue;

      const payload = {
        name: name.trim(),
        type,
        value: sentValue,
        scope: appliesTo,
        scopeId:
          appliesTo === "category"
            ? category || undefined
            : appliesTo === "product"
              ? product || undefined
              : undefined,
        minOrderAmount: minPurchase
          ? Math.round(parseFloat(minPurchase) * 100)
          : undefined,
        isActive: discount.isActive,
        startsAt: startDate ? new Date(startDate).toISOString() : undefined,
        endsAt:
          !noEndDate && endDate
            ? new Date(endDate).toISOString()
            : undefined,
      };

      const result = updateDiscountSchema.safeParse(payload);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of result.error.issues) {
          fieldErrors[issue.path.join(".")] = issue.message;
        }
        setErrors(fieldErrors);
        return Promise.reject(new Error("Validation failed"));
      }
      setErrors({});
      return updateDiscountServerFn({ data: { discountId, ...result.data } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discountQueryOptions(discountId).queryKey });
      queryClient.invalidateQueries({ queryKey: discountsQueryOptions().queryKey });
    },
    onError: (err) => {
      if (err.message !== "Validation failed") {
        setErrors({ _root: err instanceof Error ? err.message : "Failed to save discount" });
      }
    },
  });

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            to="/admin/discounts"
            className="flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Discounts
          </Link>
          <ChevronRightIcon className="h-3.5 w-3.5" />
          <span className="text-foreground">{discount.name}</span>
        </div>

        <div className="flex items-center gap-3">
          {errors._root && (
            <p className="text-xs text-destructive">{errors._root}</p>
          )}
          <DeleteDiscountButton discountId={discountId} />
          <DiscountStatusBadge status={computeDiscountStatus(discount)} />
          <Button
            disabled={!canSave || updateMutation.isPending}
            onClick={() => updateMutation.mutate()}
            className="bg-orange-700 px-5 text-white shadow-none hover:bg-orange-800 disabled:opacity-50"
          >
            {updateMutation.isPending ? (
              <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-5">
        {/* ── Discount Details ──────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Discount Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            <div className="space-y-1.5">
              <Label htmlFor="d-name">
                Internal name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="d-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Visible only to admins, not shown to customers.
              </p>
            </div>

            <Separator />

            <div className="space-y-2.5">
              <Label>
                Discount type <span className="text-destructive">*</span>
              </Label>
              <div className="flex flex-col gap-2">
                {(["percentage", "fixed_amount"] as const).map((t) => (
                  <label
                    key={t}
                    className="flex cursor-pointer items-center gap-2.5"
                    onClick={() => setType(t)}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        type === t
                          ? "border-amber-500 bg-amber-500"
                          : "border-border bg-transparent",
                      )}
                    >
                      {type === t && (
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-sm">
                      {t === "percentage" ? "Percentage" : "Fixed amount"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="d-value">
                Value <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                {type === "fixed_amount" && (
                  <span className="text-sm text-muted-foreground">$</span>
                )}
                <Input
                  id="d-value"
                  type="number"
                  min={0}
                  step={type === "percentage" ? 1 : 0.01}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-32"
                />
                {type === "percentage" && (
                  <span className="text-sm text-muted-foreground">%</span>
                )}
              </div>
              {errors.value && (
                <p className="text-xs text-destructive">{errors.value}</p>
              )}
            </div>

            <Separator />

            <div className="space-y-2.5">
              <Label>
                Applies to <span className="text-destructive">*</span>
              </Label>
              <div className="flex flex-col gap-2">
                {(["order", "category", "product"] as const).map((scope) => (
                  <label
                    key={scope}
                    className="flex cursor-pointer items-center gap-2.5"
                    onClick={() => setAppliesTo(scope)}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        appliesTo === scope
                          ? "border-amber-500 bg-amber-500"
                          : "border-border bg-transparent",
                      )}
                    >
                      {appliesTo === scope && (
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-sm">
                      {scope === "order" && "Entire order"}
                      {scope === "category" && "Specific category"}
                      {scope === "product" && "Specific product"}
                    </span>
                  </label>
                ))}
              </div>

              {appliesTo === "category" && (
                <div className="ml-7 mt-1">
                  <Input
                    placeholder="Category ID"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-56"
                  />
                </div>
              )}

              {appliesTo === "product" && (
                <div className="ml-7 mt-1">
                  <Input
                    placeholder="Product ID"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    className="w-56"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Conditions ────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            <div className="space-y-1.5">
              <Label htmlFor="d-min">
                Minimum purchase amount{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  id="d-min"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={minPurchase}
                  onChange={(e) => setMinPurchase(e.target.value)}
                  className="w-36"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>
                Active period <span className="text-destructive">*</span>
              </Label>
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="d-start"
                    className="text-xs text-muted-foreground"
                  >
                    Start date
                  </Label>
                  <Input
                    id="d-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                {!noEndDate && (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="d-end"
                      className="text-xs text-muted-foreground"
                    >
                      End date
                    </Label>
                    <Input
                      id="d-end"
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-40"
                    />
                  </div>
                )}
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <div
                  onClick={() => setNoEndDate((v) => !v)}
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
                    noEndDate
                      ? "border-amber-500 bg-amber-500"
                      : "border-border bg-transparent",
                  )}
                >
                  {noEndDate && (
                    <svg
                      viewBox="0 0 10 8"
                      className="h-2.5 w-2.5 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <polyline points="1 4 4 7 9 1" />
                    </svg>
                  )}
                </div>
                No end date
              </label>
            </div>
          </CardContent>
        </Card>

        {/* ── Coupon Codes ──────────────────────────────────────────────────── */}
        <CouponCodesCard discount={discount} coupons={allCoupons} />
      </div>
    </div>
  );
}

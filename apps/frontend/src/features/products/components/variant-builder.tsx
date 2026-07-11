import * as React from "react";
import {
  ChevronRightIcon,
  MoreHorizontalIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import type { OptionGroup, VariantDraft } from "../types";

// ─── Variant Draft Row ──────────────────────────────────────────────────────

function VariantDraftRow({
  v,
  isOpen,
  onToggle,
  onUpdate,
  onDelete,
}: {
  v: VariantDraft;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<VariantDraft>) => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "border-b border-border/50 last:border-0",
        isOpen && "bg-muted/10",
      )}
    >
      {/* Summary row */}
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/20"
        onClick={onToggle}
      >
        <ChevronRightIcon
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-90",
          )}
        />
        <span className="min-w-0 flex-1 text-sm font-medium">
          {v.name || v.sku || "Unnamed variant"}
        </span>
        <span className="hidden w-32 truncate font-mono text-xs text-muted-foreground sm:block">
          {v.sku}
        </span>
        <span className="w-20 text-right text-sm font-semibold tabular-nums">
          {v.price ? `$${v.price}` : "—"}
        </span>
        <div className="w-24 text-right">
          <span className="text-sm tabular-nums text-muted-foreground">
            {v.initialStock || "—"}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUpdate({ active: !v.active });
          }}
          className={cn(
            "relative ml-3 h-5 w-9 shrink-0 rounded-full border-2 transition-colors",
            v.active
              ? "border-amber-500 bg-amber-500"
              : "border-border bg-transparent",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-3 w-3 rounded-full transition-transform duration-200",
              v.active
                ? "left-0.5 translate-x-4 bg-white"
                : "left-0.5 translate-x-0 bg-muted-foreground/40",
            )}
          />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground"
            >
              <MoreHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete()}
            >
              Delete variant
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Inline detail form */}
      {isOpen && (
        <div className="border-t border-border/40 bg-background/60 px-6 py-5">
          <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">SKU</Label>
              <Input
                value={v.sku}
                onChange={(e) => onUpdate({ sku: e.target.value })}
                className="h-9 font-mono text-sm"
                placeholder="Auto-generated"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Price <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  value={v.price}
                  onChange={(e) => onUpdate({ price: e.target.value })}
                  className="h-9 pl-6 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Compare-at price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  value={v.compareAt}
                  onChange={(e) => onUpdate({ compareAt: e.target.value })}
                  className="h-9 pl-6 text-sm"
                  placeholder="—"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Cost price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  value={v.cost}
                  onChange={(e) => onUpdate({ cost: e.target.value })}
                  className="h-9 pl-6 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Weight (g)</Label>
              <Input
                value={v.weight}
                onChange={(e) => onUpdate({ weight: e.target.value })}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Initial stock</Label>
              <Input
                value={v.initialStock}
                onChange={(e) => onUpdate({ initialStock: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={v.allowBackorder}
              onChange={(e) => onUpdate({ allowBackorder: e.target.checked })}
              className="h-4 w-4 rounded border-border accent-amber-500"
            />
            <span className="text-sm">Allow backorder when out of stock</span>
          </label>
        </div>
      )}
    </div>
  );
}

// ─── Variant Options Card (define options, then generate) ───────────────────

export function VariantOptionsCard({
  options,
  onChange,
  onGenerate,
}: {
  options: OptionGroup[];
  onChange: (opts: OptionGroup[]) => void;
  onGenerate: () => void;
}) {
  const [inputs, setInputs] = React.useState<Record<string, string>>({});

  function updateOption(id: string, patch: Partial<OptionGroup>) {
    onChange(options.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  function commitValue(optId: string) {
    const raw = (inputs[optId] ?? "").trim().replace(/,+$/, "");
    if (!raw) return;
    const opt = options.find((o) => o.id === optId);
    if (!opt || opt.values.includes(raw)) return;
    updateOption(optId, { values: [...opt.values, raw] });
    setInputs((prev) => ({ ...prev, [optId]: "" }));
  }

  function removeValue(optId: string, value: string) {
    const opt = options.find((o) => o.id === optId);
    if (!opt) return;
    updateOption(optId, { values: opt.values.filter((v) => v !== value) });
  }

  function removeOption(id: string) {
    onChange(options.filter((o) => o.id !== id));
  }

  function addOption() {
    onChange([...options, { id: String(Date.now()), name: "", values: [] }]);
  }

  const totalCombinations = options
    .filter((o) => o.values.length > 0)
    .reduce((acc, o) => acc * o.values.length, 1);

  const canGenerate = options.some((o) => o.name.trim() && o.values.length > 0);

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <div>
          <p className="text-sm font-semibold">Variants</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Define options — combinations are generated automatically.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {options.map((opt, i) => (
          <div key={opt.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-5 shrink-0 items-end justify-center pb-1.5 text-xs font-medium text-muted-foreground">
                {i + 1}.
              </span>
              <Input
                value={opt.name}
                onChange={(e) => updateOption(opt.id, { name: e.target.value })}
                placeholder="Option name (e.g. Size)"
                className="h-8 flex-1 text-sm"
              />
              {options.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeOption(opt.id)}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div
              className="ml-7 flex min-h-[38px] cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
              onClick={(e) =>
                (
                  e.currentTarget.querySelector(
                    "input",
                  ) as HTMLInputElement | null
                )?.focus()
              }
            >
              {opt.values.map((val) => (
                <span
                  key={val}
                  className="group inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium"
                >
                  {val}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeValue(opt.id, val);
                    }}
                    className="-mr-0.5 ml-0.5 rounded-full p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                value={inputs[opt.id] ?? ""}
                onChange={(e) =>
                  setInputs((prev) => ({ ...prev, [opt.id]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    commitValue(opt.id);
                  } else if (
                    e.key === "Backspace" &&
                    !inputs[opt.id] &&
                    opt.values.length > 0
                  ) {
                    removeValue(opt.id, opt.values[opt.values.length - 1]);
                  }
                }}
                onBlur={() => commitValue(opt.id)}
                placeholder={
                  opt.values.length === 0
                    ? "Type a value, press Enter to add…"
                    : "Add…"
                }
                className="min-w-[140px] flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        ))}

        {options.length < 3 && (
          <div className="ml-7">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={addOption}
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Add another option
            </Button>
          </div>
        )}

        <Separator />

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {canGenerate
              ? `${totalCombinations} variant${totalCombinations !== 1 ? "s" : ""} will be generated`
              : "Add at least one option with values to continue."}
          </p>
          <Button
            size="sm"
            disabled={!canGenerate}
            className="h-8 px-4"
            onClick={onGenerate}
          >
            Generate variants
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Variant Builder Card (edit generated drafts) ───────────────────────────

export function VariantBuilderCard({
  variants,
  options,
  onUpdate,
  onDelete,
  onEditOptions,
}: {
  variants: VariantDraft[];
  options: OptionGroup[];
  onUpdate: (id: string, patch: Partial<VariantDraft>) => void;
  onDelete: (id: string) => void;
  onEditOptions: () => void;
}) {
  const [openId, setOpenId] = React.useState<string | null>(null);

  return (
    <Card className="overflow-hidden gap-0 py-0">
      <div className="flex items-center justify-between px-4 py-4">
        <div>
          <p className="text-sm font-semibold">Variants</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {variants.length} variants ·{" "}
            {options.map((o) => o.name).join(" × ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs">
            Bulk edit prices
          </Button>
        </div>
      </div>

      <Separator />

      <div className="flex flex-wrap items-center gap-2 bg-muted/30 px-4 py-3">
        <span className="text-xs font-medium text-muted-foreground">
          Options:
        </span>
        {options.map((o) => (
          <Badge
            key={o.id}
            variant="outline"
            className="bg-background text-xs font-medium"
          >
            {o.name}: {o.values.join(", ")}
          </Badge>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-7 text-xs text-muted-foreground hover:text-foreground"
          onClick={onEditOptions}
        >
          Edit options
        </Button>
      </div>

      <Separator />

      <div className="flex items-center gap-3 bg-muted/20 px-4 py-2.5">
        <div className="w-4 shrink-0" />
        <span className="flex-1 text-xs font-medium text-muted-foreground">
          Variant
        </span>
        <span className="hidden w-32 text-xs font-medium text-muted-foreground sm:block">
          SKU
        </span>
        <span className="w-20 text-right text-xs font-medium text-muted-foreground">
          Price
        </span>
        <span className="w-24 text-right text-xs font-medium text-muted-foreground">
          Stock
        </span>
        <span className="ml-3 w-9 text-center text-xs font-medium text-muted-foreground">
          Active
        </span>
        <div className="w-7 shrink-0" />
      </div>

      <Separator />

      <div>
        {variants.map((v) => (
          <VariantDraftRow
            key={v.id}
            v={v}
            isOpen={openId === v.id}
            onToggle={() => setOpenId(openId === v.id ? null : v.id)}
            onUpdate={(patch) => onUpdate(v.id, patch)}
            onDelete={() => onDelete(v.id)}
          />
        ))}
      </div>
    </Card>
  );
}

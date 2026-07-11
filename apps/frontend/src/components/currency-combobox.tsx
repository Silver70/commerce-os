import * as React from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "~/components/ui/combobox";
import { Flag } from "~/components/ui/flag";
import { CURRENCIES, currencyByCode, type Currency } from "~/lib/currencies";

// Searchable single-select over the full ISO-4217 list. Stores the 3-letter
// code but lets the user search by code or name ("sing" → Singapore Dollar).
// Each row shows a representative flag + code + name + symbol.
export function CurrencyCombobox({
  value,
  onChange,
  id,
  placeholder = "Select currency…",
  className,
}: {
  value: string;
  onChange: (code: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
}) {
  const selected = React.useMemo(() => currencyByCode(value) ?? null, [value]);

  return (
    <Combobox
      items={CURRENCIES}
      value={selected}
      onValueChange={(v: Currency | Currency[] | null) => {
        const next = Array.isArray(v) ? (v[0] ?? null) : v;
        onChange(next?.code ?? "");
      }}
      itemToStringLabel={(c: Currency) => `${c.code} — ${c.name}`}
      itemToStringValue={(c: Currency) => c.code}
    >
      <ComboboxInput
        id={id}
        placeholder={placeholder}
        showClear={!!selected}
        className={className}
      />
      <ComboboxContent>
        <ComboboxEmpty>No currency found.</ComboboxEmpty>
        <ComboboxList>
          {(c: Currency) => (
            <ComboboxItem key={c.code} value={c}>
              {c.flag ? (
                <Flag code={c.flag} />
              ) : (
                <span className="w-[1.333em] shrink-0" />
              )}
              <span className="w-9 shrink-0 font-mono text-xs text-muted-foreground">
                {c.code}
              </span>
              <span className="flex-1 truncate">{c.name}</span>
              {c.symbol && (
                <span className="shrink-0 text-muted-foreground">
                  {c.symbol}
                </span>
              )}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

import * as React from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "~/components/ui/combobox";
import { TIMEZONES, timezoneByValue, type Timezone } from "~/lib/timezones";

// Searchable single-select over the full IANA list, ordered by UTC offset.
// Stores the IANA id but lets the user search by city, region, offset, or id
// ("tokyo", "+9", "asia/tok"). Each row shows the offset + city + region.
export function TimezoneCombobox({
  value,
  onChange,
  id,
  placeholder = "Select timezone…",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
}) {
  const selected = React.useMemo(() => timezoneByValue(value) ?? null, [value]);

  return (
    <Combobox
      items={TIMEZONES}
      value={selected}
      onValueChange={(v: Timezone | Timezone[] | null) => {
        const next = Array.isArray(v) ? (v[0] ?? null) : v;
        onChange(next?.value ?? "");
      }}
      itemToStringLabel={(t: Timezone) => `${t.offsetLabel} — ${t.city}`}
      itemToStringValue={(t: Timezone) => t.value}
    >
      <ComboboxInput
        id={id}
        placeholder={placeholder}
        showClear={!!selected}
        className={className}
      />
      <ComboboxContent>
        <ComboboxEmpty>No timezone found.</ComboboxEmpty>
        <ComboboxList>
          {(t: Timezone) => (
            <ComboboxItem key={t.value} value={t}>
              <span className="w-17 shrink-0 font-mono text-xs text-muted-foreground">
                {t.offsetLabel}
              </span>
              <span className="flex-1 truncate">{t.city}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {t.region}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

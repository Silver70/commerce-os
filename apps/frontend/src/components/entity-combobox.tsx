import * as React from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "~/components/ui/combobox";

export type ComboboxOption = {
  id: string;
  label: string;
  /** Indent level for hierarchical lists (e.g. nested categories). */
  depth?: number;
};

/**
 * A searchable single-select that stores an entity id but lets the user pick by
 * name. Pass `onQueryChange` to delegate filtering to the caller (server-side
 * search); otherwise the list is filtered client-side as the user types.
 */
export function EntityCombobox({
  items,
  value,
  onChange,
  placeholder,
  emptyText = "No results.",
  onQueryChange,
  className,
}: {
  items: ComboboxOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  emptyText?: string;
  onQueryChange?: (query: string) => void;
  className?: string;
}) {
  // Remember the chosen option so its label stays in the input even when
  // `items` is replaced (server-side search returns a different result set).
  const [selected, setSelected] = React.useState<ComboboxOption | null>(null);

  React.useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    const match = items.find((i) => i.id === value);
    if (match) setSelected(match);
  }, [value, items]);

  const serverMode = !!onQueryChange;

  return (
    <Combobox
      items={items}
      value={selected}
      onValueChange={(v: ComboboxOption | ComboboxOption[] | null) => {
        const next = Array.isArray(v) ? (v[0] ?? null) : v;
        setSelected(next);
        onChange(next?.id ?? "");
      }}
      itemToStringValue={(item: ComboboxOption) => item.label}
      {...(serverMode ? { filter: null, onInputValueChange: onQueryChange } : {})}
    >
      <ComboboxInput
        placeholder={placeholder}
        showClear={!!selected}
        className={className}
      />
      <ComboboxContent>
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(item: ComboboxOption) => (
            <ComboboxItem key={item.id} value={item}>
              <span style={item.depth ? { paddingLeft: item.depth * 12 } : undefined}>
                {item.label}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

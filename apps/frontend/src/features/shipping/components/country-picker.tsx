import * as React from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import { Input } from "~/components/ui/input";
import { ALL_COUNTRIES, REGIONS } from "../constants";

export function CountryPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (codes: string[]) => void;
}) {
  const [search, setSearch] = React.useState("");

  const filtered = ALL_COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredByRegion = REGIONS.map((region) => ({
    region,
    countries: filtered.filter((c) => c.region === region),
  })).filter((g) => g.countries.length > 0);

  function toggle(code: string) {
    onChange(
      selected.includes(code)
        ? selected.filter((c) => c !== code)
        : [...selected, code],
    );
  }

  function selectRegion(region: string) {
    const codes = ALL_COUNTRIES.filter((c) => c.region === region).map(
      (c) => c.code,
    );
    const allSelected = codes.every((c) => selected.includes(c));
    if (allSelected) {
      onChange(selected.filter((c) => !codes.includes(c)));
    } else {
      onChange([...new Set([...selected, ...codes])]);
    }
  }

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((code) => {
            const country = ALL_COUNTRIES.find((c) => c.code === code);
            return (
              <span
                key={code}
                className="flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 text-xs font-medium"
              >
                {country?.name ?? code}
                <button
                  type="button"
                  onClick={() => toggle(code)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search countries…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 text-sm"
        />
      </div>

      <div className="max-h-56 overflow-y-auto rounded-lg border">
        {filteredByRegion.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No countries found.
          </p>
        ) : (
          filteredByRegion.map(({ region, countries }, gi) => {
            const regionCodes = ALL_COUNTRIES.filter(
              (c) => c.region === region,
            ).map((c) => c.code);
            const allRegionSelected = regionCodes.every((c) =>
              selected.includes(c),
            );
            return (
              <div key={region}>
                {gi > 0 && <div className="border-t" />}
                <div className="flex items-center justify-between bg-muted/30 px-3 py-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {region}
                  </span>
                  <button
                    type="button"
                    onClick={() => selectRegion(region)}
                    className="text-[11px] font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400"
                  >
                    {allRegionSelected ? "Deselect all" : "Select all"}
                  </button>
                </div>
                {countries.map((country) => (
                  <label
                    key={country.code}
                    className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-muted/20"
                    onClick={() => toggle(country.code)}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
                        selected.includes(country.code)
                          ? "border-amber-500 bg-amber-500"
                          : "border-border bg-transparent",
                      )}
                    >
                      {selected.includes(country.code) && (
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
                    <span className="flex-1 text-sm">{country.name}</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {country.code}
                    </span>
                  </label>
                ))}
              </div>
            );
          })
        )}
      </div>

      {selected.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selected.length} countr{selected.length === 1 ? "y" : "ies"} selected
        </p>
      )}
    </div>
  );
}

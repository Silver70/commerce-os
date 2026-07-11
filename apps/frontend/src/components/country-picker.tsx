import * as React from "react";
import { ChevronsUpDownIcon, SearchIcon, XIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Flag } from "~/components/ui/flag";
import { Input } from "~/components/ui/input";
import { ALL_COUNTRIES, REGIONS, countryName } from "~/lib/countries";

// ─── Inner picker ─────────────────────────────────────────────────────────────
// Search + region groups (with per-region select-all) + a responsive, flagged
// grid + selected chips. Used inline inside the shipping-zone Sheet and inside
// the onboarding Dialog. `heightClass` lets the caller size the scroll area to
// its container (a tall modal vs. a compact sheet).

export function CountryPicker({
  selected,
  onChange,
  heightClass = "max-h-56",
}: {
  selected: string[];
  onChange: (codes: string[]) => void;
  heightClass?: string;
}) {
  const [search, setSearch] = React.useState("");

  const q = search.trim().toLowerCase();
  const filtered = ALL_COUNTRIES.filter(
    (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
  );

  const groups = REGIONS.map((region) => ({
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
    onChange(
      allSelected
        ? selected.filter((c) => !codes.includes(c))
        : [...new Set([...selected, ...codes])],
    );
  }

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((code) => (
            <Badge key={code} variant="secondary" className="h-6 gap-1 pr-1">
              <Flag code={code} />
              {countryName(code)}
              <button
                type="button"
                onClick={() => toggle(code)}
                aria-label={`Remove ${countryName(code)}`}
                className="ml-0.5 rounded-sm opacity-60 transition-opacity hover:opacity-100"
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="relative">
        <SearchIcon className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search countries…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 text-sm"
        />
      </div>

      <div className={cn("overflow-y-auto rounded-lg border", heightClass)}>
        {groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No countries found.
          </p>
        ) : (
          groups.map(({ region, countries }, gi) => {
            const regionCodes = ALL_COUNTRIES.filter(
              (c) => c.region === region,
            ).map((c) => c.code);
            const allRegionSelected = regionCodes.every((c) =>
              selected.includes(c),
            );
            return (
              <div key={region}>
                {gi > 0 && <div className="border-t" />}
                <div className="sticky top-0 z-10 flex items-center justify-between bg-muted/60 px-3 py-1.5 backdrop-blur-sm">
                  <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
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
                <div className="grid grid-cols-1 sm:grid-cols-2">
                  {countries.map((country) => {
                    const isSelected = selected.includes(country.code);
                    return (
                      <label
                        key={country.code}
                        className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-muted/40"
                        onClick={() => toggle(country.code)}
                      >
                        <div
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
                            isSelected
                              ? "border-amber-500 bg-amber-500"
                              : "border-border bg-transparent",
                          )}
                        >
                          {isSelected && (
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
                        <Flag code={country.code} className="text-base" />
                        <span className="flex-1 truncate text-sm">
                          {country.name}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {country.code}
                        </span>
                      </label>
                    );
                  })}
                </div>
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

// ─── Dialog wrapper ───────────────────────────────────────────────────────────
// A trigger button + selected chips, opening the picker in a roomy modal.
// Used where the surrounding container is too narrow for a comfortable list
// (e.g. the onboarding step-2 column).

export function CountryPickerDialog({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (codes: string[]) => void;
}) {
  function remove(code: string) {
    onChange(selected.filter((c) => c !== code));
  }

  return (
    <div className="space-y-2">
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            size="lg"
            type="button"
            className="w-full justify-between font-normal text-muted-foreground"
          >
            {selected.length === 0
              ? "Select countries…"
              : `${selected.length} countr${selected.length === 1 ? "y" : "ies"} selected`}
            <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl gap-0 p-0">
          <DialogHeader className="border-b">
            <DialogTitle>Where do you ship?</DialogTitle>
            <DialogDescription>
              Pick every country you ship to. Use “Select all” to add a whole
              region at once.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <CountryPicker
              selected={selected}
              onChange={onChange}
              heightClass="max-h-[52vh]"
            />
          </div>
          <DialogFooter className="border-t">
            <DialogClose asChild>
              <Button className="w-full sm:w-auto">
                Done
                {selected.length > 0 ? ` · ${selected.length} selected` : ""}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((code) => (
            <Badge key={code} variant="secondary" className="h-6 gap-1 pr-1">
              <Flag code={code} />
              {countryName(code)}
              <button
                type="button"
                onClick={() => remove(code)}
                aria-label={`Remove ${countryName(code)}`}
                className="ml-0.5 rounded-sm opacity-60 transition-opacity hover:opacity-100"
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

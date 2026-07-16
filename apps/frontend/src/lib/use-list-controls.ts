import * as React from "react";
import { useDebouncedValue } from "./use-debounced-value";

/**
 * Shared state for a server-paginated admin list: search box, filter selects,
 * and the current page number.
 *
 * Two things this centralises:
 *
 * 1. Every state change runs inside a transition. The list pages key a
 *    `useSuspenseQuery` on these values, so without it, clicking page 2 would
 *    unmount the table and flash the route's Suspense fallback. In a transition
 *    React keeps the current page on screen until the next one has loaded.
 *
 * 2. Changing a filter or the search term resets to page 1. Holding page 7
 *    while the result set shrinks to two pages would otherwise land the user on
 *    an empty page.
 */
export function useListControls() {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, searchPending] = useDebouncedValue(search);
  const [page, setPage] = React.useState(1);
  const [filters, setFilters] = React.useState<Record<string, string>>({});
  const [isPending, startTransition] = React.useTransition();

  const goToPage = React.useCallback((next: number) => {
    startTransition(() => setPage(next));
  }, []);

  const setFilter = React.useCallback((key: string, value: string | null) => {
    startTransition(() => {
      setFilters((prev) => {
        const next = { ...prev };
        if (value === null) delete next[key];
        else next[key] = value;
        return next;
      });
      setPage(1);
    });
  }, []);

  // The debounced term lands after a delay, so page 1 has to be restored here
  // rather than in setSearch.
  React.useEffect(() => {
    startTransition(() => setPage(1));
  }, [debouncedSearch]);

  return {
    search,
    setSearch,
    /** Pass this to the query — never the raw `search`. */
    debouncedSearch,
    page,
    goToPage,
    filters,
    setFilter,
    /** True while typing or while a page/filter transition is in flight. */
    pending: isPending || searchPending,
  };
}

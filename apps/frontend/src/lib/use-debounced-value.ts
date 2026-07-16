import * as React from "react";

/**
 * Debounces `value`, applying the update inside a transition.
 *
 * The transition matters: list pages key a `useSuspenseQuery` on the result, and
 * without it every keystroke would suspend and drop the whole table to the
 * route's Suspense fallback. Inside a transition React keeps the previous
 * results on screen while the next ones load.
 *
 * Returns the debounced value and whether it is still catching up with `value`.
 */
export function useDebouncedValue<T>(value: T, delay = 300): [T, boolean] {
  const [debounced, setDebounced] = React.useState(value);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => setDebounced(value));
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return [debounced, isPending || debounced !== value];
}

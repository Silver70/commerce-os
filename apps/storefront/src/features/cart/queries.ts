import { queryOptions } from "@tanstack/react-query";
import { getCartServerFn } from "./server";

/** The single cart query key. Mutations invalidate exactly this key. */
export const CART_QUERY_KEY = ["cart"] as const;

export const cartQueryOptions = () =>
  queryOptions({
    queryKey: CART_QUERY_KEY,
    queryFn: () => getCartServerFn(),
    // Cart is mutated frequently and must reflect server truth (prices,
    // discounts, totals) — keep it always fresh.
    staleTime: 0,
  });

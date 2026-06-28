import type { Cart } from "~/types/api";

/** Total number of units across all cart lines (for the header badge). */
export function itemCount(cart: Cart | null | undefined): number {
  return cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
}

/**
 * Optimistically apply a quantity change to a cached cart so the stepper feels
 * instant. This is a transient estimate (discounts can't be recomputed on the
 * client) — the server's authoritative cart replaces it when the mutation
 * resolves. Quantity ≤ 0 removes the line.
 */
export function optimisticQuantity(
  cart: Cart,
  itemId: string,
  quantity: number,
): Cart {
  const items =
    quantity <= 0
      ? cart.items.filter((item) => item.id !== itemId)
      : cart.items.map((item) =>
          item.id === itemId
            ? { ...item, quantity, totalPrice: item.unitPrice * quantity }
            : item,
        );
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const total = Math.max(0, subtotal - cart.discountAmount);
  return { ...cart, items, subtotal, total };
}

/** Optimistically remove a line, recomputing the rough subtotal/total. */
export function optimisticRemove(cart: Cart, itemId: string): Cart {
  return optimisticQuantity(cart, itemId, 0);
}

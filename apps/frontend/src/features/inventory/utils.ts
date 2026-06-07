import type { InventoryItem, StockStatus } from "~/types/api";

/** Sellable quantity = on-hand minus reserved. */
export function available(item: InventoryItem): number {
  return item.quantity - item.reserved;
}

/** Classify an item as out / low / ok based on its available quantity. */
export function stockStatus(item: InventoryItem): StockStatus {
  const avail = available(item);
  if (avail === 0) return "out";
  if (avail <= item.lowStockThreshold) return "low";
  return "ok";
}

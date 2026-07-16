import { createFileRoute } from "@tanstack/react-router";
import { inventoryQueryOptions } from "~/features/inventory/queries";
import { InventoryPage } from "~/features/inventory/pages/inventory-page";
import { PAGE_SIZE } from "~/types/api";

export const Route = createFileRoute("/admin/inventory")({
  // Must match the page's initial query params exactly, or the key differs and
  // this prefetch is thrown away.
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(
      inventoryQueryOptions({ page: 1, limit: PAGE_SIZE }),
    ),
  component: InventoryPage,
});

import { createFileRoute } from "@tanstack/react-router";
import { inventoryQueryOptions } from "~/features/inventory/queries";
import { InventoryPage } from "~/features/inventory/pages/inventory-page";

export const Route = createFileRoute("/admin/inventory")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(inventoryQueryOptions()),
  component: InventoryPage,
});

import { createFileRoute } from "@tanstack/react-router";
import {
  organizationQueryOptions,
  storesQueryOptions,
} from "~/features/settings/queries";
import { SettingsPage } from "~/features/settings/pages/settings-page";

export const Route = createFileRoute("/admin/settings")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(storesQueryOptions()),
      context.queryClient.ensureQueryData(organizationQueryOptions()),
    ]),
  component: SettingsPage,
});

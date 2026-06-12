import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LoaderCircleIcon,
  UserIcon,
  UsersRoundIcon,
  XIcon,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { PriceListAssignment } from "~/types/api";
import { customerGroupsQueryOptions } from "~/features/customer-groups/queries";
import { customersQueryOptions } from "~/features/customers/queries";
import { priceListQueryOptions } from "../queries";
import { createAssignmentServerFn, deleteAssignmentServerFn } from "../server";

type Target = "group" | "customer";

export function AssignmentManager({
  priceListId,
  assignments,
}: {
  priceListId: string;
  assignments: PriceListAssignment[];
}) {
  const queryClient = useQueryClient();
  const [target, setTarget] = React.useState<Target>("group");
  const [selectedId, setSelectedId] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const groupsQuery = useQuery(customerGroupsQueryOptions());
  const customersQuery = useQuery(customersQueryOptions());
  const groups = groupsQuery.data ?? [];
  const customers = customersQuery.data ?? [];

  const groupName = (id: string) =>
    groups.find((g) => g.id === id)?.name ?? `Group ${id.slice(0, 8)}`;
  const customerLabel = (id: string) => {
    const c = customers.find((x) => x.id === id);
    if (!c) return `Customer ${id.slice(0, 8)}`;
    const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
    return name || c.email;
  };

  const attachMutation = useMutation({
    mutationFn: () =>
      createAssignmentServerFn({
        data: {
          priceListId,
          ...(target === "group"
            ? { groupId: selectedId }
            : { customerId: selectedId }),
        },
      }),
    onSuccess: () => {
      setSelectedId("");
      setError(null);
      queryClient.invalidateQueries({
        queryKey: priceListQueryOptions(priceListId).queryKey,
      });
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Failed to attach"),
  });

  const detachMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      deleteAssignmentServerFn({ data: { priceListId, assignmentId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: priceListQueryOptions(priceListId).queryKey,
      });
    },
  });

  const options = target === "group" ? groups : customers;

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Assigned To
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        {/* Current assignments */}
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Not assigned to anyone yet. Attach a group or customer below.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {assignments.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2.5 rounded-md border px-3 py-2"
              >
                {a.groupId ? (
                  <UsersRoundIcon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="flex-1 text-sm">
                  {a.groupId
                    ? groupName(a.groupId)
                    : a.customerId
                      ? customerLabel(a.customerId)
                      : "Unknown"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {a.groupId ? "Group" : "Customer"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  disabled={detachMutation.isPending}
                  onClick={() => detachMutation.mutate(a.id)}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Attach control */}
        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <select
            value={target}
            onChange={(e) => {
              setTarget(e.target.value as Target);
              setSelectedId("");
            }}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="group">Group</option>
            <option value="customer">Customer</option>
          </select>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="h-9 min-w-48 flex-1 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">
              Select a {target === "group" ? "group" : "customer"}…
            </option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {target === "group" ? groupName(o.id) : customerLabel(o.id)}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            disabled={!selectedId || attachMutation.isPending}
            onClick={() => attachMutation.mutate()}
            className="bg-orange-700 text-white hover:bg-orange-800 disabled:opacity-50"
          >
            {attachMutation.isPending ? (
              <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Attach"
            )}
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

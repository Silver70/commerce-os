import * as React from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Trash2Icon, PlusIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { CustomerGroup } from "~/types/api";
import { customerGroupsQueryOptions } from "../queries";
import {
  createCustomerGroupServerFn,
  deleteCustomerGroupServerFn,
} from "../server";

export function CustomerGroupsPage() {
  const queryClient = useQueryClient();
  const groups: CustomerGroup[] = useSuspenseQuery(
    customerGroupsQueryOptions(),
  ).data;

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({
      queryKey: customerGroupsQueryOptions().queryKey,
    });
  }

  const createMutation = useMutation({
    mutationFn: () =>
      createCustomerGroupServerFn({
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
        },
      }),
    onSuccess: () => {
      setName("");
      setDescription("");
      setError(null);
      invalidate();
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Failed to create group"),
  });

  const deleteMutation = useMutation({
    mutationFn: (groupId: string) =>
      deleteCustomerGroupServerFn({ data: { groupId } }),
    onSuccess: invalidate,
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Failed to delete group"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Customer groups</h1>
        <p className="text-sm text-muted-foreground">
          Organize customers into groups for contract pricing.
          <span className="ml-1">({groups.length} total)</span>
        </p>
      </div>

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-sm font-semibold">
            Create a group
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) createMutation.mutate();
            }}
          >
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="cg-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cg-name"
                placeholder="Wholesale"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="cg-description">Description</Label>
              <Input
                id="cg-description"
                placeholder="Optional"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="gap-2 bg-orange-700 text-white hover:bg-orange-800"
              disabled={!name.trim() || createMutation.isPending}
            >
              <PlusIcon className="h-4 w-4" />
              Add group
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card className="overflow-hidden py-0">
        {groups.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No customer groups yet.
          </p>
        ) : (
          <div className="divide-y">
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between gap-4 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{group.name}</p>
                  {group.description && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {group.description}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(group.id)}
                >
                  <Trash2Icon className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

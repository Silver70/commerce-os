import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import type { Customer } from "~/types/api";
import { customerGroupsQueryOptions } from "~/features/customer-groups/queries";
import { customerQueryOptions, customersQueryOptions } from "../queries";
import { updateCustomerServerFn } from "../server";

const NO_GROUP = "__none__";

export function EditCustomerSheet({ customer }: { customer: Customer }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [firstName, setFirstName] = React.useState(customer.firstName ?? "");
  const [lastName, setLastName] = React.useState(customer.lastName ?? "");
  const [phone, setPhone] = React.useState(customer.phone ?? "");
  const [groupId, setGroupId] = React.useState<string>(
    customer.groupId ?? NO_GROUP,
  );
  const [marketing, setMarketing] = React.useState(customer.marketingOptIn);
  const [error, setError] = React.useState<string | null>(null);

  const { data: groups = [] } = useQuery(customerGroupsQueryOptions());

  // Re-seed the form whenever a fresh customer record arrives.
  React.useEffect(() => {
    if (!open) {
      setFirstName(customer.firstName ?? "");
      setLastName(customer.lastName ?? "");
      setPhone(customer.phone ?? "");
      setGroupId(customer.groupId ?? NO_GROUP);
      setMarketing(customer.marketingOptIn);
      setError(null);
    }
  }, [open, customer]);

  const mutation = useMutation({
    mutationFn: () =>
      updateCustomerServerFn({
        data: {
          customerId: customer.id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          marketingOptIn: marketing,
          groupId: groupId === NO_GROUP ? null : groupId,
        },
      }),
    onSuccess: () => {
      setError(null);
      setOpen(false);
      queryClient.invalidateQueries({
        queryKey: customerQueryOptions(customer.id).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: customersQueryOptions().queryKey,
      });
    },
    onError: (err) =>
      setError(
        err instanceof Error ? err.message : "Failed to update customer",
      ),
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1.5">
          <PencilIcon className="h-3.5 w-3.5" />
          Edit details
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Edit customer</SheetTitle>
          <SheetDescription>
            Update profile details and group assignment.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ec-first-name">First name</Label>
              <Input
                id="ec-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-last-name">Last name</Label>
              <Input
                id="ec-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ec-phone">Phone</Label>
            <Input
              id="ec-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ec-group">Group</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger id="ec-group" className="w-full">
                <SelectValue placeholder="No group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_GROUP}>No group</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <label className="flex cursor-pointer items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Marketing emails</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Customer is opted {marketing ? "in" : "out"} of promotional
                emails.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMarketing((v) => !v)}
              className={cn(
                "relative mt-0.5 h-5 w-9 shrink-0 rounded-full border-2 transition-colors",
                marketing
                  ? "border-amber-500 bg-amber-500"
                  : "border-border bg-transparent",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-3 w-3 rounded-full transition-transform duration-200",
                  marketing
                    ? "left-0.5 translate-x-4 bg-white"
                    : "left-0.5 translate-x-0 bg-muted-foreground/40",
                )}
              />
            </button>
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <SheetFooter className="border-t">
          <SheetClose asChild>
            <Button variant="outline" className="flex-1 py-3">
              Cancel
            </Button>
          </SheetClose>
          <Button
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
            className="flex-1 bg-orange-700 py-3 text-white hover:bg-orange-800 disabled:opacity-50"
          >
            {mutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

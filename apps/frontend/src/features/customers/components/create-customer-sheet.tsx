import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, CopyIcon, CheckIcon } from "lucide-react";
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
import { customerGroupsQueryOptions } from "~/features/customer-groups/queries";
import { customersQueryOptions } from "../queries";
import { createCustomerServerFn } from "../server";

const NO_GROUP = "__none__";

/** Create-customer form. Creates an account with no password and returns a
 *  set-password link for the admin to share manually. */
export function CreateCustomerSheet() {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [groupId, setGroupId] = React.useState<string>(NO_GROUP);
  const [marketing, setMarketing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [createdLink, setCreatedLink] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const { data: groups = [] } = useQuery(customerGroupsQueryOptions());

  const canSubmit = email.trim().length > 0;

  const mutation = useMutation({
    mutationFn: () =>
      createCustomerServerFn({
        data: {
          email: email.trim(),
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          phone: phone.trim() || undefined,
          groupId: groupId === NO_GROUP ? undefined : groupId,
          marketingOptIn: marketing,
        },
      }),
    onSuccess: (result) => {
      setError(null);
      setCreatedLink(result.setPasswordUrl);
      queryClient.invalidateQueries({
        queryKey: customersQueryOptions().queryKey,
      });
    },
    onError: (err) =>
      setError(
        err instanceof Error ? err.message : "Failed to create customer",
      ),
  });

  function resetForm() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setGroupId(NO_GROUP);
    setMarketing(false);
    setError(null);
    setCreatedLink(null);
    setCopied(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetForm();
  }

  async function copyLink() {
    if (!createdLink) return;
    await navigator.clipboard.writeText(createdLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button className="gap-2 px-5 py-2.5">
          <PlusIcon className="h-4 w-4" />
          Add customer
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Add customer</SheetTitle>
          <SheetDescription>Create a new customer account.</SheetDescription>
        </SheetHeader>

        {createdLink ? (
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-900">
                Customer created
              </p>
              <p className="mt-1 text-xs text-emerald-800">
                Share this single-use link so they can set a password. It is
                shown only once.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cs-link">Set-password link</Label>
              <div className="flex gap-2">
                <Input id="cs-link" readOnly value={createdLink} />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 gap-1.5"
                  onClick={copyLink}
                >
                  {copied ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    <CopyIcon className="h-4 w-4" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cs-first-name">First name</Label>
                  <Input
                    id="cs-first-name"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cs-last-name">Last name</Label>
                  <Input
                    id="cs-last-name"
                    placeholder="Smith"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cs-email">
                  Email address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cs-email"
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cs-phone">
                  Phone{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="cs-phone"
                  type="tel"
                  placeholder="+1 555-0100"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cs-group">
                  Group{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Select value={groupId} onValueChange={setGroupId}>
                  <SelectTrigger id="cs-group" className="w-full">
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
            </div>

            <Separator />

            <label className="flex cursor-pointer items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Marketing emails</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Customer will be opted {marketing ? "in" : "out"} of
                  promotional emails.
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
        )}

        <SheetFooter className="border-t">
          {createdLink ? (
            <SheetClose asChild>
              <Button className="flex-1">Done</Button>
            </SheetClose>
          ) : (
            <>
              <SheetClose asChild>
                <Button variant="outline" className="flex-1">
                  Cancel
                </Button>
              </SheetClose>
              <Button
                disabled={!canSubmit || mutation.isPending}
                onClick={() => mutation.mutate()}
                className="flex-1"
              >
                {mutation.isPending ? "Creating…" : "Create customer"}
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

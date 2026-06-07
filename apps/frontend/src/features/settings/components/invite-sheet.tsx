import * as React from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
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
} from "~/components/ui/sheet";
import type { AdminRole } from "~/types/api";

export function InviteSheet({
  open,
  onOpenChange,
  onInvite,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onInvite: (email: string, role: AdminRole) => void;
}) {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<AdminRole>("product_manager");

  React.useEffect(() => {
    if (open) {
      setEmail("");
      setRole("product_manager");
    }
  }, [open]);

  const canInvite = email.trim().includes("@");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Invite team member</SheetTitle>
          <SheetDescription>
            They'll receive an email invite via WorkOS and can log in immediately
            after accepting.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 px-4 py-5 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="inv-email">
              Email address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="inv-email"
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AdminRole)}>
              <SelectTrigger id="inv-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="product_manager">Product Manager</SelectItem>
                <SelectItem value="support_agent">Support Agent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <SheetFooter className="border-t">
          <SheetClose asChild>
            <Button variant="outline" className="flex-1">
              Cancel
            </Button>
          </SheetClose>
          <Button
            disabled={!canInvite}
            className="flex-1 bg-orange-700 text-white shadow-none hover:bg-orange-800 disabled:opacity-50"
            onClick={() => {
              onInvite(email.trim(), role);
              onOpenChange(false);
            }}
          >
            Send invitation
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

import * as React from "react";
import {
  MoreHorizontalIcon,
  PlusIcon,
  RefreshCwIcon,
  UserIcon,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { AdminRole } from "~/types/api";
import { ROLE_LABELS } from "../constants";
import { RoleBadge } from "../components/role-badge";
import { InviteSheet } from "../components/invite-sheet";

// Mock data — WorkOS team management is out of scope for now.
type MockTeamMember = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  isYou?: boolean;
};
type MockInvitation = {
  id: string;
  email: string;
  role: AdminRole;
  sentDate: string;
};

const INITIAL_MEMBERS: MockTeamMember[] = [
  { id: "u1", name: "Silver", email: "jsameeu@gmail.com", role: "super_admin", isYou: true },
  { id: "u2", name: "Jane Park", email: "jane@surf.com", role: "product_manager" },
  { id: "u3", name: "Ali Hassan", email: "ali@surf.com", role: "support_agent" },
];

const INITIAL_INVITATIONS: MockInvitation[] = [
  { id: "i1", email: "mark@email.com", role: "product_manager", sentDate: "May 10, 2026" },
];

let nextMockId = 200;

export function TeamSettings() {
  const [members, setMembers] = React.useState<MockTeamMember[]>(INITIAL_MEMBERS);
  const [invitations, setInvitations] =
    React.useState<MockInvitation[]>(INITIAL_INVITATIONS);
  const [inviteOpen, setInviteOpen] = React.useState(false);

  function handleInvite(email: string, role: AdminRole) {
    setInvitations((prev) => [
      ...prev,
      { id: `i${nextMockId++}`, email, role, sentDate: "May 22, 2026" },
    ]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Team</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Team management via WorkOS — full integration coming in a future
            release.
          </p>
        </div>
        <Button
          className="gap-2 px-5"
          onClick={() => setInviteOpen(true)}
        >
          <PlusIcon className="h-4 w-4" />
          Invite member
        </Button>
      </div>

      <Card className="overflow-hidden gap-0 py-0">
        <div className="grid grid-cols-[1fr_180px_160px_40px] items-center border-b bg-muted/20 px-5 py-2.5 text-xs font-medium text-muted-foreground">
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span />
        </div>
        {members.map((m, i) => (
          <div
            key={m.id}
            className={cn(
              "grid grid-cols-[1fr_180px_160px_40px] items-center px-5 py-3.5",
              i < members.length - 1 && "border-b border-border/50",
            )}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {m.name[0]}
              </div>
              <span className="text-sm font-medium">
                {m.name}
                {m.isYou && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    (you)
                  </span>
                )}
              </span>
            </div>
            <span className="text-sm text-muted-foreground truncate pr-4">
              {m.email}
            </span>
            <RoleBadge role={m.role} />
            <div className="flex justify-end">
              {!m.isYou && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                    >
                      <MoreHorizontalIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      onClick={() =>
                        setMembers((prev) =>
                          prev.map((mem) =>
                            mem.id === m.id
                              ? {
                                  ...mem,
                                  role:
                                    mem.role === "product_manager"
                                      ? "support_agent"
                                      : "product_manager",
                                }
                              : mem,
                          ),
                        )
                      }
                    >
                      Change role
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() =>
                        setMembers((prev) => prev.filter((mem) => mem.id !== m.id))
                      }
                    >
                      Remove from team
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        ))}
      </Card>

      {invitations.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Pending invitations
          </p>
          <Card className="overflow-hidden gap-0 py-0">
            {invitations.map((inv, i) => (
              <div
                key={inv.id}
                className={cn(
                  "flex items-center gap-4 px-5 py-3.5",
                  i < invitations.length - 1 && "border-b border-border/50",
                )}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/40 text-muted-foreground">
                  <UserIcon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[inv.role]} · Sent {inv.sentDate}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs gap-1"
                  >
                    <RefreshCwIcon className="h-3 w-3" />
                    Resend
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 text-xs text-destructive hover:text-destructive"
                    onClick={() =>
                      setInvitations((prev) => prev.filter((i) => i.id !== inv.id))
                    }
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      <InviteSheet
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvite={handleInvite}
      />
    </div>
  );
}

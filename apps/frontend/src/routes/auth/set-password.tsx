import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2Icon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { setPasswordServerFn } from "~/features/customers/server";

export const Route = createFileRoute("/auth/set-password")({
  validateSearch: (search: Record<string, unknown>): { token: string } => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: SetPasswordPage,
});

function SetPasswordPage() {
  const { token } = Route.useSearch();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => setPasswordServerFn({ data: { token, password } }),
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Failed to set password"),
  });

  const passwordsMatch = password.length >= 8 && password === confirm;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!passwordsMatch) {
      setError("Passwords must match and be at least 8 characters.");
      return;
    }
    mutation.mutate();
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {mutation.isSuccess ? (
          <div className="space-y-3 text-center">
            <CheckCircle2Icon className="mx-auto h-10 w-10 text-emerald-600" />
            <h1 className="text-xl font-semibold">Password set</h1>
            <p className="text-sm text-muted-foreground">
              Your password for {mutation.data.email} is ready. You can now sign
              in.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-semibold">Set your password</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a password to activate your account.
              </p>
            </div>

            {!token ? (
              <p className="text-sm text-destructive">
                This link is missing its token. Ask your account manager to
                resend it.
              </p>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <Label htmlFor="sp-password">New password</Label>
                  <Input
                    id="sp-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sp-confirm">Confirm password</Label>
                  <Input
                    id="sp-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter password"
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!passwordsMatch || mutation.isPending}
                >
                  {mutation.isPending ? "Setting password…" : "Set password"}
                </Button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

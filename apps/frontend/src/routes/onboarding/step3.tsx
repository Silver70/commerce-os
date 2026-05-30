import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2Icon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  TriangleAlertIcon,
  PackagePlusIcon,
  LayoutDashboardIcon,
  ChevronRightIcon,
  LoaderCircleIcon,
} from "lucide-react";
import { Logo } from "~/components/Logo";
import { Button } from "~/components/ui/button";
import { createApiKeyServerFn } from "~/server/auth";
import { clearOnboardingCookieServerFn } from "~/server/stores";

export const Route = createFileRoute("/onboarding/step3")({
  component: OnboardingStep3,
});

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-8">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className={`rounded-full transition-all duration-300 ${
            n === current
              ? "w-5 h-2 bg-foreground"
              : n < current
                ? "w-2 h-2 bg-muted-foreground/50"
                : "w-2 h-2 bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

type KeyState =
  | { status: "loading" }
  | { status: "ready"; key: string }
  | { status: "error"; message: string };

function OnboardingStep3() {
  const navigate = useNavigate();
  const [revealed, setRevealed] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [keyState, setKeyState] = React.useState<KeyState>({
    status: "loading",
  });

  React.useEffect(() => {
    let cancelled = false;

    createApiKeyServerFn({ data: { name: "Default Storefront Key" } })
      .then(async (result) => {
        if (!cancelled) {
          setKeyState({ status: "ready", key: result.rawKey });
          // Onboarding complete — clear the step cookie (fire-and-forget)
          clearOnboardingCookieServerFn().catch(() => {});
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to generate API key";
          setKeyState({ status: "error", message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSkip() {
    await clearOnboardingCookieServerFn();
    void navigate({ to: "/admin/dashboard" });
  }

  async function handleCopy() {
    if (keyState.status !== "ready") return;
    try {
      await navigator.clipboard.writeText(keyState.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (HTTP context) — reveal the key so user can select manually
      setRevealed(true);
    }
  }

  const displayKey = keyState.status === "ready" ? keyState.key : "";
  const maskedKey = displayKey
    ? `${displayKey.slice(0, 14)}${"•".repeat(24)}`
    : "•".repeat(38);

  return (
    <div className="flex flex-col flex-1 justify-center px-8 sm:px-16 py-12">
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-8">
          <Logo />
          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
              <CheckCircle2Icon className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                Your store is ready!
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                You can change any settings later
              </p>
            </div>
          </div>
        </div>

        <StepDots current={3} />

        <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-widest mb-5">
          Step 3 of 3 — You're all set
        </p>

        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              API key for storefronts
            </p>

            {keyState.status === "error" ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive">{keyState.message}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleSkip()}
                >
                  Skip for now — go to dashboard
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1 rounded-lg border border-input bg-muted/50 pl-3 pr-1 py-1">
                  {keyState.status === "loading" ? (
                    <span className="flex flex-1 items-center gap-2 text-xs text-muted-foreground">
                      <LoaderCircleIcon className="size-3 animate-spin" />
                      Generating key…
                    </span>
                  ) : (
                    <code className="flex-1 truncate font-mono text-xs text-foreground">
                      {revealed ? displayKey : maskedKey}
                    </code>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    type="button"
                    onClick={() => setRevealed((v) => !v)}
                    aria-label={revealed ? "Hide API key" : "Reveal API key"}
                    disabled={keyState.status !== "ready"}
                  >
                    {revealed ? <EyeOffIcon /> : <EyeIcon />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    type="button"
                    onClick={handleCopy}
                    aria-label="Copy API key"
                    disabled={keyState.status !== "ready"}
                  >
                    <CopyIcon />
                  </Button>
                </div>

                {copied && (
                  <p className="text-xs text-green-600 dark:text-green-400 pl-0.5">
                    Copied to clipboard
                  </p>
                )}

                <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5">
                  <TriangleAlertIcon className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Save this key now — it won't be shown again.
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="h-px bg-border" />

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground mb-3">
              What would you like to do first?
            </p>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full justify-start gap-3 h-auto py-3 px-4"
            >
              <Link to="/admin/products">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <PackagePlusIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Add your first product</p>
                  <p className="text-xs text-muted-foreground font-normal">
                    Start building your catalog
                  </p>
                </div>
                <ChevronRightIcon className="ml-auto h-4 w-4 text-muted-foreground" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full justify-start gap-3 h-auto py-3 px-4"
            >
              <Link to="/admin/dashboard">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <LayoutDashboardIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Go to dashboard</p>
                  <p className="text-xs text-muted-foreground font-normal">
                    Explore your new store
                  </p>
                </div>
                <ChevronRightIcon className="ml-auto h-4 w-4 text-muted-foreground" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

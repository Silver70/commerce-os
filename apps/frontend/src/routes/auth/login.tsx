import * as React from "react";
import {
  createFileRoute,
  redirect,
  useNavigate,
  Link,
} from "@tanstack/react-router";
import { z } from "zod";
import { Logo } from "~/components/Logo";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { adminLoginServerFn, getAdminSessionServerFn } from "~/server/auth";
import { safeRedirectPath } from "~/lib/safe-redirect";

export const Route = createFileRoute("/auth/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === "string" ? { redirect: search.redirect } : {},
  beforeLoad: async ({ search }) => {
    // Already signed in — skip the form.
    const session = await getAdminSessionServerFn();
    if (session) throw redirect({ href: safeRedirectPath(search.redirect) });
  },
  component: LoginPage,
});

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFields = z.infer<typeof loginSchema>;
type LoginErrors = Partial<Record<keyof LoginFields, string>>;

function LoginPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errors, setErrors] = React.useState<LoginErrors>({});
  const [apiError, setApiError] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setApiError("");

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: LoginErrors = {};
      for (const issue of result.error.issues) {
        fieldErrors[issue.path[0] as keyof LoginFields] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    setPending(true);
    try {
      await adminLoginServerFn({ data: result.data });
      void navigate({ href: safeRedirectPath(redirectTo) });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  // The split layout (hero image + this panel) comes from the /auth layout route.
  return (
    <div className="flex flex-col flex-1 justify-center px-8 sm:px-16 py-12">
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-8">
          <Logo />
          <h1 className="mt-6 text-2xl font-semibold text-foreground">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back — sign in to your dashboard
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-xs text-destructive pl-0.5">{errors.email}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">
              Password <span className="text-destructive">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p className="text-xs text-destructive pl-0.5">
                {errors.password}
              </p>
            )}
          </div>

          {apiError && <p className="text-sm text-destructive">{apiError}</p>}

          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={pending}
            >
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </div>
        </form>

        <p className="mt-6 text-sm text-muted-foreground text-center">
          Don&apos;t have an account?{" "}
          <Link
            to="/auth/signup"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

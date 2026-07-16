import * as React from "react";
import {
  createFileRoute,
  redirect,
  useNavigate,
  Link,
} from "@tanstack/react-router";
import { ChevronRightIcon } from "lucide-react";
import { z } from "zod";
import { Logo } from "~/components/Logo";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { adminRegisterServerFn, getAdminSessionServerFn } from "~/server/auth";

export const Route = createFileRoute("/auth/signup")({
  beforeLoad: async () => {
    const session = await getAdminSessionServerFn();
    if (session) throw redirect({ to: "/admin/dashboard" });
  },
  component: SignupPage,
});

const signupSchema = z.object({
  orgName: z.string().min(2, "Organization name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignupFields = z.infer<typeof signupSchema>;
type SignupErrors = Partial<Record<keyof SignupFields, string>>;

function SignupPage() {
  const navigate = useNavigate();

  const [orgName, setOrgName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errors, setErrors] = React.useState<SignupErrors>({});
  const [apiError, setApiError] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setApiError("");

    const result = signupSchema.safeParse({ orgName, email, password });
    if (!result.success) {
      const fieldErrors: SignupErrors = {};
      for (const issue of result.error.issues) {
        fieldErrors[issue.path[0] as keyof SignupFields] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    setPending(true);
    try {
      await adminRegisterServerFn({ data: result.data });
      // New org has no stores yet — /admin routes into onboarding step 1.
      void navigate({ to: "/admin" });
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
            Create your account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up your organization — you can add stores next
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="org-name">
              Organization name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="org-name"
              placeholder="Acme Inc."
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              aria-invalid={!!errors.orgName}
            />
            {errors.orgName && (
              <p className="text-xs text-destructive pl-0.5">
                {errors.orgName}
              </p>
            )}
          </div>

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
              autoComplete="new-password"
              placeholder="At least 8 characters"
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
              {pending ? "Creating account…" : "Create account"}
              {!pending && <ChevronRightIcon />}
            </Button>
          </div>
        </form>

        <p className="mt-6 text-sm text-muted-foreground text-center">
          Already have an account?{" "}
          <Link
            to="/auth/login"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

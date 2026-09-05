import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { passwordIssues } from "@/lib/tripwise/password";
import { Button, Field, Input } from "@/components/ui";
import { Logo } from "@/components/tripwise/logo";

export const Route = createFileRoute("/register")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({
    next: typeof s.next === "string" && s.next.startsWith("/") ? s.next : undefined,
  }),
  component: Register,
});

function Register() {
  const { next: nextParam } = Route.useSearch();
  const next = nextParam ?? "/";
  const { user, isPending } = useCurrentUserState();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const issues = useMemo(() => passwordIssues(password), [password]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (issues.length) {
      setError(`Password needs ${issues.join(", ")}.`);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const result = await authClient.signUp.email({ name, email, password, callbackURL: next });
      if (result.error) throw new Error(result.error.message || "Could not register.");
      window.location.assign(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 py-10">
      <div className="paper w-full max-w-md rounded-xl p-7 shadow-border">
        <Logo />
        <h1 className="mt-6 font-display text-3xl">Create account</h1>
        <p className="mt-1 mb-6 text-sm text-muted">Name, unique email, and a strong password.</p>
        {isPending ? (
          <div className="h-24 animate-pulse rounded-lg bg-bg-sunken" />
        ) : user ? (
          <p className="text-sm">
            Already signed in.{" "}
            <Link to="/" className="font-medium">
              Back to the board
            </Link>
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <Field label="Full name">
              <Input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
            </Field>
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </Field>
            <Field
              label="Password"
              hint="8+ characters, upper, lower, digit, and a special character."
            >
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </Field>
            {password ? (
              <ul className="text-xs text-muted">
                {["at least 8 characters", "one uppercase letter", "one lowercase letter", "one digit", "one special character"].map(
                  (rule) => (
                    <li key={rule} className={issues.includes(rule) ? "text-danger" : "text-ok"}>
                      {issues.includes(rule) ? "Needs" : "Has"} {rule}
                    </li>
                  ),
                )}
              </ul>
            ) : null}
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Creating…" : "Register"}
            </Button>
          </form>
        )}
        <p className="mt-5 text-sm text-muted">
          Already have an account?{" "}
          <Link to="/login" search={{ next }} className="font-medium text-fg">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

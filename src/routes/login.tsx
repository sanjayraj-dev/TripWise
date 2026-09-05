import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { UserButton } from "@/lib/auth/gates";
import { Button, Field, Input } from "@/components/ui";
import { Logo } from "@/components/tripwise/logo";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({
    next: typeof s.next === "string" && s.next.startsWith("/") ? s.next : undefined,
  }),
  component: Login,
});

function Login() {
  const { next: nextParam } = Route.useSearch();
  const next = nextParam ?? "/";
  const { user, isPending } = useCurrentUserState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await authClient.signIn.email({ email, password, callbackURL: next });
      if (result.error) throw new Error(result.error.message || "Could not sign in.");
      window.location.assign(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 py-10">
      <div className="paper w-full max-w-md rounded-xl p-7 shadow-border">
        <Logo />
        <h1 className="mt-6 font-display text-3xl">Sign in</h1>
        <p className="mt-1 mb-6 text-sm text-muted">Use your TripWise account, Google, or X.</p>

        {isPending ? (
          <div className="h-24 animate-pulse rounded-lg bg-bg-sunken" />
        ) : user ? (
          <div className="space-y-4">
            <p className="text-sm">
              You are already signed in as{" "}
              <span className="font-medium">{user.displayName ?? user.primaryEmail ?? "this account"}</span>.
            </p>
            <div className="flex flex-wrap gap-2">
              <a href={next} className="no-underline">
                <Button>Continue</Button>
              </a>
              <Link to="/journal" className="no-underline">
                <Button variant="secondary">Your journal</Button>
              </Link>
              <UserButton />
            </div>
          </div>
        ) : (
          <>
            {authEnabled ? (
              <div className="mb-5 grid gap-2">
                {GROK_PROVIDERS.map((p) => (
                  <Button
                    key={p.providerId}
                    variant="secondary"
                    onClick={() => signIn(p.providerId, { callbackURL: next })}
                  >
                    Continue with {p.label}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="mb-4 text-sm text-muted">Social sign-in is disabled.</p>
            )}
            <div className="mb-5 flex items-center gap-3 text-xs tracking-[0.16em] text-faint uppercase">
              <span className="h-px flex-1 bg-line" />
              or email
              <span className="h-px flex-1 bg-line" />
            </div>
            <form onSubmit={onEmail} className="space-y-3">
              <Field label="Email">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </Field>
              <Field label="Password">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </Field>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </Button>
            </form>
            <p className="mt-5 text-sm text-muted">
              New here?{" "}
              <Link to="/register" search={{ next }} className="font-medium text-fg">
                Create an account
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}

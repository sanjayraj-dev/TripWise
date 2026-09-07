import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button, Field, Logo, inputClass, passwordScore } from "../components/ui";

function AuthLayout({ title, kicker, children }: { title: string; kicker: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-navy p-12 text-paper lg:flex lg:flex-col">
        <img src="/art/cover-japan.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/70 to-navy/40" />
        <div className="relative z-10"><Logo light /></div>
        <div className="relative z-10 mt-auto max-w-md">
          <p className="text-xs uppercase tracking-[0.2em] text-terracotta">TripWise</p>
          <h2 className="serif mt-4 text-5xl leading-tight">A notebook that knows the itinerary.</h2>
          <p className="mt-4 text-paper/70">Destinations, days, money, stays, packing — held in one place.</p>
        </div>
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-terracotta/20 blur-3xl" />
        <div className="absolute -bottom-20 left-10 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
      </div>
      <div className="grain flex items-center justify-center bg-paper px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">{kicker}</p>
          <h1 className="serif mt-2 text-4xl text-ink">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("traveler@tripwise.dev");
  const [password, setPassword] = useState("TripWise@123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = await login(email, password);
      navigate(user.role === "admin" ? "/admin" : "/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Welcome back." kicker="Sign in">
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Field label="Email">
          <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password">
          <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-center text-sm text-ink-soft">
          New here?{" "}
          <Link to="/register" className="font-medium text-ink underline">
            Create an account
          </Link>
        </p>
        <p className="rounded-2xl bg-paper-2 px-4 py-3 text-xs leading-relaxed text-muted">
          Aria (owner): traveler@tripwise.dev / TripWise@123
          <br />
          Kenji (crew): kenji@tripwise.dev / TripWise@123
          <br />
          Meera: meera@tripwise.dev · Lucas: lucas@tripwise.dev
          <br />
          Admin: admin@tripwise.dev / TripWise@123
        </p>
      </form>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const score = passwordScore(password);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register(fullName, email, password);
      navigate("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Start a notebook." kicker="Create account">
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Field label="Full name">
          <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </Field>
        <Field label="Email">
          <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field
          label="Password"
          hint="At least 8 characters, with upper, lower, a digit, and a special character."
        >
          <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i < score ? "bg-sage" : "bg-line"}`} />
          ))}
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </Button>
        <p className="text-center text-sm text-ink-soft">
          Already have one?{" "}
          <Link to="/login" className="font-medium text-ink underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

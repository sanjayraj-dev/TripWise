import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AppShell } from "@/components/tripwise/app-shell";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { useCreateTrip } from "@/lib/tripwise/hooks";
import { CURRENCIES, todayISO } from "@/lib/utils";

export const Route = createFileRoute("/trips/new")({ component: NewTripPage });

function shift(days: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function NewTripPage() {
  const { user, isPending } = useCurrentUserState();
  const create = useCreateTrip();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(shift(5));
  const [budget, setBudget] = useState("50000");
  const [currency, setCurrency] = useState("INR");
  const [summary, setSummary] = useState("");
  const [visibility, setVisibility] = useState<"open" | "private">("open");
  const [maxCompanions, setMaxCompanions] = useState("6");

  if (isPending) {
    return (
      <AppShell>
        <div className="h-40 animate-pulse rounded-xl bg-bg-sunken" />
      </AppShell>
    );
  }
  if (!user) return <RedirectToSignIn />;

  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate(
      {
        title,
        startDate,
        endDate,
        budget: Number(budget),
        currency,
        summary,
        visibility,
        maxCompanions: Number(maxCompanions),
      },
      {
        onSuccess: (detail) => {
          void navigate({ to: "/trips/$tripId", params: { tripId: String(detail.trip.id) } });
        },
      },
    );
  }

  return (
    <AppShell>
      <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">New journey</p>
      <h1 className="mb-6 font-display text-4xl">Create a trip</h1>
      <form onSubmit={submit} className="paper grid max-w-2xl gap-4 rounded-xl p-6 shadow-border sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Kyoto Spring" required />
          </Field>
        </div>
        <Field label="Start">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </Field>
        <Field label="End">
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </Field>
        <Field label="Budget">
          <Input type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} required />
        </Field>
        <Field label="Currency">
          <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Visibility">
          <Select value={visibility} onChange={(e) => setVisibility(e.target.value as "open" | "private")}>
            <option value="open">Open — listed on the board</option>
            <option value="private">Private — only companions</option>
          </Select>
        </Field>
        <Field label="Party size (including you)">
          <Input type="number" min="1" max="20" value={maxCompanions} onChange={(e) => setMaxCompanions(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Summary" hint="This is what people read before they join.">
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Who it's for, pace, and what still needs a person."
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create trip"}
          </Button>
        </div>
      </form>
    </AppShell>
  );
}

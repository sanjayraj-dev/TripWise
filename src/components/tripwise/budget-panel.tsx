import type { FormEvent } from "react";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { Destination, Expense } from "@/lib/tripwise/types";
import { EXPENSE_CATEGORIES, formatDay, money, todayISO } from "@/lib/utils";
import { Button, Field, Input, Select } from "@/components/ui";

export function BudgetPanel({
  budget,
  currency,
  expenses,
  destinations,
  canEdit,
  onAdd,
  onRemove,
}: {
  budget: number;
  currency: string;
  expenses: Expense[];
  destinations: Destination[];
  canEdit: boolean;
  onAdd: (input: {
    category: string;
    amount: number;
    spentOn: string;
    note: string;
    tripStopId: number | null;
  }) => void;
  onRemove: (id: number) => void;
}) {
  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = budget - spent;
  const byCat = EXPENSE_CATEGORIES.map((cat) => ({
    cat,
    amount: expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.amount > 0);
  const maxCat = Math.max(1, ...byCat.map((c) => c.amount));

  const [category, setCategory] = useState<(typeof EXPENSE_CATEGORIES)[number]>("Food");
  const [amount, setAmount] = useState("");
  const [spentOn, setSpentOn] = useState(todayISO());
  const [note, setNote] = useState("");
  const [tripStopId, setTripStopId] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    onAdd({
      category,
      amount: value,
      spentOn,
      note,
      tripStopId: tripStopId ? Number(tripStopId) : null,
    });
    setAmount("");
    setNote("");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Budget" value={money(budget, currency)} />
        <Stat label="Spent" value={money(spent, currency)} />
        <Stat
          label="Remaining"
          value={money(remaining, currency)}
          warn={remaining < 0}
        />
      </div>

      {byCat.length ? (
        <div className="paper space-y-3 rounded-xl p-5 shadow-border">
          <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">By category</p>
          {byCat.map((row) => (
            <div key={row.cat}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{row.cat}</span>
                <span className="tabular-nums text-muted">{money(row.amount, currency)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-bg-sunken">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.round((row.amount / maxCat) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">No expenses yet — log the first one below.</p>
      )}

      {canEdit ? (
        <form onSubmit={submit} className="paper grid gap-3 rounded-xl p-5 shadow-border sm:grid-cols-2">
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Amount">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </Field>
          <Field label="Date">
            <Input type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)} required />
          </Field>
          <Field label="Destination">
            <Select value={tripStopId} onChange={(e) => setTripStopId(e.target.value)}>
              <option value="">Whole trip</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.city}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Note">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
            </Field>
          </div>
          <div>
            <Button type="submit">Add expense</Button>
          </div>
        </form>
      ) : null}

      <ul className="divide-y divide-line">
        {expenses.map((e) => (
          <li key={e.id} className="flex items-center gap-3 py-3">
            <div className="flex-1">
              <p className="text-sm font-medium">
                {e.category}
                {e.city ? <span className="text-muted"> · {e.city}</span> : null}
              </p>
              <p className="text-xs text-muted">
                {formatDay(e.spentOn)}
                {e.note ? ` · ${e.note}` : ""}
              </p>
            </div>
            <p className="tabular-nums text-sm">{money(e.amount, currency)}</p>
            {canEdit ? (
              <button
                type="button"
                className="text-faint hover:text-danger"
                onClick={() => {
                  if (confirm("Delete this expense?")) onRemove(e.id);
                }}
                aria-label="Delete expense"
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="paper rounded-xl p-4 shadow-border">
      <p className="text-xs font-medium tracking-[0.16em] text-muted uppercase">{label}</p>
      <p className={`mt-1 font-display text-2xl tabular-nums ${warn ? "text-danger" : ""}`}>{value}</p>
    </div>
  );
}

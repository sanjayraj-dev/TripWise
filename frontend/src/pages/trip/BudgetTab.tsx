import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { api } from "../../api/client";
import { Button, ConfirmDialog, Empty, Field, Modal, inputClass } from "../../components/ui";
import { money, prettyDate } from "../../lib";
import { EXPENSE_CATEGORIES, type Expense, type TripDetail } from "../../types";
import { BudgetBar } from "../../components/TripCard";

const COLORS = ["#E07A5F", "#1B2A4A", "#6B8F71", "#D4A373", "#3D4F73", "#B84A3A"];

export function BudgetTab({ trip, onChange }: { trip: TripDetail; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Expense | null>(null);
  const [del, setDel] = useState<Expense | null>(null);
  const [error, setError] = useState("");

  const byCat = EXPENSE_CATEGORIES.map((c) => ({
    name: c,
    value: trip.expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0),
  })).filter((x) => x.value > 0);

  async function save(e: React.FormEvent<HTMLFormElement>, exp?: Expense) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const body = {
      amount: Number(fd.get("amount")),
      category: String(fd.get("category")),
      expense_date: String(fd.get("expense_date")),
      description: String(fd.get("description") || ""),
      destination_id: Number(fd.get("destination_id")),
    };
    try {
      if (exp) await api(`/api/expenses/${exp.id}`, { method: "PUT", json: body });
      else await api(`/api/trips/${trip.id}/expenses`, { method: "POST", json: body });
      setOpen(false);
      setEdit(null);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save expense.");
    }
  }

  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-line bg-white/50 p-5 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">Remaining</p>
              <p className={`serif text-4xl ${trip.remaining < 0 ? "text-danger" : "text-ink"}`}>{money(trip.remaining)}</p>
              <p className="mt-1 text-sm text-ink-soft">{money(trip.spent)} spent of {money(trip.estimated_budget)}</p>
            </div>
            <Button onClick={() => { setError(""); setOpen(true); }} disabled={!trip.destinations.length}>Add expense</Button>
          </div>
          <div className="mt-4"><BudgetBar spent={trip.spent} budget={trip.estimated_budget} /></div>
        </div>
        <div className="rounded-3xl border border-line bg-white/50 p-5">
          {byCat.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={byCat} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3}>
                  {byCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => money(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-sm text-muted">No spend yet</p>
          )}
        </div>
      </div>
      <div className="mt-4"><Settlement tripId={trip.id} currency={trip.currency} /></div>

      {!trip.destinations.length ? (
        <div className="mt-4"><Empty title="Add a destination first" body="Expenses are recorded against a stop." /></div>
      ) : trip.expenses.length === 0 ? (
        <div className="mt-4"><Empty title="No expenses yet" body="Keep the budget honest as you go." action={<Button onClick={() => setOpen(true)}>Add expense</Button>} /></div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-3xl border border-line bg-white/50">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper-2 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">What</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Stop</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {trip.expenses.map((e) => (
                <tr key={e.id} className="border-t border-line">
                  <td className="px-4 py-3">{prettyDate(e.expense_date)}</td>
                  <td className="px-4 py-3">{e.description || "—"}</td>
                  <td className="px-4 py-3">{e.category}</td>
                  <td className="px-4 py-3">{e.city}</td>
                  <td className="px-4 py-3 text-right font-medium">{money(e.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="mr-2 underline" onClick={() => { setError(""); setEdit(e); }}>Edit</button>
                    <button className="text-danger underline" onClick={() => setDel(e)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open || !!edit} title={edit ? "Edit expense" : "Add expense"} onClose={() => { setOpen(false); setEdit(null); }}>
        <form onSubmit={(e) => save(e, edit ?? undefined)} className="space-y-4">
          <Field label="Amount">
            <input name="amount" type="number" min={1} step="1" className={inputClass} defaultValue={edit?.amount} required />
          </Field>
          <Field label="Category">
            <select name="category" className={inputClass} defaultValue={edit?.category ?? "Food"}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Destination">
            <select name="destination_id" className={inputClass} defaultValue={edit?.destination_id ?? trip.destinations[0]?.id}>
              {trip.destinations.map((d) => <option key={d.id} value={d.id}>{d.city}</option>)}
            </select>
          </Field>
          <Field label="Date">
            <input name="expense_date" type="date" className={inputClass} defaultValue={edit?.expense_date ?? trip.start_date} required />
          </Field>
          <Field label="Description">
            <input name="description" className={inputClass} defaultValue={edit?.description} />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full">Save expense</Button>
        </form>
      </Modal>
      <ConfirmDialog
        open={!!del}
        title="Delete this expense?"
        body="The remaining budget will update immediately."
        onClose={() => setDel(null)}
        onConfirm={async () => {
          if (!del) return;
          await api(`/api/expenses/${del.id}`, { method: "DELETE" });
          setDel(null);
          onChange();
        }}
      />
    </div>
  );
}

function Settlement({ tripId, currency }: { tripId: number; currency?: string }) {
  const q = useQuery({
    queryKey: ["settle", tripId],
    queryFn: () => api<{ total: number; share: number; balances: { user_id: number; full_name: string; paid: number; share: number; net: number }[] }>(`/api/trips/${tripId}/settlement`),
  });
  if (!q.data) return null;
  return (
    <div className="rounded-[1.6rem] border border-line bg-white/60 p-5">
      <h3 className="serif text-2xl">Split</h3>
      <p className="text-sm text-ink-soft">Equal share of {money(q.data.total, currency)} among the crew. Dummy pay lives in Later.</p>
      <ul className="mt-3 divide-y divide-line">
        {q.data.balances.map((b) => (
          <li key={b.user_id} className="flex items-center justify-between py-2 text-sm">
            <span>{b.full_name}</span>
            <span className={b.net < -1 ? "text-danger" : b.net > 1 ? "text-sage-dark" : ""}>
              {b.net >= 0 ? `is owed ${money(b.net, currency)}` : `owes ${money(-b.net, currency)}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

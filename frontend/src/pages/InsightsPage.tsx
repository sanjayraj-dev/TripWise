import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/client";
import { money } from "../lib";
import type { Insights } from "../types";

const COLORS = ["#E07A5F", "#1B2A4A", "#6B8F71", "#D4A373", "#3D4F73", "#B84A3A"];

export function InsightsPage() {
  const { data, isError, error, refetch } = useQuery({
    queryKey: ["insights"],
    queryFn: () => api<Insights>("/api/insights"),
  });
  if (isError) {
    return (
      <div className="rounded-[1.6rem] border border-line bg-white/70 p-8">
        <p className="text-sm text-red-600">{error instanceof Error ? error.message : "Could not load insights."}</p>
        <button type="button" className="mt-3 text-sm underline" onClick={() => refetch()}>
          Try again
        </button>
      </div>
    );
  }
  if (!data) return <div className="h-64 animate-pulse rounded-3xl bg-paper-2" />;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">Across the book</p>
      <h1 className="serif mt-2 text-5xl">Insights</h1>
      <p className="mt-2 text-ink-soft">Every trip you’ve kept or joined — nights, cities, and where the money went.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi n={String(data.trip_count)} l="Trips" />
        <Kpi n={String(data.nights)} l="Nights out" />
        <Kpi n={String(data.cities)} l="Cities" />
        <Kpi n={money(data.spent)} l="Lifetime spend" />
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section className="rounded-[1.6rem] border border-line bg-white/60 p-5">
          <h2 className="serif text-2xl">Spend by category</h2>
          <div className="h-64">
            {data.by_category.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.by_category} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3}>
                    {data.by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => money(Number(v))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptySpend />
            )}
          </div>
        </section>
        <section className="rounded-[1.6rem] border border-line bg-white/60 p-5">
          <h2 className="serif text-2xl">Spend by month</h2>
          <div className="h-64">
            {data.by_month.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.by_month}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => money(Number(v))} />
                  <Bar dataKey="value" fill="#E07A5F" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptySpend />
            )}
          </div>
        </section>
      </div>
      {!!data.top_cities.length && (
        <section className="mt-6 rounded-[1.6rem] border border-line bg-white/60 p-5">
          <h2 className="serif text-2xl">Cities you return to</h2>
          <ul className="mt-4 divide-y divide-line">
            {data.top_cities.map((c) => (
              <li key={c.label} className="flex items-center justify-between py-3 text-sm">
                <span>{c.label}</span>
                <span className="text-muted">{c.trips} trip{c.trips === 1 ? "" : "s"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function EmptySpend() {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-ink-soft">
      No expenses yet. Add a few on a trip’s Budget tab and they land here.
    </div>
  );
}

function Kpi({ n, l }: { n: string; l: string }) {
  return (
    <div className="rounded-[1.6rem] border border-line bg-white/70 p-5">
      <div className="serif text-3xl">{n}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted">{l}</div>
    </div>
  );
}

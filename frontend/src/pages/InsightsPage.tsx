import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/client";
import { money } from "../lib";
import type { Insights } from "../types";

const COLORS = ["#E07A5F", "#1B2A4A", "#6B8F71", "#D4A373", "#3D4F73", "#B84A3A"];

export function InsightsPage() {
  const { data } = useQuery({ queryKey: ["insights"], queryFn: () => api<Insights>("/api/insights") });
  if (!data) return <div className="h-64 animate-pulse rounded-3xl bg-paper-2" />;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">Across the book</p>
      <h1 className="serif mt-2 text-5xl">Insights</h1>
      <p className="mt-2 text-ink-soft">Every trip you’ve kept — nights, cities, and where the money went.</p>
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
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.by_category} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3}>
                  {data.by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => money(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="rounded-[1.6rem] border border-line bg-white/60 p-5">
          <h2 className="serif text-2xl">Spend by month</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data.by_month}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => money(v)} />
                <Bar dataKey="value" fill="#E07A5F" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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

function Kpi({ n, l }: { n: string; l: string }) {
  return (
    <div className="rounded-[1.6rem] border border-line bg-white/70 p-5">
      <div className="serif text-3xl">{n}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted">{l}</div>
    </div>
  );
}

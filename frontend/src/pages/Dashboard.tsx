import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Empty } from "../components/ui";
import { TripCardView } from "../components/TripCard";
import { ACTIVITY_TONES, daysUntil, greeting, money, prettyDate } from "../lib";
import type { Dashboard } from "../types";

export function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<Dashboard>("/api/trips/dashboard"),
  });

  const next = data?.upcoming[0];
  const until = next ? daysUntil(next.start_date) : null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">{greeting()}</p>
          <h1 className="serif mt-2 text-5xl text-ink">{user?.full_name.split(" ")[0]}</h1>
          <p className="mt-2 max-w-xl text-ink-soft">Briefing for the road ahead — countdown, money, the week, and how ready each trip actually is.</p>
        </div>
        <Link to="/app/trips" className="rounded-full bg-terracotta px-5 py-2.5 text-sm text-white">
          New trip
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat label="Trips in the book" value={String(data?.trip_count ?? "—")} />
        <Stat
          label="Next departure"
          value={until === null ? "—" : until > 0 ? `${until} days` : until === 0 ? "Today" : "On the road"}
          sub={next?.title}
        />
        <Stat
          label="Active remaining"
          value={data ? money(data.active_budget.remaining) : "—"}
          warn={(data?.active_budget.remaining ?? 0) < 0}
          sub={data ? `${money(data.active_budget.spent)} spent` : undefined}
        />
        <Stat label="Avg readiness" value={data ? `${Math.round(data.avg_readiness)}%` : "—"} />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <div className="flex items-end justify-between">
            <h2 className="serif text-3xl">On the board</h2>
            <Link to="/app/trips" className="text-sm text-ink-soft hover:text-ink">Library</Link>
          </div>
          {isLoading ? (
            <div className="mt-4 h-48 animate-pulse rounded-3xl bg-paper-2" />
          ) : data?.upcoming.length ? (
            <div className="mt-4 grid gap-4">
              {data.upcoming.map((t) => (
                <TripCardView key={t.id} trip={t} />
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <Empty
                title="Nothing on the calendar"
                body="Create a trip with a title and dates — you can fill the rest in under five minutes."
                action={<Link to="/app/trips" className="rounded-full bg-terracotta px-4 py-2 text-sm text-white">Plan a trip</Link>}
              />
            </div>
          )}
        </section>
        <aside className="lg:col-span-2">
          <h2 className="serif text-3xl">This week</h2>
          <div className="mt-4 space-y-2 rounded-[1.6rem] border border-line bg-white/60 p-4">
            {data?.week?.length ? (
              data.week.map((w) => (
                <Link key={`${w.trip_id}-${w.title}-${w.activity_date}`} to={`/app/trips/${w.trip_id}`} className="block rounded-2xl px-3 py-3 hover:bg-paper-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${ACTIVITY_TONES[w.category] ?? "bg-paper-3"}`}>
                      {w.category}
                    </span>
                    <span className="text-xs text-muted">{prettyDate(w.activity_date)}</span>
                  </div>
                  <p className="mt-1 font-medium">{w.title}</p>
                  <p className="text-xs text-ink-soft">{w.city} · {w.trip_title}{w.start_time ? ` · ${w.start_time}` : ""}</p>
                </Link>
              ))
            ) : (
              <p className="px-2 py-8 text-center text-sm text-muted">No activities in the next seven days.</p>
            )}
          </div>
          <Link to="/app/calendar" className="mt-3 inline-block text-sm text-ink underline">Open calendar →</Link>
        </aside>
      </div>

      {!!data?.completed.length && (
        <>
          <h2 className="serif mt-14 text-3xl">In the archive</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {data.completed.map((t) => (
              <TripCardView key={t.id} trip={t} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, warn = false, sub }: { label: string; value: string; warn?: boolean; sub?: string }) {
  return (
    <div className="rounded-[1.6rem] border border-line bg-white/70 p-5 shadow-[0_16px_40px_-32px_rgba(27,42,74,0.6)]">
      <div className="text-xs uppercase tracking-[0.16em] text-muted">{label}</div>
      <div className={`serif mt-2 text-3xl ${warn ? "text-danger" : "text-ink"}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-soft">{sub}</div>}
    </div>
  );
}

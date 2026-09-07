import { Link } from "react-router-dom";
import { coverArt, money, prettyDate, statusLabel, tripLength } from "../lib";
import type { TripCard as TripCardType } from "../types";

export function TripCardView({ trip }: { trip: TripCardType }) {
  const art = coverArt(trip.title, trip.cities);
  const ready = trip.readiness?.score ?? 0;
  return (
    <Link
      to={`/app/trips/${trip.id}`}
      className="group overflow-hidden rounded-[1.6rem] border border-line bg-white shadow-[0_18px_40px_-28px_rgba(27,42,74,0.55)] transition hover:-translate-y-1 hover:shadow-[0_28px_50px_-24px_rgba(27,42,74,0.45)]"
    >
      <div className="relative h-44 overflow-hidden">
        <img src={art} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/25 to-transparent" />
        <div className="absolute left-4 top-4 flex gap-2">
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] uppercase tracking-wider text-white backdrop-blur">
            {statusLabel(trip.status)}
          </span>
          {trip.trip_type && (
            <span className="rounded-full bg-terracotta/90 px-2.5 py-1 text-[11px] uppercase tracking-wider text-white">
              {trip.trip_type}
            </span>
          )}
        </div>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h3 className="serif text-2xl leading-tight">{trip.title}</h3>
          <p className="mt-1 text-sm text-white/75">{trip.cities.length ? trip.cities.join(" → ") : "Route not plotted"}</p>
        </div>
      </div>
      <div className="space-y-3 p-5">
        <div className="flex items-center justify-between text-sm text-ink-soft">
          <span>
            {prettyDate(trip.start_date)} — {prettyDate(trip.end_date)}
          </span>
          <span>{tripLength(trip.start_date, trip.end_date)} days</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Remaining</span>
          <span className={trip.remaining < 0 ? "font-semibold text-danger" : "font-semibold text-ink"}>
            {money(trip.remaining, trip.currency)}
          </span>
        </div>
        <BudgetBar spent={trip.spent} budget={trip.estimated_budget} />
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Readiness</span>
          <span className="font-medium text-ink">{ready}%</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-paper-3">
          <div className="h-full bg-terracotta" style={{ width: `${ready}%` }} />
        </div>
      </div>
    </Link>
  );
}

export function BudgetBar({ spent, budget }: { spent: number; budget: number }) {
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const over = budget > 0 && spent > budget;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-paper-3">
      <div className={`h-full rounded-full ${over ? "bg-danger" : "bg-sage"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

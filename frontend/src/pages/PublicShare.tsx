import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Logo } from "../components/ui";
import { coverArt, money, prettyDate } from "../lib";
import type { TripDetail } from "../types";

export function PublicShare() {
  const { token } = useParams();
  const q = useQuery({
    queryKey: ["public", token],
    queryFn: () => fetch(`/api/public/${token}`).then(async (r) => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Not found");
      return d as TripDetail;
    }),
  });
  if (q.isLoading) return <div className="grid min-h-screen place-items-center bg-paper">Loading briefing…</div>;
  if (q.error || !q.data) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper">
        <p className="text-ink-soft">This itinerary is private or the link has expired.</p>
      </div>
    );
  }
  const trip = q.data;
  const art = coverArt(trip.title, trip.cities);
  return (
    <div className="grain min-h-screen bg-paper pb-16">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
        <Logo />
        <span className="text-xs uppercase tracking-[0.16em] text-muted">Shared briefing</span>
      </header>
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2rem]">
        <img src={art} alt="" className="h-72 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/30 to-transparent" />
        <div className="absolute bottom-6 left-6 text-white">
          <h1 className="serif text-5xl">{trip.title}</h1>
          <p className="mt-2 text-white/80">{prettyDate(trip.start_date)} — {prettyDate(trip.end_date)} · {trip.cities.join(" → ")}</p>
        </div>
      </div>
      <main className="mx-auto mt-8 max-w-4xl space-y-6 px-6">
        <section className="rounded-[1.6rem] border border-line bg-white/60 p-5">
          <h2 className="serif text-2xl">Route</h2>
          <ol className="mt-3 space-y-2">
            {trip.destinations.map((d, i) => (
              <li key={d.id} className="text-sm">{i + 1}. {d.city}, {d.country} · {prettyDate(d.arrival_date)}–{prettyDate(d.departure_date)}</li>
            ))}
          </ol>
        </section>
        <section className="rounded-[1.6rem] border border-line bg-white/60 p-5">
          <h2 className="serif text-2xl">Days</h2>
          <div className="mt-3 space-y-3">
            {trip.activities.map((a) => (
              <div key={a.id} className="rounded-xl bg-paper px-4 py-3 text-sm">
                <div className="text-xs text-muted">{prettyDate(a.activity_date)} {a.start_time ?? ""} · {a.city}</div>
                <div className="font-medium">{a.title}</div>
              </div>
            ))}
          </div>
        </section>
        <p className="text-sm text-muted">Budget remaining {money(trip.remaining, trip.currency)} · this page hides packing checklists and document numbers.</p>
      </main>
    </div>
  );
}

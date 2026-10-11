import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Button, Empty, inputClass } from "../components/ui";
import { coverArt, prettyDate, tripLength } from "../lib";
import type { TripCard } from "../types";

export function DiscoverPage() {
  const qc = useQueryClient();
  const [city, setCity] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["discover", city],
    queryFn: () => api<TripCard[]>(`/api/discover${city ? `?city=${encodeURIComponent(city)}` : ""}`),
  });
  const carpool = useQuery({ queryKey: ["carpool"], queryFn: () => api<TripCard[]>("/api/carpool") });

  const join = useMutation({
    mutationFn: (id: number) => api<{ status: string; message: string }>(`/api/trips/${id}/join`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discover"] });
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">Find a crew</p>
      <h1 className="serif mt-2 text-5xl">Discover</h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        Public groups going where you’re going. Open groups let you join immediately; request groups wait for the owner.
      </p>

      <MatchScoreCard />

      <input
        className={inputClass + " mt-6 max-w-sm"}
        placeholder="Filter by city — Kyoto, Lisbon, Osaka…"
        value={city}
        onChange={(e) => setCity(e.target.value)}
      />
      {isLoading ? (
        <div className="mt-8 h-40 animate-pulse rounded-3xl bg-paper-2" />
      ) : data?.length ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {data.map((t) => (
            <DiscoverCard key={t.id} trip={t} onJoin={() => join.mutate(t.id)} busy={join.isPending} />
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <Empty title="No public groups match" body="Try another city, or publish one of your trips from the workspace." />
        </div>
      )}

      {!!carpool.data?.length && (
        <>
          <h2 className="serif mt-14 text-3xl">Rides & seats</h2>
          <p className="mt-1 text-sm text-ink-soft">Groups that still have seats or are looking for a ride to share.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {carpool.data.map((t) => (
              <DiscoverCard key={t.id} trip={t} onJoin={() => join.mutate(t.id)} busy={join.isPending} ride />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MatchScoreCard() {
  const [destination, setDestination] = useState("Kyoto");
  const [startDate, setStartDate] = useState("2026-10-10");
  const [endDate, setEndDate] = useState("2026-10-16");
  const [interests, setInterests] = useState("culture, leisure");
  const [seatsNeeded, setSeatsNeeded] = useState(1);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ matches: any[] }>("/api/match/design", {
        method: "POST",
        json: {
          destination,
          startDate,
          endDate,
          interests: interests.split(",").map((s) => s.trim()).filter(Boolean),
          seatsNeeded,
        },
      });
      setMatches(data.matches);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not rank trips");
    } finally {
      setLoading(false);
    }
  }

  const overlap = matches.filter((m) => m.bucket === "overlap");
  const nearby = matches.filter((m) => m.bucket === "nearby");

  return (
    <div className="mt-8 rounded-[1.6rem] border border-line bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">Design your trip</p>
      <h2 className="serif mt-1 text-3xl">Find overlapping crews</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Enter a destination and dates. The model ranks public trips by overlap, then nearby ones.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <input className={inputClass} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Destination" />
        <input className={inputClass} type="number" min={1} value={seatsNeeded} onChange={(e) => setSeatsNeeded(Number(e.target.value))} placeholder="Seats needed" />
        <input className={inputClass} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input className={inputClass} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <input className={inputClass + " sm:col-span-2"} value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="Interests — culture, leisure, adventure" />
      </div>

      <Button onClick={run} disabled={loading} className="mt-4">
        {loading ? "Ranking…" : "Find matches"}
      </Button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {!!overlap.length && (
        <>
          <h3 className="serif mt-6 text-2xl">Overlapping</h3>
          <MatchList items={overlap} />
        </>
      )}
      {!!nearby.length && (
        <>
          <h3 className="serif mt-6 text-2xl">Nearby, different dates</h3>
          <MatchList items={nearby} />
        </>
      )}
    </div>
  );
}

function MatchList({ items }: { items: any[] }) {
  return (
    <div className="mt-3 space-y-2">
      {items.map((m) => (
        <div key={m.tripId} className="flex items-center justify-between rounded-2xl bg-paper-2 px-4 py-3">
          <div>
            <div className="font-medium">{m.title}</div>
            <div className="text-sm text-ink-soft">
              {m.owner} · {(m.cities || []).join(", ")} · {m.startDate} → {m.endDate}
            </div>
            <div className="text-sm text-ink-soft">{m.reason}</div>
          </div>
          <div className="serif text-3xl">{m.score}</div>
        </div>
      ))}
    </div>
  );
}

function DiscoverCard({
  trip, onJoin, busy, ride,
}: { trip: TripCard; onJoin: () => void; busy: boolean; ride?: boolean }) {
  const art = coverArt(trip.title, trip.cities);
  const pending = trip.my_status === "pending";
  const member = trip.my_status === "active";
  return (
    <article className="overflow-hidden rounded-[1.6rem] border border-line bg-white shadow-[0_18px_40px_-28px_rgba(27,42,74,0.5)]">
      <div className="relative h-36">
        <img src={art} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/80 to-transparent" />
        <div className="absolute bottom-3 left-4 text-white">
          <h3 className="serif text-2xl">{trip.title}</h3>
          <p className="text-sm text-white/75">{trip.cities.join(" → ") || "Route TBA"}</p>
        </div>
      </div>
      <div className="space-y-3 p-5">
        <p className="text-sm text-ink-soft">
          {prettyDate(trip.start_date)} — {prettyDate(trip.end_date)} · {tripLength(trip.start_date, trip.end_date)} days
        </p>
        <p className="text-sm">
          {trip.member_count ?? 1} traveler{(trip.member_count ?? 1) === 1 ? "" : "s"}
          {trip.join_mode === "open" ? " · instant join" : " · request to join"}
          {ride && trip.seats ? ` · ${trip.seats} seats` : ""}
          {ride && trip.looking_for_ride ? " · looking for a ride" : ""}
        </p>
        <div className="flex gap-2">
          {member ? (
            <Link to={`/app/trips/${trip.id}`} className="rounded-full bg-ink px-4 py-2 text-sm text-paper">Open workspace</Link>
          ) : pending ? (
            <span className="text-sm text-muted">Request pending</span>
          ) : (
            <Button onClick={onJoin} disabled={busy}>{trip.join_mode === "open" ? "Join group" : "Request to join"}</Button>
          )}
        </div>
      </div>
    </article>
  );
}
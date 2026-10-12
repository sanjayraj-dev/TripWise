import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { MatchFinder } from "../components/MatchFinder";
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

  const bustCrew = () => {
    qc.invalidateQueries({ queryKey: ["discover"] });
    qc.invalidateQueries({ queryKey: ["trips"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["carpool"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const join = useMutation({
    mutationFn: (id: number) => api<{ status: string; message: string }>(`/api/trips/${id}/join`, { method: "POST" }),
    onSuccess: bustCrew,
  });
  const cancel = useMutation({
    mutationFn: (id: number) => api(`/api/trips/${id}/leave`, { method: "POST" }),
    onSuccess: bustCrew,
  });

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">Find a crew</p>
      <h1 className="serif mt-2 text-5xl">Discover</h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        Public groups going where you’re going. Request to join — the owner gets a notification and has to approve you before you see chat, budget, or the itinerary.
      </p>

      <MatchFinder />

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
            <DiscoverCard
              key={t.id}
              trip={t}
              onJoin={() => join.mutate(t.id)}
              onCancel={() => cancel.mutate(t.id)}
              busy={join.isPending || cancel.isPending}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <Empty title="No public groups match" body="Try another city, or publish one of your trips from the workspace." />
        </div>
      )}

      {join.isSuccess && join.data?.message && (
        <p className="mt-4 text-sm text-sage-dark">{join.data.message}</p>
      )}
      {join.isError && (
        <p className="mt-4 text-sm text-danger">{join.error instanceof Error ? join.error.message : "Could not send request."}</p>
      )}

      {!!carpool.data?.length && (
        <>
          <h2 className="serif mt-14 text-3xl">Rides & seats</h2>
          <p className="mt-1 text-sm text-ink-soft">Groups that still have seats or are looking for a ride to share.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {carpool.data.map((t) => (
              <DiscoverCard
                key={t.id}
                trip={t}
                onJoin={() => join.mutate(t.id)}
                onCancel={() => cancel.mutate(t.id)}
                busy={join.isPending || cancel.isPending}
                ride
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DiscoverCard({
  trip, onJoin, onCancel, busy, ride,
}: { trip: TripCard; onJoin: () => void; onCancel: () => void; busy: boolean; ride?: boolean }) {
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
          {" · request to join"}
          {ride && trip.seats ? ` · ${trip.seats} seats` : ""}
          {ride && trip.looking_for_ride ? " · looking for a ride" : ""}
        </p>
        <div className="flex gap-2">
          {member ? (
            <Link to={`/app/trips/${trip.id}`} className="rounded-full bg-ink px-4 py-2 text-sm text-paper">Open workspace</Link>
          ) : pending ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted">Request pending</span>
              <button type="button" className="text-xs text-ink-soft underline" onClick={onCancel} disabled={busy}>
                Cancel
              </button>
            </div>
          ) : (
            <Button onClick={onJoin} disabled={busy}>Request to join</Button>
          )}
        </div>
      </div>
    </article>
  );
}
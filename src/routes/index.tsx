import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/tripwise/app-shell";
import { TripCard } from "@/components/tripwise/trip-card";
import { Button, Input, SectionTitle } from "@/components/ui";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listOpenTrips } from "@/lib/tripwise/api";
import { useJoinTrip, useOpenTrips } from "@/lib/tripwise/hooks";
import { tripStatus } from "@/lib/utils";

export const Route = createFileRoute("/")({
  loader: () => listOpenTrips(),
  component: Home,
});

function Home() {
  const seeded = Route.useLoaderData();
  const { data: trips = seeded } = useOpenTrips();
  const { user, isPending: authPending } = useCurrentUserState();
  const join = useJoinTrip();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "upcoming" | "ongoing">("all");

  const { openNow, past } = useMemo(() => {
    const list = trips ?? [];
    const filtered = list.filter((t) => {
      const hay = `${t.title} ${t.summary} ${t.cities.join(" ")} ${t.ownerName}`.toLowerCase();
      if (query.trim() && !hay.includes(query.trim().toLowerCase())) return false;
      const status = tripStatus(t.startDate, t.endDate);
      if (filter !== "all" && status !== filter) return false;
      return true;
    });
    return {
      openNow: filtered.filter((t) => tripStatus(t.startDate, t.endDate) !== "completed"),
      past: filtered.filter((t) => tripStatus(t.startDate, t.endDate) === "completed"),
    };
  }, [trips, query, filter]);

  function onJoin(id: number) {
    if (authPending) return;
    if (!user) {
      void navigate({ to: "/login", search: { next: `/trips/${id}` } });
      return;
    }
    join.mutate(id, {
      onSuccess: (detail) => {
        void navigate({ to: "/trips/$tripId", params: { tripId: String(detail.trip.id) } });
      },
    });
  }

  return (
    <AppShell>
      <section className="overflow-hidden rounded-xl shadow-border">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col justify-center gap-5 p-6 sm:p-10">
            <p className="text-xs font-medium tracking-[0.22em] text-muted uppercase">Open board</p>
            <h1 className="font-display text-4xl leading-[1.05] text-fg sm:text-5xl">
              Journeys you can actually join.
            </h1>
            <p className="max-w-md text-pretty text-muted">
              Browse live trips, take an empty seat, and plan the days together — destinations,
              itinerary, budget, stays, notes, and the packing kit.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#board" className="no-underline">
                <Button variant="primary">Browse trips</Button>
              </a>
              <Link to="/trips/new" className="no-underline">
                <Button variant="secondary">Start a trip</Button>
              </Link>
              {!user && !authPending ? (
                <Link to="/login" className="no-underline">
                  <Button variant="ghost">Sign in</Button>
                </Link>
              ) : null}
            </div>
          </div>
          <div className="relative min-h-56">
            <img src="/hero.jpg" alt="Hand-drawn travel map" className="size-full object-cover" />
          </div>
        </div>
      </section>

      <section id="board" className="mt-12">
        <SectionTitle
          kicker="Everyone is welcome"
          title="Open trips"
          action={
            <div className="flex flex-wrap gap-2">
              {(["all", "upcoming", "ongoing"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={
                    filter === key
                      ? "h-9 rounded-full bg-primary px-3 text-sm text-primary-fg"
                      : "h-9 rounded-full bg-bg-sunken px-3 text-sm text-muted"
                  }
                >
                  {key === "all" ? "All open" : key}
                </button>
              ))}
            </div>
          }
        />
        <div className="relative mb-6 max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city, title, host…"
            className="pl-9"
          />
        </div>

        {openNow.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {openNow.map((trip) => (
              <TripCard key={trip.id} trip={trip} onJoin={onJoin} joining={join.isPending} />
            ))}
          </div>
        ) : (
          <p className="paper rounded-xl p-8 text-sm text-muted shadow-border">
            No open trips match that. Start one and leave the extra seats on the board.
          </p>
        )}
      </section>

      {past.length ? (
        <section className="mt-14">
          <SectionTitle kicker="Closed journals" title="Past journeys" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}

import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, Users } from "lucide-react";
import type { Trip } from "@/lib/tripwise/types";
import { formatDayShort, money, tripStatus } from "@/lib/utils";
import { Badge, Button } from "@/components/ui";

const statusTone = {
  upcoming: "moss",
  ongoing: "accent",
  completed: "ink",
} as const;

export function TripCard({
  trip,
  onJoin,
  joining,
}: {
  trip: Trip;
  onJoin?: (id: number) => void;
  joining?: boolean;
}) {
  const status = tripStatus(trip.startDate, trip.endDate);
  const remaining = Math.max(0, trip.maxCompanions - trip.memberCount);
  const canJoin = trip.role === "viewer" && trip.visibility === "open" && status !== "completed" && remaining > 0;
  const spentPct = trip.budget > 0 ? Math.min(100, Math.round((trip.spent / trip.budget) * 100)) : 0;

  return (
    <article className="paper flex flex-col overflow-hidden rounded-xl shadow-border">
      <Link to="/trips/$tripId" params={{ tripId: String(trip.id) }} className="group relative block no-underline">
        <div className="relative aspect-[16/9] overflow-hidden bg-bg-sunken">
          {trip.cover ? (
            <img
              src={trip.cover}
              alt=""
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-primary/10 font-display text-2xl text-primary">
              {trip.title.slice(0, 1)}
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink/70 to-transparent" />
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge tone={statusTone[status]}>{status}</Badge>
            {trip.visibility === "open" ? <Badge tone="moss">Open</Badge> : <Badge>Private</Badge>}
          </div>
          <h3 className="absolute bottom-3 left-3 right-3 font-display text-xl text-surface">{trip.title}</h3>
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="line-clamp-2 min-h-10 text-sm text-muted">{trip.summary || "A journey in the making."}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <Calendar className="size-3.5" />
            {formatDayShort(trip.startDate)} – {formatDayShort(trip.endDate)}
          </span>
          {trip.cities.length ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {trip.cities.join(" · ")}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" />
            {trip.memberCount}/{trip.maxCompanions}
          </span>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>{money(trip.spent, trip.currency)} spent</span>
            <span>{money(trip.budget, trip.currency)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-bg-sunken">
            <div className="h-full rounded-full bg-moss" style={{ width: `${spentPct}%` }} />
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <p className="text-xs text-faint">Led by {trip.ownerName}</p>
          {trip.role !== "viewer" ? (
            <Link to="/trips/$tripId" params={{ tripId: String(trip.id) }} className="no-underline">
              <Button size="sm" variant="secondary">
                Open
              </Button>
            </Link>
          ) : canJoin && onJoin ? (
            <Button size="sm" variant="accent" disabled={joining} onClick={() => onJoin(trip.id)}>
              {joining ? "Joining…" : remaining === 1 ? "Join last seat" : "Join"}
            </Button>
          ) : (
            <Link to="/trips/$tripId" params={{ tripId: String(trip.id) }} className="no-underline">
              <Button size="sm" variant="ghost">
                View
              </Button>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

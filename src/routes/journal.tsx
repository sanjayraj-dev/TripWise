import { createFileRoute, Link } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AppShell } from "@/components/tripwise/app-shell";
import { TripCard } from "@/components/tripwise/trip-card";
import { Button, SectionTitle } from "@/components/ui";
import { useMyJournal } from "@/lib/tripwise/hooks";
import { money, tripStatus } from "@/lib/utils";

export const Route = createFileRoute("/journal")({ component: JournalPage });

function JournalPage() {
  const { user, isPending } = useCurrentUserState();
  const journal = useMyJournal();

  if (isPending) {
    return (
      <AppShell>
        <div className="h-40 animate-pulse rounded-xl bg-bg-sunken" />
      </AppShell>
    );
  }
  if (!user) return <RedirectToSignIn />;

  const trips = journal.data?.trips ?? [];
  const stats = journal.data?.stats;
  const ongoing = trips.filter((t) => tripStatus(t.startDate, t.endDate) === "ongoing");
  const upcoming = trips.filter((t) => tripStatus(t.startDate, t.endDate) === "upcoming");
  const completed = trips.filter((t) => tripStatus(t.startDate, t.endDate) === "completed");

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">Your journal</p>
          <h1 className="font-display text-4xl">
            {user.displayName ? `${user.displayName.split(" ")[0]}'s trips` : "Your trips"}
          </h1>
          <p className="mt-1 text-sm text-muted">Owned and joined — upcoming, live, and finished.</p>
        </div>
        <Link to="/trips/new" className="no-underline">
          <Button variant="accent">Create trip</Button>
        </Link>
      </div>

      <div className="mb-10 grid gap-3 sm:grid-cols-4">
        <Stat label="Upcoming" value={String(stats?.upcoming ?? 0)} />
        <Stat label="Ongoing" value={String(stats?.ongoing ?? 0)} />
        <Stat label="Completed" value={String(stats?.completed ?? 0)} />
        <Stat
          label="Budget remaining"
          value={money((stats?.budget ?? 0) - (stats?.spent ?? 0))}
        />
      </div>

      {journal.isPending ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-xl bg-bg-sunken" />
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="paper rounded-xl p-8 shadow-border">
          <h2 className="font-display text-2xl">The pages are blank.</h2>
          <p className="mt-2 max-w-md text-sm text-muted">
            Join an open trip on the board, or create your own and leave seats for companions.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/" className="no-underline">
              <Button>Browse the board</Button>
            </Link>
            <Link to="/trips/new" className="no-underline">
              <Button variant="secondary">Create a trip</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {ongoing.length ? (
            <section>
              <SectionTitle kicker="Happening now" title="Ongoing" />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {ongoing.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
            </section>
          ) : null}
          {upcoming.length ? (
            <section>
              <SectionTitle kicker="Packed and waiting" title="Upcoming" />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
            </section>
          ) : null}
          {completed.length ? (
            <section>
              <SectionTitle kicker="The journal" title="Completed" />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {completed.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="paper rounded-xl p-4 shadow-border">
      <p className="text-xs font-medium tracking-[0.16em] text-muted uppercase">{label}</p>
      <p className="mt-1 font-display text-2xl tabular-nums">{value}</p>
    </div>
  );
}

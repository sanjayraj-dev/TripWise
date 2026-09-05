import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/tripwise/app-shell";
import { TripWorkspace } from "@/components/tripwise/trip-workspace";
import { Button } from "@/components/ui";
import { getTrip } from "@/lib/tripwise/api";
import { useTrip } from "@/lib/tripwise/hooks";

export const Route = createFileRoute("/trips/$tripId")({
  loader: ({ params }) => getTrip({ data: { id: Number(params.tripId) } }),
  component: TripPage,
});

function TripPage() {
  const { tripId } = Route.useParams();
  const id = Number(tripId);
  const seeded = Route.useLoaderData();
  const trip = useTrip(id);
  const detail = trip.data ?? seeded;

  return (
    <AppShell>
      {detail ? (
        <TripWorkspace detail={detail} />
      ) : trip.error ? (
        <div className="paper rounded-xl p-8 shadow-border">
          <h1 className="font-display text-3xl">Can't open this trip</h1>
          <p className="mt-2 text-sm text-muted">{trip.error.message}</p>
          <Link to="/" className="mt-4 inline-block no-underline">
            <Button variant="secondary">Back to the board</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="h-48 animate-pulse rounded-xl bg-bg-sunken" />
          <div className="h-32 animate-pulse rounded-xl bg-bg-sunken" />
        </div>
      )}
    </AppShell>
  );
}

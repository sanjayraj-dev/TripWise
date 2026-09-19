import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { MapView } from "../../components/MapView";
import { Button, ConfirmDialog, Empty, Field, Modal, inputClass } from "../../components/ui";
import { prettyDate } from "../../lib";
import type { Destination, TripDetail } from "../../types";

type WeatherDay = { date: string; label: string; t_max: number; t_min: number; precip: number };

export function RouteTab({ trip, onChange }: { trip: TripDetail; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Destination | null>(null);
  const [del, setDel] = useState<Destination | null>(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(trip.destinations[0]?.id ?? null);

  const mapped = trip.destinations.filter((d) => d.lat && d.lng);
  const selected = trip.destinations.find((d) => d.id === selectedId) ?? mapped[0] ?? null;

  async function save(e: React.FormEvent<HTMLFormElement>, dest?: Destination) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const body = {
      city: String(fd.get("city")),
      country: String(fd.get("country")),
      arrival_date: String(fd.get("arrival_date")),
      departure_date: String(fd.get("departure_date")),
      notes: String(fd.get("notes") || ""),
    };
    try {
      const saved = dest
        ? await api<Destination>(`/api/destinations/${dest.id}`, { method: "PUT", json: body })
        : await api<Destination>(`/api/trips/${trip.id}/destinations`, { method: "POST", json: body });
      setOpen(false);
      setEdit(null);
      setSelectedId(saved.id);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save destination.");
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="serif text-2xl">Route</h2>
        <Button
          onClick={() => {
            setError("");
            setOpen(true);
          }}
        >
          Add destination
        </Button>
      </div>
      {trip.destinations.length === 0 ? (
        <Empty
          title="No stops yet"
          body="Add the cities you'll pass through. They'll geocode onto the map and sort by date."
          action={
            <Button
              onClick={() => {
                setOpen(true);
              }}
            >
              Add destination
            </Button>
          }
        />
      ) : (
        <div className="mb-6 space-y-4">
          <MapView
            points={mapped.map((d) => ({ id: d.id, city: d.city, lat: d.lat as number, lng: d.lng as number }))}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          {mapped.length === 0 && (
            <p className="rounded-[1.6rem] border border-dashed border-line p-6 text-center text-sm text-muted">
              These stops do not have coordinates yet. Edit a city name if geocoding missed it.
            </p>
          )}
          {selected && selected.lat && selected.lng ? <WeatherCard dest={selected} /> : null}
          {selected && selected.lat && selected.lng ? <NearbyRow dest={selected} /> : null}
          <ol className="relative space-y-4 border-l-2 border-line pl-6">
            {trip.destinations.map((d, i) => (
              <li key={d.id} className="relative">
                <span className={`absolute -left-[31px] top-4 h-4 w-4 rounded-full border-2 border-paper ${selectedId === d.id ? "bg-ink" : "bg-terracotta"}`} />
                <button
                  type="button"
                  onClick={() => setSelectedId(d.id)}
                  className={`w-full rounded-3xl border p-5 text-left ${selectedId === d.id ? "border-ink bg-white" : "border-line bg-white/50"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted">Stop {i + 1}</p>
                      <h3 className="serif text-2xl">
                        {d.city}, {d.country}
                      </h3>
                      <p className="text-sm text-ink-soft">
                        {prettyDate(d.arrival_date)} — {prettyDate(d.departure_date)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span
                        className="text-sm underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setError("");
                          setEdit(d);
                        }}
                      >
                        Edit
                      </span>
                      <span
                        className="text-sm text-danger underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDel(d);
                        }}
                      >
                        Remove
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
      <DestModal
        open={open || !!edit}
        title={edit ? "Edit destination" : "Add destination"}
        dest={edit}
        trip={trip}
        error={error}
        onClose={() => {
          setOpen(false);
          setEdit(null);
        }}
        onSubmit={(e) => save(e, edit ?? undefined)}
      />
      <ConfirmDialog
        open={!!del}
        title="Remove this destination?"
        body="Activities, expenses, and stays attached to this stop will also be deleted."
        onClose={() => setDel(null)}
        onConfirm={async () => {
          if (!del) return;
          await api(`/api/destinations/${del.id}`, { method: "DELETE" });
          setDel(null);
          onChange();
        }}
      />
    </div>
  );
}

function DestModal({
  open,
  title,
  dest,
  trip,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  dest: Destination | null;
  trip: TripDetail;
  error: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="City">
          <input name="city" className={inputClass} defaultValue={dest?.city} required />
        </Field>
        <Field label="Country">
          <input name="country" className={inputClass} defaultValue={dest?.country} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Arrival">
            <input name="arrival_date" type="date" min={trip.start_date} max={trip.end_date} className={inputClass} defaultValue={dest?.arrival_date ?? trip.start_date} required />
          </Field>
          <Field label="Departure">
            <input name="departure_date" type="date" min={trip.start_date} max={trip.end_date} className={inputClass} defaultValue={dest?.departure_date ?? trip.end_date} required />
          </Field>
        </div>
        <Field label="Notes">
          <textarea name="notes" rows={2} className={inputClass} defaultValue={dest?.notes} />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full">
          Save destination
        </Button>
      </form>
    </Modal>
  );
}

function WeatherCard({ dest }: { dest: Destination }) {
  const q = useQuery({
    queryKey: ["weather", dest.id],
    queryFn: () => api<{ city: string; days: WeatherDay[] }>(`/api/destinations/${dest.id}/weather`),
    enabled: !!dest.lat && !!dest.lng,
    retry: false,
  });
  if (q.isError) {
    return <p className="text-sm text-muted">Weather is unavailable for {dest.city} right now.</p>;
  }
  if (!q.data?.days?.length) return q.isFetching ? <p className="text-sm text-muted">Loading forecast…</p> : null;
  return (
    <div className="overflow-x-auto rounded-[1.6rem] border border-line bg-white/60 p-4">
      <p className="mb-3 text-xs uppercase tracking-wider text-muted">7-day forecast · {q.data.city}</p>
      <div className="flex gap-3">
        {q.data.days.map((d) => (
          <div key={d.date} className="min-w-20 rounded-2xl bg-paper px-3 py-2 text-center">
            <div className="text-[11px] text-muted">{d.date.slice(5)}</div>
            <div className="mt-1 text-sm font-semibold">{Math.round(d.t_max)}°</div>
            <div className="text-[11px] text-ink-soft">{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NearbyRow({ dest }: { dest: Destination }) {
  const [kind, setKind] = useState("restaurant");
  const q = useQuery({
    queryKey: ["nearby", dest.id, kind],
    queryFn: () => api<{ name: string; extra: string }[]>(`/api/destinations/${dest.id}/nearby?kind=${kind}`),
    enabled: !!dest.lat,
    retry: false,
  });
  return (
    <div className="rounded-[1.6rem] border border-line bg-white/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted">Nearby · {dest.city}</p>
        <select className="rounded-full border border-line bg-paper px-2 py-1 text-xs" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="restaurant">Restaurants</option>
          <option value="cafe">Cafes</option>
          <option value="hospital">Hospitals</option>
          <option value="atm">ATMs</option>
          <option value="pharmacy">Pharmacies</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        {(q.data ?? []).slice(0, 8).map((p) => (
          <span key={p.name} className="rounded-full bg-paper px-3 py-1 text-xs">
            {p.name}
          </span>
        ))}
        {q.isFetching && <span className="text-xs text-muted">Looking around…</span>}
        {!q.isFetching && q.data && q.data.length === 0 && <span className="text-xs text-muted">Nothing from OpenStreetMap right now.</span>}
      </div>
    </div>
  );
}

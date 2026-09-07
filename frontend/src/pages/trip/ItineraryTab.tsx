import { useState } from "react";
import { api } from "../../api/client";
import { Button, ConfirmDialog, Empty, Field, Modal, inputClass } from "../../components/ui";
import { ACTIVITY_CATEGORIES, ACTIVITY_TONES, eachDay, prettyDate } from "../../lib";
import type { Activity, TripDetail } from "../../types";

export function ItineraryTab({ trip, onChange }: { trip: TripDetail; onChange: () => void }) {
  const days = eachDay(trip.start_date, trip.end_date);
  const [open, setOpen] = useState<string | null>(null);
  const [edit, setEdit] = useState<Activity | null>(null);
  const [del, setDel] = useState<Activity | null>(null);
  const [error, setError] = useState("");

  async function suggest(day: string) {
    const dest = trip.destinations.find((d) => day >= d.arrival_date && day <= d.departure_date) ?? trip.destinations[0];
    try {
      const res = await api<{ ideas: { title: string; category: string; start_time: string; end_time: string; location: string; description: string; activity_date: string; destination_id: number }[] }>(
        `/api/trips/${trip.id}/suggest-day`,
        { method: "POST", json: { destination_id: dest.id, date: day } },
      );
      for (const idea of res.ideas) {
        await api(`/api/trips/${trip.id}/activities`, { method: "POST", json: idea });
      }
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not draft the day.");
    }
  }

  if (!trip.destinations.length) {
    return <Empty title="Add a destination first" body="Activities belong to a stop on the route." />;
  }

  async function save(e: React.FormEvent<HTMLFormElement>, act?: Activity, day?: string) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const body = {
      title: String(fd.get("title")),
      description: String(fd.get("description") || ""),
      activity_date: String(fd.get("activity_date")),
      start_time: String(fd.get("start_time") || "") || null,
      end_time: String(fd.get("end_time") || "") || null,
      location: String(fd.get("location") || ""),
      category: String(fd.get("category") || "Sightseeing"),
      destination_id: Number(fd.get("destination_id")),
    };
    try {
      if (act) await api(`/api/activities/${act.id}`, { method: "PUT", json: body });
      else await api(`/api/trips/${trip.id}/activities`, { method: "POST", json: body });
      setOpen(null);
      setEdit(null);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save activity.");
    }
  }

  return (
    <div className="space-y-4">
      {days.map((day, i) => {
        const items = trip.activities.filter((a) => a.activity_date === day);
        return (
          <section key={day} className="rounded-3xl border border-line bg-white/50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted">Day {i + 1}</p>
                <h3 className="serif text-2xl">{prettyDate(day)}</h3>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => void suggest(day)}>Suggest a day</Button>
                <Button variant="ghost" onClick={() => { setError(""); setOpen(day); }}>Add activity</Button>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {items.length === 0 && <p className="text-sm text-muted">Nothing planned.</p>}
              {items.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-3 rounded-2xl bg-paper px-4 py-3">
                  <div>
                    <p className="text-xs text-muted">
                      {a.start_time ? `${a.start_time}${a.end_time ? `–${a.end_time}` : ""}` : "Flexible"} · {a.city}
                    </p>
                    <p className="font-medium">
                      <span className={`mr-2 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${ACTIVITY_TONES[a.category] ?? "bg-paper-3"}`}>{a.category}</span>
                      {a.title}
                    </p>
                    {a.location && <p className="text-sm text-ink-soft">{a.location}</p>}
                    {a.description && <p className="mt-1 text-sm text-ink-soft">{a.description}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2 text-sm">
                    <button className="underline" onClick={() => { setError(""); setEdit(a); }}>Edit</button>
                    <button className="text-danger underline" onClick={() => setDel(a)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <ActivityModal
        open={!!open || !!edit}
        title={edit ? "Edit activity" : "Add activity"}
        trip={trip}
        day={open}
        act={edit}
        error={error}
        onClose={() => { setOpen(null); setEdit(null); }}
        onSubmit={(e) => save(e, edit ?? undefined, open ?? undefined)}
      />
      <ConfirmDialog
        open={!!del}
        title="Remove this activity?"
        body="This cannot be undone."
        onClose={() => setDel(null)}
        onConfirm={async () => {
          if (!del) return;
          await api(`/api/activities/${del.id}`, { method: "DELETE" });
          setDel(null);
          onChange();
        }}
      />
    </div>
  );
}

function ActivityModal({
  open, title, trip, day, act, error, onClose, onSubmit,
}: {
  open: boolean; title: string; trip: TripDetail; day: string | null; act: Activity | null; error: string;
  onClose: () => void; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  const defaultDest = act?.destination_id ?? trip.destinations[0]?.id;
  return (
    <Modal open={open} title={title} onClose={onClose} wide>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Title"><input name="title" className={inputClass} defaultValue={act?.title} required /></Field>
        <Field label="Destination">
          <select name="destination_id" className={inputClass} defaultValue={defaultDest} required>
            {trip.destinations.map((d) => (
              <option key={d.id} value={d.id}>{d.city}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Date">
            <input name="activity_date" type="date" className={inputClass} defaultValue={act?.activity_date ?? day ?? trip.start_date} required />
          </Field>
          <Field label="Start">
            <input name="start_time" type="time" className={inputClass} defaultValue={act?.start_time ?? ""} />
          </Field>
          <Field label="End">
            <input name="end_time" type="time" className={inputClass} defaultValue={act?.end_time ?? ""} />
          </Field>
        </div>
        <Field label="Category">
          <select name="category" className={inputClass} defaultValue={act?.category ?? "Sightseeing"}>
            {ACTIVITY_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Location"><input name="location" className={inputClass} defaultValue={act?.location} /></Field>
        <Field label="Notes">
          <textarea name="description" rows={3} className={inputClass} defaultValue={act?.description} />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full">Save activity</Button>
      </form>
    </Modal>
  );
}

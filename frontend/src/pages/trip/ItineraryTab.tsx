import { useMemo, useState } from "react";
import { api } from "../../api/client";
import { Button, ConfirmDialog, Empty, Field, Modal, inputClass } from "../../components/ui";
import { ACTIVITY_CATEGORIES, ACTIVITY_TONES, eachDay, prettyDate } from "../../lib";
import type { Activity, TripDetail } from "../../types";

const STYLES = [
  { id: "balanced", label: "Balanced" },
  { id: "food", label: "Food" },
  { id: "culture", label: "Culture" },
  { id: "chill", label: "Chill" },
] as const;

type DraftItem = {
  title?: string;
  description?: string;
  activity_date?: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string;
  category?: string;
};

type DraftResponse = {
  source?: "ai" | "template";
  style?: string;
  message?: string;
  city?: string;
  destination_id?: number;
  existing_count?: number;
  activities?: DraftItem[];
};

function asText(value: unknown, fallback = "") {
  if (value == null) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  return fallback;
}

function clock(value: unknown) {
  const s = asText(value);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

export function ItineraryTab({ trip, onChange }: { trip: TripDetail; onChange: () => void }) {
  const days = eachDay(trip.start_date, trip.end_date);
  const activities = trip.activities ?? [];
  const [open, setOpen] = useState<string | null>(null);
  const [edit, setEdit] = useState<Activity | null>(null);
  const [del, setDel] = useState<Activity | null>(null);
  const [error, setError] = useState("");
  const [destId, setDestId] = useState(trip.destinations[0]?.id ?? 0);
  const [style, setStyle] = useState<(typeof STYLES)[number]["id"]>("balanced");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [picked, setPicked] = useState<Record<number, boolean>>({});
  const [replaceAsk, setReplaceAsk] = useState(false);

  const selectedDest = trip.destinations.find((d) => d.id === destId) ?? trip.destinations[0];
  const draftItems = Array.isArray(draft?.activities) ? draft.activities : [];

  async function generate() {
    if (!selectedDest) return;
    setError("");
    setBusy(true);
    try {
      const res = await api<DraftResponse>(`/api/destinations/${selectedDest.id}/itinerary-draft`, {
        method: "POST",
        json: { style },
      });
      const items = Array.isArray(res?.activities) ? res.activities : [];
      if (!items.length) {
        setError("The generator returned an empty draft. Try another style, or add a day by hand.");
        return;
      }
      setDraft({ ...res, activities: items });
      setPicked(Object.fromEntries(items.map((_, i) => [i, true])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a draft.");
    } finally {
      setBusy(false);
    }
  }

  const chosen = useMemo(() => draftItems.filter((_, i) => picked[i]), [draftItems, picked]);

  const groupedDraft = useMemo(() => {
    const groups: { day: string; rows: { item: DraftItem; index: number }[] }[] = [];
    const index = new Map<string, { day: string; rows: { item: DraftItem; index: number }[] }>();
    draftItems.forEach((item, i) => {
      const day = asText(item.activity_date, "unscheduled");
      let g = index.get(day);
      if (!g) {
        g = { day, rows: [] };
        index.set(day, g);
        groups.push(g);
      }
      g.rows.push({ item, index: i });
    });
    return groups;
  }, [draftItems]);

  async function accept(replace: boolean) {
    if (!draft || !chosen.length || !draft.destination_id) return;
    setError("");
    setBusy(true);
    try {
      await api(`/api/destinations/${draft.destination_id}/itinerary-draft/accept`, {
        method: "POST",
        json: {
          items: chosen.map((item) => ({
            title: asText(item.title).slice(0, 160),
            description: asText(item.description),
            activity_date: asText(item.activity_date),
            start_time: clock(item.start_time) || null,
            end_time: clock(item.end_time) || null,
            location: asText(item.location),
            category: asText(item.category, "Sightseeing"),
          })),
          replace,
        },
      });
      setDraft(null);
      setReplaceAsk(false);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the accepted activities.");
    } finally {
      setBusy(false);
    }
  }

  function requestAccept() {
    if (!draft || !chosen.length) return;
    if ((draft.existing_count ?? 0) > 0) setReplaceAsk(true);
    else void accept(false);
  }

  if (!trip.destinations.length) {
    return <Empty title="Add a destination first" body="Activities belong to a stop on the route." />;
  }

  async function save(e: React.FormEvent<HTMLFormElement>, act?: Activity) {
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
      <div className="rounded-3xl border border-line bg-white/50 p-4">
        <p className="text-xs uppercase tracking-wider text-muted">AI itinerary for a TripStop</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="min-w-40 flex-1 text-sm">
            <span className="mb-1 block text-xs text-muted">Destination</span>
            <select className={inputClass} value={selectedDest?.id} onChange={(e) => setDestId(Number(e.target.value))}>
              {trip.destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.city}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-36 text-sm">
            <span className="mb-1 block text-xs text-muted">Style</span>
            <select className={inputClass} value={style} onChange={(e) => setStyle(e.target.value as typeof style)}>
              {STYLES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <Button onClick={() => void generate()} disabled={busy}>
            {busy ? "Generating…" : "Generate itinerary"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          Drafts stay in a preview until you accept them. Existing activities are not overwritten unless you confirm.
        </p>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </div>

      {draft && (
        <section className="rounded-3xl border border-ink/15 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">Preview · {asText(draft.city, selectedDest?.city)}</p>
              <h3 className="serif text-2xl">Review before saving</h3>
            </div>
            <button className="text-sm underline" onClick={() => setDraft(null)} type="button">
              Discard
            </button>
          </div>
          <p className="mt-3 rounded-2xl bg-paper-2 px-3 py-2 text-sm text-ink">
            {asText(
              draft.message,
              draft.source === "ai"
                ? "AI draft — nothing is saved until you accept items."
                : "City template — nothing is saved until you accept items.",
            )}
          </p>
          <div className="mt-3 flex gap-3 text-xs">
            <button className="underline" type="button" onClick={() => setPicked(Object.fromEntries(draftItems.map((_, i) => [i, true])))}>
              Select all
            </button>
            <button className="underline" type="button" onClick={() => setPicked({})}>
              Select none
            </button>
            <span className="text-muted">{chosen.length} selected</span>
          </div>
          <div className="mt-4 max-h-[28rem] space-y-4 overflow-y-auto pr-1">
            {groupedDraft.map((group) => (
              <div key={group.day}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                  {group.day === "unscheduled" ? "Unscheduled" : prettyDate(group.day)}
                </p>
                <div className="space-y-2">
                  {group.rows.map(({ item, index }) => (
                    <label key={index} className="flex gap-3 rounded-2xl bg-paper px-3 py-3 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={!!picked[index]}
                        onChange={(e) => setPicked((prev) => ({ ...prev, [index]: e.target.checked }))}
                      />
                      <span className="min-w-0">
                        <span className="text-xs text-muted">
                          {clock(item.start_time) ? `${clock(item.start_time)}${clock(item.end_time) ? `–${clock(item.end_time)}` : ""}` : "Flexible"}
                          {" · "}
                          {asText(item.category, "Sightseeing")}
                        </span>
                        <span className="block font-medium">{asText(item.title, "Untitled")}</span>
                        {asText(item.location) ? <span className="block text-ink-soft">{asText(item.location)}</span> : null}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setDraft(null)}>
              Discard
            </Button>
            <Button type="button" onClick={requestAccept} disabled={busy || !chosen.length}>
              Accept selected ({chosen.length})
            </Button>
          </div>
        </section>
      )}

      {days.map((day, i) => {
        const items = activities.filter((a) => a.activity_date === day);
        return (
          <section key={day} className="rounded-3xl border border-line bg-white/50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted">Day {i + 1}</p>
                <h3 className="serif text-2xl">{prettyDate(day)}</h3>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  setError("");
                  setOpen(day);
                }}
              >
                Add activity
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {items.length === 0 && <p className="text-sm text-muted">Nothing planned.</p>}
              {items.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-3 rounded-2xl bg-paper px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted">
                      {a.start_time ? `${clock(a.start_time)}${a.end_time ? `–${clock(a.end_time)}` : ""}` : "Flexible"} · {asText(a.city)}
                    </p>
                    <p className="font-medium">
                      <span className={`mr-2 inline-block rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${ACTIVITY_TONES[a.category] ?? "bg-paper-3"}`}>
                        {asText(a.category, "Sightseeing")}
                      </span>
                      {asText(a.title)}
                    </p>
                    {a.location && <p className="text-sm text-ink-soft">{asText(a.location)}</p>}
                    {a.description && <p className="mt-1 text-sm text-ink-soft">{asText(a.description)}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2 text-sm">
                    <button
                      className="underline"
                      onClick={() => {
                        setError("");
                        setEdit(a);
                      }}
                    >
                      Edit
                    </button>
                    <button className="text-danger underline" onClick={() => setDel(a)}>
                      Remove
                    </button>
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
        onClose={() => {
          setOpen(null);
          setEdit(null);
        }}
        onSubmit={(e) => save(e, edit ?? undefined)}
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
      <Modal open={replaceAsk} title="This stop already has activities" onClose={() => setReplaceAsk(false)}>
        <p className="mb-6 text-sm text-ink-soft">
          Add the draft next to what you already planned, or replace the existing itinerary for this stop.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" type="button" onClick={() => setReplaceAsk(false)}>
            Cancel
          </Button>
          <Button variant="ghost" type="button" onClick={() => void accept(false)} disabled={busy}>
            Add alongside
          </Button>
          <Button variant="danger" type="button" onClick={() => void accept(true)} disabled={busy}>
            Replace existing
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function ActivityModal({
  open,
  title,
  trip,
  day,
  act,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  trip: TripDetail;
  day: string | null;
  act: Activity | null;
  error: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  const defaultDest = act?.destination_id ?? trip.destinations[0]?.id;
  return (
    <Modal open={open} title={title} onClose={onClose} wide>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Title">
          <input name="title" className={inputClass} defaultValue={act?.title} required />
        </Field>
        <Field label="Destination">
          <select name="destination_id" className={inputClass} defaultValue={defaultDest} required>
            {trip.destinations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.city}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Date">
            <input name="activity_date" type="date" className={inputClass} defaultValue={act?.activity_date ?? day ?? trip.start_date} required />
          </Field>
          <Field label="Start">
            <input name="start_time" type="time" className={inputClass} defaultValue={clock(act?.start_time)} />
          </Field>
          <Field label="End">
            <input name="end_time" type="time" className={inputClass} defaultValue={clock(act?.end_time)} />
          </Field>
        </div>
        <Field label="Category">
          <select name="category" className={inputClass} defaultValue={act?.category ?? "Sightseeing"}>
            {ACTIVITY_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Location">
          <input name="location" className={inputClass} defaultValue={act?.location} />
        </Field>
        <Field label="Notes">
          <textarea name="description" rows={3} className={inputClass} defaultValue={act?.description} />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full">
          Save activity
        </Button>
      </form>
    </Modal>
  );
}

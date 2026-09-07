import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { Button, ConfirmDialog, Field, Modal, inputClass } from "../../components/ui";
import { coverArt, daysUntil, money, prettyDate, statusLabel, tripLength } from "../../lib";
import type { TripDetail } from "../../types";
import { BudgetBar } from "../../components/TripCard";
import { RouteTab } from "./RouteTab";
import { ItineraryTab } from "./ItineraryTab";
import { BudgetTab } from "./BudgetTab";
import { StaysTab } from "./StaysTab";
import { NotesPackTab } from "./NotesPackTab";
import { DocumentsTab } from "./DocumentsTab";
import { GroupTab } from "./GroupTab";
import { ChatTab } from "./ChatTab";
import { LaterTab } from "./LaterTab";

const TABS = ["Overview", "Group", "Chat", "Route", "Itinerary", "Budget", "Stays", "Papers", "Notes & Pack", "Later"] as const;
type Tab = (typeof TABS)[number];

export function TripWorkspace() {
  const { id } = useParams();
  const tripId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("Overview");
  const [edit, setEdit] = useState(false);
  const [del, setDel] = useState(false);
  const [toast, setToast] = useState("");

  const q = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => api<TripDetail>(`/api/trips/${tripId}`),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["trip", tripId] });
    qc.invalidateQueries({ queryKey: ["trips"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const update = useMutation({
    mutationFn: (body: object) => api(`/api/trips/${tripId}`, { method: "PUT", json: body }),
    onSuccess: () => {
      invalidate();
      setEdit(false);
      setToast("Trip updated.");
    },
  });

  const remove = useMutation({
    mutationFn: () => api(`/api/trips/${tripId}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      navigate("/app/trips");
    },
  });

  if (q.isLoading) return <div className="h-64 animate-pulse rounded-3xl bg-paper-2" />;
  if (q.error || !q.data) {
    return (
      <div>
        <p className="text-danger">{q.error instanceof Error ? q.error.message : "Trip not found."}</p>
        <Link to="/app/trips" className="mt-4 inline-block text-sm underline">
          Back to trips
        </Link>
      </div>
    );
  }

  const trip = q.data;
  const art = coverArt(trip.title, trip.cities);
  const until = daysUntil(trip.start_date);
  const packedPct = trip.packing_progress.total
    ? Math.round((trip.packing_progress.packed / trip.packing_progress.total) * 100)
    : 0;

  return (
    <div>
      <Link to="/app/trips" className="text-sm text-ink-soft hover:text-ink">
        ← All trips
      </Link>
      <div className="relative mt-4 overflow-hidden rounded-[2rem] text-white">
        <img src={art} alt="" className="h-64 w-full object-cover sm:h-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/45 to-navy/10" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] uppercase tracking-wider backdrop-blur">
              {statusLabel(trip.status)}{trip.trip_type ? ` · ${trip.trip_type}` : ""}
            </span>
            <h1 className="serif mt-3 text-4xl sm:text-6xl">{trip.title}</h1>
            <p className="mt-2 text-white/80">
              {prettyDate(trip.start_date)} — {prettyDate(trip.end_date)} · {tripLength(trip.start_date, trip.end_date)} days
            </p>
            <p className="mt-1 text-white/70">
              {trip.cities.length ? trip.cities.join(" → ") : "Add your first destination"}
              {trip.member_count ? ` · ${trip.member_count} travelers` : ""}
              {trip.visibility === "public" ? " · public group" : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 no-print">
            <button onClick={() => window.print()} className="rounded-full bg-white/15 px-4 py-2 text-sm hover:bg-white/25">Print</button>
            <button
              onClick={async () => {
                const res = await api<{ url: string }>(`/api/trips/${trip.id}/share`, { method: "POST" });
                await navigator.clipboard.writeText(`${window.location.origin}${res.url}`);
                setToast("Share link copied.");
                invalidate();
              }}
              className="rounded-full bg-white/15 px-4 py-2 text-sm hover:bg-white/25"
            >
              Share
            </button>
            <button
              onClick={async () => {
                const copy = await api<{ id: number }>(`/api/trips/${trip.id}/duplicate`, { method: "POST" });
                navigate(`/app/trips/${copy.id}`);
              }}
              className="rounded-full bg-white/15 px-4 py-2 text-sm hover:bg-white/25"
            >
              Duplicate
            </button>
            <button onClick={() => setEdit(true)} className="rounded-full bg-white/15 px-4 py-2 text-sm hover:bg-white/25">
              Edit
            </button>
            <button onClick={() => setDel(true)} className="rounded-full bg-black/30 px-4 py-2 text-sm hover:bg-black/40">
              Delete
            </button>
          </div>
        </div>
        </div>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${
              tab === t ? "bg-ink text-paper" : "bg-white/50 text-ink-soft hover:bg-paper-2"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "Overview" && (
          <Overview trip={trip} until={until} packedPct={packedPct} onJump={setTab} />
        )}
        {tab === "Group" && <GroupTab trip={trip} onChange={invalidate} />}
        {tab === "Chat" && <ChatTab tripId={trip.id} />}
        {tab === "Route" && <RouteTab trip={trip} onChange={invalidate} />}
        {tab === "Itinerary" && <ItineraryTab trip={trip} onChange={invalidate} />}
        {tab === "Budget" && <BudgetTab trip={trip} onChange={invalidate} />}
        {tab === "Stays" && <StaysTab trip={trip} onChange={invalidate} />}
        {tab === "Papers" && <DocumentsTab trip={trip} onChange={invalidate} />}
        {tab === "Notes & Pack" && <NotesPackTab trip={trip} onChange={invalidate} />}
        {tab === "Later" && <LaterTab />}
      </div>

      <Modal open={edit} title="Edit trip" onClose={() => setEdit(false)}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            update.mutate({
              title: fd.get("title"),
              start_date: fd.get("start_date"),
              end_date: fd.get("end_date"),
              estimated_budget: Number(fd.get("estimated_budget")),
              visibility: fd.get("visibility"),
              join_mode: fd.get("join_mode"),
              seats: Number(fd.get("seats") || 0),
              looking_for_ride: fd.get("looking_for_ride") === "on",
            });
          }}
        >
          <Field label="Title">
            <input name="title" className={inputClass} defaultValue={trip.title} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start">
              <input name="start_date" type="date" className={inputClass} defaultValue={trip.start_date} required />
            </Field>
            <Field label="End">
              <input name="end_date" type="date" className={inputClass} defaultValue={trip.end_date} required />
            </Field>
          </div>
          <Field label="Estimated budget">
            <input name="estimated_budget" type="number" min={0} className={inputClass} defaultValue={trip.estimated_budget} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Visibility">
              <select name="visibility" className={inputClass} defaultValue={trip.visibility ?? "private"}>
                <option value="private">Private</option>
                <option value="unlisted">Unlisted link</option>
                <option value="public">Public group</option>
              </select>
            </Field>
            <Field label="Join">
              <select name="join_mode" className={inputClass} defaultValue={trip.join_mode ?? "request"}>
                <option value="open">Instant join</option>
                <option value="request">Request to join</option>
              </select>
            </Field>
          </div>
          <Field label="Carpool seats">
            <input name="seats" type="number" min={0} className={inputClass} defaultValue={trip.seats ?? 0} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="looking_for_ride" defaultChecked={trip.looking_for_ride} /> Looking for a ride
          </label>
          {update.error && <p className="text-sm text-danger">{(update.error as Error).message}</p>}
          <Button type="submit" className="w-full" disabled={update.isPending}>
            Save
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={del}
        title="Delete this trip?"
        body="Destinations, itinerary, expenses, stays, notes, and packing will be removed permanently."
        onClose={() => setDel(false)}
        onConfirm={() => remove.mutate()}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-paper">
          {toast}
        </div>
      )}
    </div>
  );
}

function Overview({
  trip,
  until,
  packedPct,
  onJump,
}: {
  trip: TripDetail;
  until: number;
  packedPct: number;
  onJump: (t: Tab) => void;
}) {
  const next = trip.activities.find((a) => a.activity_date >= new Date().toISOString().slice(0, 10)) ?? trip.activities[0];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <button onClick={() => onJump("Budget")} className="rounded-3xl border border-line bg-white/50 p-5 text-left">
        <div className="text-xs uppercase tracking-[0.16em] text-muted">Budget remaining</div>
        <div className={`serif mt-2 text-3xl ${trip.remaining < 0 ? "text-danger" : "text-ink"}`}>{money(trip.remaining)}</div>
        <p className="mt-1 text-sm text-ink-soft">
          {money(trip.spent)} of {money(trip.estimated_budget)}
        </p>
        <div className="mt-3">
          <BudgetBar spent={trip.spent} budget={trip.estimated_budget} />
        </div>
      </button>
      <button onClick={() => onJump("Itinerary")} className="rounded-3xl border border-line bg-white/50 p-5 text-left">
        <div className="text-xs uppercase tracking-[0.16em] text-muted">Next up</div>
        <div className="serif mt-2 text-2xl">{next ? next.title : "No activities yet"}</div>
        <p className="mt-1 text-sm text-ink-soft">
          {next ? `${prettyDate(next.activity_date)}${next.start_time ? ` · ${next.start_time}` : ""}` : "Open Itinerary to add a day."}
        </p>
      </button>
      <button onClick={() => onJump("Notes & Pack")} className="rounded-3xl border border-line bg-white/50 p-5 text-left">
        <div className="text-xs uppercase tracking-[0.16em] text-muted">Packing</div>
        <div className="serif mt-2 text-3xl">{packedPct}%</div>
        <p className="mt-1 text-sm text-ink-soft">
          {trip.packing_progress.packed} of {trip.packing_progress.total} packed
        </p>
      </button>
      <div className="rounded-3xl border border-line bg-white/50 p-5 lg:col-span-2">
        <div className="text-xs uppercase tracking-[0.16em] text-muted">Countdown</div>
        <div className="serif mt-2 text-3xl">
          {trip.status === "completed" ? "This trip is done" : until > 0 ? `${until} days to go` : until === 0 ? "Departs today" : "You're on the road"}
        </div>
      </div>
      <div className="rounded-3xl border border-line bg-white/50 p-5">
        <div className="text-xs uppercase tracking-[0.16em] text-muted">Stops</div>
        <div className="serif mt-2 text-3xl">{trip.destination_count}</div>
        <button onClick={() => onJump("Route")} className="mt-2 text-sm text-ink underline">
          Edit route
        </button>
      </div>
      <Alerts tripId={trip.id} />
      {trip.readiness && (
        <div className="rounded-3xl border border-line bg-white/50 p-5 lg:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-muted">Readiness</div>
              <div className="serif mt-1 text-3xl">{trip.readiness.score}%</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(trip.readiness.checks).map(([k, v]) => (
                <span key={k} className={`rounded-full px-3 py-1 text-xs ${v ? "bg-sage/20 text-sage-dark" : "bg-paper-2 text-muted"}`}>
                  {k}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="lg:col-span-3 flex flex-wrap gap-2">
        <button
          className="rounded-full bg-danger px-4 py-2 text-sm text-white"
          onClick={async () => {
            const res = await api<{ message: string; notified: { name: string }[]; fallback: string | null }>(`/api/trips/${trip.id}/sos`, { method: "POST" });
            alert(res.fallback || `${res.message} (${res.notified.length} contacts)`);
          }}
        >
          SOS (dummy)
        </button>
        <button
          className="rounded-full border border-line px-4 py-2 text-sm"
          onClick={() => {
            if (!navigator.geolocation) return alert("Geolocation not available.");
            navigator.geolocation.getCurrentPosition(async (pos) => {
              await api(`/api/trips/${trip.id}/location`, { method: "POST", json: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
              alert("Location shared with the group for 45 minutes.");
            });
          }}
        >
          Share my location
        </button>
      </div>
    </div>
  );
}

function Alerts({ tripId }: { tripId: number }) {
  const q = useQuery({
    queryKey: ["alerts", tripId],
    queryFn: () => api<{ kind: string; level: string; title: string; body: string }[]>(`/api/trips/${tripId}/alerts`),
  });
  if (!q.data?.length) return null;
  return (
    <div className="space-y-2 lg:col-span-3">
      {q.data.map((a, i) => (
        <div key={i} className={`rounded-2xl border px-4 py-3 text-sm ${a.level === "warn" ? "border-terracotta bg-terracotta/10" : "border-line bg-white/70"}`}>
          <div className="font-medium">{a.title}</div>
          <div className="text-ink-soft">{a.body}</div>
        </div>
      ))}
    </div>
  );
}

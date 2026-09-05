import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  BedDouble,
  CalendarDays,
  MapPin,
  NotebookPen,
  Settings2,
  Users,
  Wallet,
} from "lucide-react";
import type { Destination, TripDetail } from "@/lib/tripwise/types";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  useAddActivity,
  useAddDestination,
  useAddExpense,
  useAddNote,
  useAddPackingItem,
  useAddStay,
  useDeleteActivity,
  useDeleteDestination,
  useDeleteExpense,
  useDeleteNote,
  useDeletePackingItem,
  useDeleteStay,
  useDeleteTrip,
  useJoinTrip,
  useLeaveTrip,
  useTogglePackingItem,
  useUpdateTrip,
} from "@/lib/tripwise/hooks";
import { CURRENCIES, formatDay, formatTime, money, todayISO, tripStatus, cn } from "@/lib/utils";
import { Badge, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { BudgetPanel } from "./budget-panel";
import { JourneyMap } from "./journey-map";
import { PackingKit } from "./packing-kit";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "route", label: "Destinations" },
  { id: "days", label: "Itinerary" },
  { id: "budget", label: "Budget" },
  { id: "stays", label: "Stays" },
  { id: "notes", label: "Notes" },
  { id: "kit", label: "Packing" },
  { id: "people", label: "Companions" },
] as const;

type TabId = (typeof TABS)[number]["id"] | "settings";

export function TripWorkspace({ detail }: { detail: TripDetail }) {
  const { trip, destinations, expenses, stays, notes, packing, members, role } = detail;
  const [tab, setTab] = useState<TabId>("overview");
  const canEdit = role === "owner" || role === "companion";
  const status = tripStatus(trip.startDate, trip.endDate);
  const join = useJoinTrip();
  const leave = useLeaveTrip();
  const remove = useDeleteTrip();
  const navigate = useNavigate();
  const { user } = useCurrentUserState();

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl shadow-border">
        <div className="relative aspect-[21/9] min-h-48 bg-primary">
          {trip.cover ? (
            <img src={trip.cover} alt="" className="size-full object-cover" />
          ) : (
            <div className="size-full bg-primary" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-surface sm:p-7">
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge tone={status === "ongoing" ? "accent" : status === "upcoming" ? "moss" : "ink"}>
                {status}
              </Badge>
              <Badge tone={trip.visibility === "open" ? "moss" : "ink"}>
                {trip.visibility === "open" ? "Open to join" : "Private"}
              </Badge>
              <Badge>
                {role === "viewer" ? "Browsing" : role}
              </Badge>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl">{trip.title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-surface/85">
              {formatDay(trip.startDate)} – {formatDay(trip.endDate)}
              {trip.cities.length ? ` · ${trip.cities.join(" · ")}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted">{trip.summary || "No summary yet."}</p>
        <div className="flex flex-wrap gap-2">
          {role === "viewer" && trip.visibility === "open" && status !== "completed" ? (
            <Button
              variant="accent"
              disabled={join.isPending}
              onClick={() => {
                if (!user) {
                  void navigate({ to: "/login", search: { next: `/trips/${trip.id}` } });
                  return;
                }
                join.mutate(trip.id);
              }}
            >
              Join this trip
            </Button>
          ) : null}
          {role === "companion" ? (
            <Button
              variant="secondary"
              disabled={leave.isPending}
              onClick={() => {
                if (confirm("Leave this trip?")) {
                  leave.mutate(trip.id, { onSuccess: () => void navigate({ to: "/journal" }) });
                }
              }}
            >
              Leave
            </Button>
          ) : null}
          {role === "owner" ? (
            <Button variant="ghost" onClick={() => setTab("settings")}>
              <Settings2 className="size-4" />
              Settings
            </Button>
          ) : null}
        </div>
      </div>

      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "h-10 shrink-0 rounded-lg px-3 text-sm font-medium",
              tab === item.id ? "bg-primary text-primary-fg" : "text-muted hover:bg-bg-sunken",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="space-y-6">
          <JourneyMap destinations={destinations} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Mini icon={<Wallet className="size-4" />} label="Budget left" value={money(trip.budget - trip.spent, trip.currency)} />
            <Mini icon={<CalendarDays className="size-4" />} label="Days planned" value={String(trip.activityCount)} />
            <Mini icon={<Users className="size-4" />} label="Party" value={`${trip.memberCount}/${trip.maxCompanions}`} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="paper rounded-xl p-5 shadow-border">
              <h2 className="mb-3 flex items-center gap-2 font-display text-xl">
                <MapPin className="size-4" /> Next on the route
              </h2>
              {destinations[0] ? (
                <p className="text-sm">
                  {destinations[0].city}, {destinations[0].country}
                  <span className="block text-muted">{formatDay(destinations[0].startDate)}</span>
                </p>
              ) : (
                <p className="text-sm text-muted">No destinations yet.</p>
              )}
            </div>
            <div className="paper rounded-xl p-5 shadow-border">
              <h2 className="mb-3 flex items-center gap-2 font-display text-xl">
                <BedDouble className="size-4" /> Stay
              </h2>
              {stays[0] ? (
                <p className="text-sm">
                  {stays[0].propertyName}
                  <span className="block text-muted">{stays[0].city}</span>
                </p>
              ) : (
                <p className="text-sm text-muted">No stays recorded.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "route" ? (
        <DestinationsTab tripId={trip.id} destinations={destinations} canEdit={canEdit} />
      ) : null}
      {tab === "days" ? (
        <ItineraryTab tripId={trip.id} destinations={destinations} activities={detail.activities} canEdit={canEdit} />
      ) : null}
      {tab === "budget" ? (
        <BudgetTab detail={detail} canEdit={canEdit} />
      ) : null}
      {tab === "stays" ? (
        <StaysTab tripId={trip.id} destinations={destinations} stays={stays} canEdit={canEdit} />
      ) : null}
      {tab === "notes" ? (
        <NotesTab tripId={trip.id} notes={notes} canEdit={canEdit} />
      ) : null}
      {tab === "kit" ? (
        <KitTab tripId={trip.id} packing={packing} canEdit={canEdit} />
      ) : null}
      {tab === "people" ? (
        <div className="paper rounded-xl p-5 shadow-border">
          <h2 className="mb-4 font-display text-xl">Companions</h2>
          <ul className="space-y-3">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted">{m.role}</p>
                </div>
                <Badge tone={m.role === "owner" ? "accent" : "moss"}>{m.role}</Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {tab === "settings" && role === "owner" ? (
        <SettingsTab
          detail={detail}
          onDeleted={() => {
            remove.mutate(trip.id, { onSuccess: () => void navigate({ to: "/journal" }) });
          }}
          deleting={remove.isPending}
        />
      ) : null}
    </div>
  );
}

function Mini({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="paper rounded-xl p-4 shadow-border">
      <p className="mb-2 flex items-center gap-2 text-xs font-medium tracking-[0.16em] text-muted uppercase">
        {icon}
        {label}
      </p>
      <p className="font-display text-2xl tabular-nums">{value}</p>
    </div>
  );
}

function DestinationsTab({
  tripId,
  destinations,
  canEdit,
}: {
  tripId: number;
  destinations: Destination[];
  canEdit: boolean;
}) {
  const add = useAddDestination();
  const del = useDeleteDestination();
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    add.mutate({ tripId, city, country, startDate: startDate || null, endDate: endDate || null, notes: notes || null });
    setCity("");
    setCountry("");
    setNotes("");
  }

  return (
    <div className="space-y-5">
      {canEdit ? (
        <form onSubmit={submit} className="paper grid gap-3 rounded-xl p-5 shadow-border sm:grid-cols-2">
          <Field label="City">
            <Input value={city} onChange={(e) => setCity(e.target.value)} required />
          </Field>
          <Field label="Country">
            <Input value={country} onChange={(e) => setCountry(e.target.value)} required />
          </Field>
          <Field label="From">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="To">
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
          <Button type="submit" disabled={add.isPending}>
            Add destination
          </Button>
        </form>
      ) : null}
      <ol className="space-y-3">
        {destinations.map((d, i) => (
          <li key={d.id} className="paper flex items-start justify-between gap-3 rounded-xl p-4 shadow-border">
            <div>
              <p className="text-xs text-muted">Stop {i + 1}</p>
              <p className="font-display text-xl">
                {d.city}, {d.country}
              </p>
              <p className="text-sm text-muted">
                {formatDay(d.startDate)} – {formatDay(d.endDate)}
              </p>
              {d.notes ? <p className="mt-1 text-sm">{d.notes}</p> : null}
            </div>
            {canEdit ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Remove this destination and its stays/activities?")) {
                    del.mutate({ id: d.id, tripId });
                  }
                }}
              >
                Remove
              </Button>
            ) : null}
          </li>
        ))}
      </ol>
      {destinations.length === 0 ? <p className="text-sm text-muted">No destinations yet.</p> : null}
    </div>
  );
}

function ItineraryTab({
  tripId,
  destinations,
  activities,
  canEdit,
}: {
  tripId: number;
  destinations: Destination[];
  activities: TripDetail["activities"];
  canEdit: boolean;
}) {
  const add = useAddActivity();
  const del = useDeleteActivity();
  const [tripStopId, setTripStopId] = useState(destinations[0] ? String(destinations[0].id) : "");
  const [title, setTitle] = useState("");
  const [activityDate, setActivityDate] = useState(todayISO());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");

  const grouped = new Map<string, typeof activities>();
  for (const a of activities) {
    const list = grouped.get(a.activityDate) ?? [];
    list.push(a);
    grouped.set(a.activityDate, list);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!tripStopId) return;
    add.mutate({
      tripId,
      tripStopId: Number(tripStopId),
      title,
      activityDate,
      startTime: startTime || null,
      endTime: endTime || null,
      description: description || null,
    });
    setTitle("");
    setDescription("");
  }

  return (
    <div className="space-y-5">
      {canEdit && destinations.length ? (
        <form onSubmit={submit} className="paper grid gap-3 rounded-xl p-5 shadow-border sm:grid-cols-2">
          <Field label="Destination">
            <Select value={tripStopId} onChange={(e) => setTripStopId(e.target.value)} required>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.city}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </Field>
          <Field label="Date">
            <Input type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start">
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </Field>
            <Field label="End">
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description">
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          </div>
          <Button type="submit" disabled={add.isPending}>
            Add activity
          </Button>
        </form>
      ) : canEdit ? (
        <p className="text-sm text-muted">Add a destination first — every activity belongs to a stop.</p>
      ) : null}

      {[...grouped.entries()].map(([day, list]) => (
        <section key={day}>
          <h3 className="mb-2 font-display text-xl">{formatDay(day)}</h3>
          <ul className="space-y-2">
            {list.map((a) => (
              <li key={a.id} className="paper flex items-start justify-between gap-3 rounded-xl p-4 shadow-border">
                <div>
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted">
                    {a.city}
                    {a.startTime ? ` · ${formatTime(a.startTime)}${a.endTime ? `–${formatTime(a.endTime)}` : ""}` : ""}
                  </p>
                  {a.description ? <p className="mt-1 text-sm">{a.description}</p> : null}
                </div>
                {canEdit ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm("Remove this activity?")) del.mutate({ id: a.id, tripId });
                    }}
                  >
                    Remove
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {activities.length === 0 ? <p className="text-sm text-muted">No activities yet.</p> : null}
    </div>
  );
}

function BudgetTab({ detail, canEdit }: { detail: TripDetail; canEdit: boolean }) {
  const add = useAddExpense();
  const del = useDeleteExpense();
  return (
    <BudgetPanel
      budget={detail.trip.budget}
      currency={detail.trip.currency}
      expenses={detail.expenses}
      destinations={detail.destinations}
      canEdit={canEdit}
      onAdd={(input) => add.mutate({ tripId: detail.trip.id, ...input })}
      onRemove={(id) => del.mutate({ id, tripId: detail.trip.id })}
    />
  );
}

function StaysTab({
  tripId,
  destinations,
  stays,
  canEdit,
}: {
  tripId: number;
  destinations: Destination[];
  stays: TripDetail["stays"];
  canEdit: boolean;
}) {
  const add = useAddStay();
  const del = useDeleteStay();
  const [tripStopId, setTripStopId] = useState(destinations[0] ? String(destinations[0].id) : "");
  const [propertyName, setPropertyName] = useState("");
  const [address, setAddress] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [bookingRef, setBookingRef] = useState("");
  const [contact, setContact] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!tripStopId) return;
    add.mutate({
      tripId,
      tripStopId: Number(tripStopId),
      propertyName,
      address: address || null,
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      bookingRef: bookingRef || null,
      contact: contact || null,
    });
    setPropertyName("");
    setAddress("");
    setBookingRef("");
    setContact("");
  }

  return (
    <div className="space-y-5">
      {canEdit && destinations.length ? (
        <form onSubmit={submit} className="paper grid gap-3 rounded-xl p-5 shadow-border sm:grid-cols-2">
          <Field label="Destination">
            <Select value={tripStopId} onChange={(e) => setTripStopId(e.target.value)} required>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.city}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Property">
            <Input value={propertyName} onChange={(e) => setPropertyName(e.target.value)} required />
          </Field>
          <Field label="Address">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <Field label="Booking ref">
            <Input value={bookingRef} onChange={(e) => setBookingRef(e.target.value)} />
          </Field>
          <Field label="Check-in">
            <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </Field>
          <Field label="Check-out">
            <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
          </Field>
          <Field label="Contact">
            <Input value={contact} onChange={(e) => setContact(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={add.isPending}>
              Add stay
            </Button>
          </div>
        </form>
      ) : canEdit ? (
        <p className="text-sm text-muted">Add a destination first — each stay belongs to one stop.</p>
      ) : null}
      <ul className="space-y-3">
        {stays.map((s) => (
          <li key={s.id} className="paper flex items-start justify-between gap-3 rounded-xl p-4 shadow-border">
            <div>
              <p className="font-display text-xl">{s.propertyName}</p>
              <p className="text-sm text-muted">
                {s.city} · {formatDay(s.checkIn)} – {formatDay(s.checkOut)}
              </p>
              {s.address ? <p className="text-sm">{s.address}</p> : null}
              {s.bookingRef ? <p className="text-xs text-muted">Ref {s.bookingRef}</p> : null}
              {s.contact ? <p className="text-xs text-muted">{s.contact}</p> : null}
            </div>
            {canEdit ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Remove this stay?")) del.mutate({ id: s.id, tripId });
                }}
              >
                Remove
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NotesTab({
  tripId,
  notes,
  canEdit,
}: {
  tripId: number;
  notes: TripDetail["notes"];
  canEdit: boolean;
}) {
  const add = useAddNote();
  const del = useDeleteNote();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    add.mutate({ tripId, title, body });
    setTitle("");
    setBody("");
  }

  return (
    <div className="space-y-5">
      {canEdit ? (
        <form onSubmit={submit} className="paper space-y-3 rounded-xl p-5 shadow-border">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </Field>
          <Field label="Note">
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
          <Button type="submit" disabled={add.isPending}>
            Save note
          </Button>
        </form>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {notes.map((n) => (
          <article key={n.id} className="paper rounded-xl p-4 shadow-border">
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="flex items-center gap-2 font-display text-lg">
                <NotebookPen className="size-4" />
                {n.title}
              </h3>
              {canEdit ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm("Delete this note?")) del.mutate({ id: n.id, tripId });
                  }}
                >
                  Remove
                </Button>
              ) : null}
            </div>
            <p className="whitespace-pre-wrap text-sm text-muted">{n.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function KitTab({
  tripId,
  packing,
  canEdit,
}: {
  tripId: number;
  packing: TripDetail["packing"];
  canEdit: boolean;
}) {
  const add = useAddPackingItem();
  const toggle = useTogglePackingItem();
  const del = useDeletePackingItem();
  return (
    <PackingKit
      items={packing}
      canEdit={canEdit}
      onAdd={(name, slot) => add.mutate({ tripId, name, slot })}
      onToggle={(id) => toggle.mutate({ id, tripId })}
      onRemove={(id) => del.mutate({ id, tripId })}
    />
  );
}

function SettingsTab({
  detail,
  onDeleted,
  deleting,
}: {
  detail: TripDetail;
  onDeleted: () => void;
  deleting: boolean;
}) {
  const update = useUpdateTrip();
  const t = detail.trip;
  const [title, setTitle] = useState(t.title);
  const [startDate, setStartDate] = useState(t.startDate);
  const [endDate, setEndDate] = useState(t.endDate);
  const [budget, setBudget] = useState(String(t.budget));
  const [currency, setCurrency] = useState(t.currency);
  const [summary, setSummary] = useState(t.summary);
  const [visibility, setVisibility] = useState(t.visibility);
  const [maxCompanions, setMaxCompanions] = useState(String(t.maxCompanions));

  function submit(e: FormEvent) {
    e.preventDefault();
    update.mutate({
      id: t.id,
      title,
      startDate,
      endDate,
      budget: Number(budget),
      currency,
      summary,
      visibility,
      maxCompanions: Number(maxCompanions),
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="paper grid gap-3 rounded-xl p-5 shadow-border sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </Field>
        </div>
        <Field label="Start">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </Field>
        <Field label="End">
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </Field>
        <Field label="Budget">
          <Input type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} required />
        </Field>
        <Field label="Currency">
          <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Visibility">
          <Select value={visibility} onChange={(e) => setVisibility(e.target.value as "open" | "private")}>
            <option value="open">Open — anyone can join</option>
            <option value="private">Private — invite only</option>
          </Select>
        </Field>
        <Field label="Party size">
          <Input
            type="number"
            min="1"
            max="20"
            value={maxCompanions}
            onChange={(e) => setMaxCompanions(e.target.value)}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Summary">
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} />
          </Field>
        </div>
        <Button type="submit" disabled={update.isPending}>
          Save trip
        </Button>
      </form>
      <div className="paper rounded-xl p-5 shadow-border">
        <h3 className="font-display text-xl">Delete trip</h3>
        <p className="mt-1 mb-3 text-sm text-muted">This cannot be undone. Destinations, expenses, stays, and notes go with it.</p>
        <Button
          variant="danger"
          disabled={deleting}
          onClick={() => {
            if (confirm("Delete this trip permanently?")) onDeleted();
          }}
        >
          Delete trip
        </Button>
      </div>
    </div>
  );
}

export function JoinHint() {
  return (
    <p className="text-sm text-muted">
      Want to contribute? <Link to="/login">Sign in</Link> and join.
    </p>
  );
}

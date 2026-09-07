import { useState } from "react";
import { api } from "../../api/client";
import { Button, ConfirmDialog, Empty, Field, Modal, inputClass } from "../../components/ui";
import { money, prettyDate } from "../../lib";
import type { Stay, TripDetail } from "../../types";

export function StaysTab({ trip, onChange }: { trip: TripDetail; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Stay | null>(null);
  const [del, setDel] = useState<Stay | null>(null);
  const [error, setError] = useState("");

  if (!trip.destinations.length) {
    return <Empty title="Add a destination first" body="Stays are attached to a city on the route." />;
  }

  async function save(e: React.FormEvent<HTMLFormElement>, stay?: Stay) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const body = {
      property_name: String(fd.get("property_name")),
      address: String(fd.get("address") || ""),
      check_in: String(fd.get("check_in")),
      check_out: String(fd.get("check_out")),
      booking_reference: String(fd.get("booking_reference") || ""),
      contact: String(fd.get("contact") || ""),
      price_per_night: fd.get("price_per_night") ? Number(fd.get("price_per_night")) : null,
      notes: String(fd.get("notes") || ""),
      destination_id: Number(fd.get("destination_id")),
    };
    try {
      if (stay) await api(`/api/accommodations/${stay.id}`, { method: "PUT", json: body });
      else await api(`/api/trips/${trip.id}/accommodations`, { method: "POST", json: body });
      setOpen(false);
      setEdit(null);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save stay.");
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="serif text-2xl">Stays</h2>
        <Button onClick={() => { setError(""); setOpen(true); }}>Add stay</Button>
      </div>
      {trip.accommodations.length === 0 ? (
        <Empty title="No stays recorded" body="Keep the hotel name, dates, and booking reference here — not in a screenshot." action={<Button onClick={() => setOpen(true)}>Add stay</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {trip.accommodations.map((s) => (
            <article key={s.id} className="rounded-3xl border border-line bg-white/50 p-5">
              <p className="text-xs uppercase tracking-wider text-muted">{s.city}</p>
              <h3 className="serif mt-1 text-2xl">{s.property_name}</h3>
              <p className="mt-1 text-sm text-ink-soft">{s.address}</p>
              <p className="mt-3 text-sm">{prettyDate(s.check_in)} → {prettyDate(s.check_out)}</p>
              {s.booking_reference && <p className="mt-1 text-sm text-muted">Ref {s.booking_reference}</p>}
              {s.contact && <p className="text-sm text-muted">{s.contact}</p>}
              {s.price_per_night != null && <p className="mt-2 text-sm">{money(s.price_per_night)} / night</p>}
              {s.notes && <p className="mt-2 text-sm text-ink-soft">{s.notes}</p>}
              <div className="mt-4 flex gap-3 text-sm">
                <button className="underline" onClick={() => { setError(""); setEdit(s); }}>Edit</button>
                <button className="text-danger underline" onClick={() => setDel(s)}>Remove</button>
              </div>
            </article>
          ))}
        </div>
      )}
      <Modal open={open || !!edit} title={edit ? "Edit stay" : "Add stay"} onClose={() => { setOpen(false); setEdit(null); }} wide>
        <form onSubmit={(e) => save(e, edit ?? undefined)} className="space-y-4">
          <Field label="Property name"><input name="property_name" className={inputClass} defaultValue={edit?.property_name} required /></Field>
          <Field label="Destination">
            <select name="destination_id" className={inputClass} defaultValue={edit?.destination_id ?? trip.destinations[0]?.id}>
              {trip.destinations.map((d) => <option key={d.id} value={d.id}>{d.city}</option>)}
            </select>
          </Field>
          <Field label="Address"><input name="address" className={inputClass} defaultValue={edit?.address} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Check-in"><input name="check_in" type="date" className={inputClass} defaultValue={edit?.check_in ?? trip.start_date} required /></Field>
            <Field label="Check-out"><input name="check_out" type="date" className={inputClass} defaultValue={edit?.check_out ?? trip.end_date} required /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Booking reference"><input name="booking_reference" className={inputClass} defaultValue={edit?.booking_reference} /></Field>
            <Field label="Contact"><input name="contact" className={inputClass} defaultValue={edit?.contact} /></Field>
          </div>
          <Field label="Price per night"><input name="price_per_night" type="number" min={0} className={inputClass} defaultValue={edit?.price_per_night ?? ""} /></Field>
          <Field label="Notes"><textarea name="notes" rows={2} className={inputClass} defaultValue={edit?.notes} /></Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full">Save stay</Button>
        </form>
      </Modal>
      <ConfirmDialog
        open={!!del}
        title="Remove this stay?"
        body="The booking details will be deleted from TripWise."
        onClose={() => setDel(null)}
        onConfirm={async () => {
          if (!del) return;
          await api(`/api/accommodations/${del.id}`, { method: "DELETE" });
          setDel(null);
          onChange();
        }}
      />
    </div>
  );
}

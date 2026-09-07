import { useState } from "react";
import { api } from "../../api/client";
import { Button, ConfirmDialog, Empty, Field, Modal, inputClass } from "../../components/ui";
import { DOCUMENT_KINDS } from "../../lib";
import { prettyDate } from "../../lib";
import type { TravelDoc, TripDetail } from "../../types";

export function DocumentsTab({ trip, onChange }: { trip: TripDetail; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<TravelDoc | null>(null);
  const [del, setDel] = useState<TravelDoc | null>(null);
  const [error, setError] = useState("");
  const docs = trip.documents ?? [];

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      title: String(fd.get("title")),
      kind: String(fd.get("kind")),
      reference: String(fd.get("reference") || ""),
      expiry_date: String(fd.get("expiry_date") || "") || null,
      notes: String(fd.get("notes") || ""),
    };
    try {
      if (edit) await api(`/api/documents/${edit.id}`, { method: "PUT", json: body });
      else await api(`/api/trips/${trip.id}/documents`, { method: "POST", json: body });
      setOpen(false);
      setEdit(null);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="serif text-2xl">Papers</h2>
        <Button onClick={() => { setError(""); setOpen(true); }}>Add document</Button>
      </div>
      {docs.length === 0 ? (
        <Empty title="No papers filed" body="Passport, visa, tickets, insurance — with expiry so nothing surprises you at the gate." action={<Button onClick={() => setOpen(true)}>File one</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {docs.map((d) => (
            <article key={d.id} className="rounded-[1.6rem] border border-line bg-white/60 p-5">
              <p className="text-xs uppercase tracking-wider text-terracotta">{d.kind}</p>
              <h3 className="serif mt-1 text-2xl">{d.title}</h3>
              {d.reference && <p className="mt-1 text-sm text-ink-soft">Ref {d.reference}</p>}
              {d.expiry_date && <p className="text-sm text-muted">Expires {prettyDate(d.expiry_date)}</p>}
              {d.notes && <p className="mt-2 text-sm text-ink-soft">{d.notes}</p>}
              <div className="mt-4 flex gap-3 text-sm">
                <button className="underline" onClick={() => { setError(""); setEdit(d); }}>Edit</button>
                <button className="text-danger underline" onClick={() => setDel(d)}>Remove</button>
              </div>
            </article>
          ))}
        </div>
      )}
      <Modal open={open || !!edit} title={edit ? "Edit document" : "File a document"} onClose={() => { setOpen(false); setEdit(null); }}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Title"><input name="title" className={inputClass} defaultValue={edit?.title} required /></Field>
          <Field label="Kind">
            <select name="kind" className={inputClass} defaultValue={edit?.kind ?? "Passport"}>
              {DOCUMENT_KINDS.map((k) => <option key={k}>{k}</option>)}
            </select>
          </Field>
          <Field label="Reference / number"><input name="reference" className={inputClass} defaultValue={edit?.reference} /></Field>
          <Field label="Expiry"><input name="expiry_date" type="date" className={inputClass} defaultValue={edit?.expiry_date ?? ""} /></Field>
          <Field label="Notes"><textarea name="notes" rows={2} className={inputClass} defaultValue={edit?.notes} /></Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full">Save</Button>
        </form>
      </Modal>
      <ConfirmDialog open={!!del} title="Remove this document?" body="The record is deleted from TripWise. The real paper is still yours." onClose={() => setDel(null)} onConfirm={async () => {
        if (!del) return;
        await api(`/api/documents/${del.id}`, { method: "DELETE" });
        setDel(null);
        onChange();
      }} />
    </div>
  );
}

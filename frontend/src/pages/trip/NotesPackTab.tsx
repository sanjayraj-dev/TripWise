import { useState } from "react";
import { api } from "../../api/client";
import { Button, ConfirmDialog, Empty, Field, Modal, inputClass } from "../../components/ui";
import { PACKING_CATEGORIES, type Note, type PackingItem, type TripDetail } from "../../types";

export function NotesPackTab({ trip, onChange }: { trip: TripDetail; onChange: () => void }) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [delNote, setDelNote] = useState<Note | null>(null);
  const [delPack, setDelPack] = useState<PackingItem | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemCat, setItemCat] = useState("Clothes");
  const [error, setError] = useState("");

  async function saveNote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = { title: String(fd.get("title")), content: String(fd.get("content") || "") };
    try {
      if (editNote) await api(`/api/notes/${editNote.id}`, { method: "PUT", json: body });
      else await api(`/api/trips/${trip.id}/notes`, { method: "POST", json: body });
      setNoteOpen(false);
      setEditNote(null);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save note.");
    }
  }

  async function addPack(e: React.FormEvent) {
    e.preventDefault();
    if (!itemName.trim()) return;
    await api(`/api/trips/${trip.id}/packing`, { method: "POST", json: { item_name: itemName, category: itemCat } });
    setItemName("");
    onChange();
  }

  async function toggle(item: PackingItem) {
    await api(`/api/packing/${item.id}`, { method: "PUT", json: { is_packed: !item.is_packed } });
    onChange();
  }

  const grouped = PACKING_CATEGORIES.map((c) => ({
    cat: c,
    items: trip.packing.filter((p) => p.category === c),
  })).filter((g) => g.items.length);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="serif text-2xl">Notes</h2>
          <Button onClick={() => { setError(""); setNoteOpen(true); }}>Add note</Button>
        </div>
        {trip.notes.length === 0 ? (
          <Empty title="No notes" body="Visa reminders, wifi codes, restaurant names." />
        ) : (
          <div className="space-y-3">
            {trip.notes.map((n) => (
              <article key={n.id} className="rounded-3xl border border-line bg-white/50 p-5">
                <h3 className="font-semibold">{n.title}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">{n.content}</p>
                <div className="mt-3 flex gap-3 text-sm">
                  <button className="underline" onClick={() => { setError(""); setEditNote(n); }}>Edit</button>
                  <button className="text-danger underline" onClick={() => setDelNote(n)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="serif text-2xl">Packing</h2>
          <span className="text-sm text-muted">
            {trip.packing_progress.packed}/{trip.packing_progress.total}
          </span>
        </div>
        <form onSubmit={addPack} className="mb-4 flex gap-2">
          <input className={inputClass} placeholder="Add an item" value={itemName} onChange={(e) => setItemName(e.target.value)} />
          <select className={inputClass} value={itemCat} onChange={(e) => setItemCat(e.target.value)}>
            {PACKING_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <Button type="submit">Add</Button>
        </form>
        {trip.packing.length === 0 ? (
          <Empty title="Empty suitcase" body="List it here so it actually gets packed." />
        ) : (
          <div className="space-y-4">
            {grouped.map((g) => (
              <div key={g.cat}>
                <p className="mb-2 text-xs uppercase tracking-wider text-muted">{g.cat}</p>
                <ul className="space-y-1">
                  {g.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between rounded-2xl bg-white/50 px-3 py-2">
                      <label className="flex items-center gap-3 text-sm">
                        <input type="checkbox" checked={item.is_packed} onChange={() => toggle(item)} />
                        <span className={item.is_packed ? "text-muted line-through" : ""}>{item.item_name}</span>
                      </label>
                      <button className="text-xs text-danger" onClick={() => setDelPack(item)}>Remove</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal open={noteOpen || !!editNote} title={editNote ? "Edit note" : "Add note"} onClose={() => { setNoteOpen(false); setEditNote(null); }}>
        <form onSubmit={saveNote} className="space-y-4">
          <Field label="Title"><input name="title" className={inputClass} defaultValue={editNote?.title} required /></Field>
          <Field label="Content"><textarea name="content" rows={5} className={inputClass} defaultValue={editNote?.content} /></Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full">Save note</Button>
        </form>
      </Modal>
      <ConfirmDialog open={!!delNote} title="Delete this note?" body="This cannot be undone." onClose={() => setDelNote(null)} onConfirm={async () => {
        if (!delNote) return;
        await api(`/api/notes/${delNote.id}`, { method: "DELETE" });
        setDelNote(null);
        onChange();
      }} />
      <ConfirmDialog open={!!delPack} title="Remove packing item?" body="You can add it again later." onClose={() => setDelPack(null)} onConfirm={async () => {
        if (!delPack) return;
        await api(`/api/packing/${delPack.id}`, { method: "DELETE" });
        setDelPack(null);
        onChange();
      }} />
    </div>
  );
}

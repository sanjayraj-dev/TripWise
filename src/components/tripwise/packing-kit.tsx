import { Check, Plus, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import type { PackingItem } from "@/lib/tripwise/types";
import { PACKING_SLOTS, cn } from "@/lib/utils";
import { Button, Input, Select } from "@/components/ui";

const SLOT_LABEL: Record<string, string> = {
  documents: "Papers",
  clothes: "Clothes",
  gear: "Gear",
  health: "Health",
  other: "Other",
};

export function PackingKit({
  items,
  canEdit,
  onAdd,
  onToggle,
  onRemove,
}: {
  items: PackingItem[];
  canEdit: boolean;
  onAdd: (name: string, slot: string) => void;
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  const [name, setName] = useState("");
  const [slot, setSlot] = useState("gear");
  const packed = items.filter((i) => i.packed).length;
  const pct = items.length ? Math.round((packed / items.length) * 100) : 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), slot);
    setName("");
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-end justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">Inventory</p>
            <p className="text-sm text-muted">
              {packed} of {items.length} packed
            </p>
          </div>
          <p className="font-display text-2xl tabular-nums">{pct}%</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-bg-sunken">
          <div className="h-full rounded-full bg-moss transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {canEdit ? (
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add to the kit" />
          <Select value={slot} onChange={(e) => setSlot(e.target.value)} className="sm:w-40">
            {PACKING_SLOTS.map((s) => (
              <option key={s} value={s}>
                {SLOT_LABEL[s] ?? s}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">
            <Plus className="size-4" />
            Add
          </Button>
        </form>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PACKING_SLOTS.map((s) => {
          const slotItems = items.filter((i) => i.slot === s);
          return (
            <section key={s} className="paper rounded-xl p-4 shadow-border">
              <h3 className="mb-3 font-display text-lg">{SLOT_LABEL[s] ?? s}</h3>
              {slotItems.length === 0 ? (
                <p className="text-sm text-muted">Empty pocket.</p>
              ) : (
                <ul className="space-y-2">
                  {slotItems.map((item) => (
                    <li key={item.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => onToggle(item.id)}
                        className={cn(
                          "flex size-8 items-center justify-center rounded-md border border-line",
                          item.packed ? "bg-moss text-primary-fg" : "bg-surface text-muted",
                        )}
                        aria-label={item.packed ? "Mark unpacked" : "Mark packed"}
                      >
                        <Check className="size-4" />
                      </button>
                      <span className={cn("flex-1 text-sm", item.packed && "text-muted line-through")}>{item.name}</span>
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => onRemove(item.id)}
                          className="text-faint hover:text-danger"
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

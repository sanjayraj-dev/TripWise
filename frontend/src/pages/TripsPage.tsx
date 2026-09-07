import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Button, Empty, Field, Modal, inputClass } from "../components/ui";
import { TripCardView } from "../components/TripCard";
import type { TripCard, TripDetail } from "../types";

export function TripsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const { data, isLoading } = useQuery({ queryKey: ["trips"], queryFn: () => api<TripCard[]>("/api/trips") });
  const filtered = (data ?? []).filter((t) => {
    const blob = `${t.title} ${t.cities.join(" ")}`.toLowerCase();
    if (q && !blob.includes(q.toLowerCase())) return false;
    if (status !== "all" && t.status !== status) return false;
    return true;
  });

  const create = useMutation({
    mutationFn: (body: { title: string; start_date: string; end_date: string; estimated_budget: number; trip_type: string; currency: string; visibility: string; join_mode: string }) =>
      api<TripDetail>("/api/trips", { method: "POST", json: body }),
    onSuccess: (trip) => {
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      navigate(`/app/trips/${trip.id}`);
    },
    onError: (e: Error) => setError(e.message),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    create.mutate({
      title: String(fd.get("title")),
      start_date: String(fd.get("start_date")),
      end_date: String(fd.get("end_date")),
      estimated_budget: Number(fd.get("estimated_budget") || 0),
      trip_type: String(fd.get("trip_type") || "leisure"),
      currency: String(fd.get("currency") || "INR"),
      visibility: String(fd.get("visibility") || "private"),
      join_mode: String(fd.get("join_mode") || "request"),
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">Library</p>
          <h1 className="serif mt-2 text-4xl">Your trips</h1>
        </div>
        <Button onClick={() => setOpen(true)}>New trip</Button>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <input className={inputClass + " max-w-xs"} placeholder="Search title or city" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputClass + " max-w-40"} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All states</option>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">In progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      {isLoading ? (
        <div className="mt-8 h-48 animate-pulse rounded-3xl bg-paper-2" />
      ) : filtered.length ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <TripCardView key={t.id} trip={t} />
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <Empty
            title="Your first trip starts with a name and two dates"
            body="Everything else — stops, days, money — can wait until you’re ready."
            action={<Button onClick={() => setOpen(true)}>Create a trip</Button>}
          />
        </div>
      )}

      <Modal open={open} title="New trip" onClose={() => setOpen(false)}>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Title">
            <input name="title" className={inputClass} placeholder="Kyoto Autumn" required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start">
              <input name="start_date" type="date" className={inputClass} required />
            </Field>
            <Field label="End">
              <input name="end_date" type="date" className={inputClass} required />
            </Field>
          </div>
          <Field label="Estimated budget">
            <input name="estimated_budget" type="number" min={0} step="1" className={inputClass} defaultValue={0} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select name="trip_type" className={inputClass} defaultValue="leisure">
                <option value="leisure">Leisure</option>
                <option value="culture">Culture</option>
                <option value="adventure">Adventure</option>
                <option value="family">Family</option>
                <option value="work">Work</option>
              </select>
            </Field>
            <Field label="Currency">
              <select name="currency" className={inputClass} defaultValue="INR">
                <option>INR</option>
                <option>USD</option>
                <option>EUR</option>
                <option>JPY</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Visibility">
              <select name="visibility" className={inputClass} defaultValue="private">
                <option value="private">Private</option>
                <option value="public">Public group</option>
              </select>
            </Field>
            <Field label="Join">
              <select name="join_mode" className={inputClass} defaultValue="request">
                <option value="open">Instant join</option>
                <option value="request">Request</option>
              </select>
            </Field>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={create.isPending}>
            {create.isPending ? "Saving…" : "Create trip"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

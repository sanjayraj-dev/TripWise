import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { ConfirmDialog } from "../components/ui";
import { prettyDate } from "../lib";
import type { User } from "../types";
import { useState } from "react";

type Stats = {
  travelers: number;
  active_travelers: number;
  deactivated_travelers: number;
  trips: number;
  upcoming_trips: number;
  ongoing_trips: number;
  completed_trips: number;
  destinations: number;
  activities: number;
  notes: number;
  expenses: number;
  recent_trips: { id: number; title: string; start_date: string; status: string; owner_name: string; cities: string[] }[];
};

type Detail = {
  user: User;
  trips: { id: number; title: string; start_date: string; end_date: string; status: string; cities: string[] }[];
};

export function AdminPage() {
  const qc = useQueryClient();
  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: () => api<Stats>("/api/admin/stats") });
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => api<User[]>("/api/admin/users") });
  const [target, setTarget] = useState<User | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [kill, setKill] = useState<{ id: number; title: string } | null>(null);

  const detail = useQuery({
    queryKey: ["admin-user", openId],
    queryFn: () => api<Detail>(`/api/admin/users/${openId}`),
    enabled: !!openId,
  });

  const mutate = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api(`/api/admin/users/${id}`, { method: "PATCH", json: { status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-user"] });
      setTarget(null);
    },
  });

  const removeTrip = useMutation({
    mutationFn: (id: number) => api(`/api/admin/trips/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-user"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setKill(null);
    },
  });

  const s = stats.data;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">Back office</p>
      <h1 className="serif mt-2 text-4xl">Administration</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Kpi label="Travelers" value={s?.travelers ?? "—"} />
        <Kpi label="Active" value={s?.active_travelers ?? "—"} />
        <Kpi label="Trips" value={s?.trips ?? "—"} />
        <Kpi label="Upcoming" value={s?.upcoming_trips ?? "—"} />
        <Kpi label="In progress" value={s?.ongoing_trips ?? "—"} />
        <Kpi label="Completed" value={s?.completed_trips ?? "—"} />
        <Kpi label="Destinations" value={s?.destinations ?? "—"} />
        <Kpi label="Activities" value={s?.activities ?? "—"} />
      </div>

      <h2 className="serif mt-10 text-2xl">Recent trips</h2>
      <div className="mt-4 overflow-hidden rounded-3xl border border-line bg-white/50">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper-2 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Trip</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(s?.recent_trips ?? []).map((t) => (
              <tr key={t.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-muted">{t.cities.join(" → ") || "No stops"}</div>
                </td>
                <td className="px-4 py-3">{t.owner_name}</td>
                <td className="px-4 py-3">{t.status}</td>
                <td className="px-4 py-3 text-ink-soft">{prettyDate(t.start_date)}</td>
                <td className="px-4 py-3 text-right">
                  <button className="text-sm text-danger underline" onClick={() => setKill({ id: t.id, title: t.title })}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {!s?.recent_trips?.length && (
              <tr>
                <td className="px-4 py-6 text-sm text-muted" colSpan={5}>
                  No trips yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="serif mt-10 text-2xl">Travelers</h2>
      <div className="mt-4 overflow-hidden rounded-3xl border border-line bg-white/50">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper-2 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Traveler</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Trips</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.data?.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <button className="text-left" onClick={() => setOpenId(u.id)}>
                    <div className="font-medium underline-offset-2 hover:underline">{u.full_name}</div>
                    <div className="text-xs text-muted">{u.email}</div>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span className={u.status === "active" ? "text-sage-dark" : "text-danger"}>{u.status}</span>
                </td>
                <td className="px-4 py-3">{u.trip_count ?? 0}</td>
                <td className="px-4 py-3 text-ink-soft">{u.created_at ? prettyDate(u.created_at.slice(0, 10)) : "—"}</td>
                <td className="px-4 py-3 text-right">
                  <button className="text-sm text-ink underline" onClick={() => setTarget(u)}>
                    {u.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail.data && (
        <div className="mt-6 rounded-3xl border border-line bg-white/60 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">Traveler</p>
              <h3 className="serif text-2xl">{detail.data.user.full_name}</h3>
              <p className="text-sm text-ink-soft">{detail.data.user.email}</p>
            </div>
            <button className="text-sm underline" onClick={() => setOpenId(null)}>
              Close
            </button>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {detail.data.trips.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-2xl bg-paper px-3 py-2">
                <span>
                  <span className="font-medium">{t.title}</span>
                  <span className="text-muted"> · {t.status} · {prettyDate(t.start_date)}</span>
                </span>
                <button className="text-danger underline" onClick={() => setKill({ id: t.id, title: t.title })}>
                  Remove
                </button>
              </li>
            ))}
            {!detail.data.trips.length && <li className="text-muted">No trips.</li>}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={!!target}
        title={target?.status === "active" ? "Deactivate this traveler?" : "Activate this traveler?"}
        body={
          target?.status === "active"
            ? `${target.full_name} will not be able to sign in until you activate the account again.`
            : `${target?.full_name} will be able to sign in again.`
        }
        confirmLabel={target?.status === "active" ? "Deactivate" : "Activate"}
        onClose={() => setTarget(null)}
        onConfirm={() => {
          if (!target) return;
          mutate.mutate({ id: target.id, status: target.status === "active" ? "deactivated" : "active" });
        }}
      />
      <ConfirmDialog
        open={!!kill}
        title="Remove this trip?"
        body={`${kill?.title} will be permanently deleted for the traveler.`}
        confirmLabel="Remove trip"
        onClose={() => setKill(null)}
        onConfirm={() => {
          if (!kill) return;
          removeTrip.mutate(kill.id);
        }}
      />
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-3xl border border-line bg-white/50 p-5">
      <div className="text-xs uppercase tracking-[0.16em] text-muted">{label}</div>
      <div className="serif mt-2 text-3xl">{value}</div>
    </div>
  );
}

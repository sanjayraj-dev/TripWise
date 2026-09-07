import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { ConfirmDialog } from "../components/ui";
import { prettyDate } from "../lib";
import type { User } from "../types";
import { useState } from "react";

type Stats = { travelers: number; active_travelers: number; deactivated_travelers: number; trips: number };

export function AdminPage() {
  const qc = useQueryClient();
  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: () => api<Stats>("/api/admin/stats") });
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => api<User[]>("/api/admin/users") });
  const [target, setTarget] = useState<User | null>(null);

  const mutate = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api(`/api/admin/users/${id}`, { method: "PATCH", json: { status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      setTarget(null);
    },
  });

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">Back office</p>
      <h1 className="serif mt-2 text-4xl">Administration</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Kpi label="Travelers" value={stats.data?.travelers ?? "—"} />
        <Kpi label="Active" value={stats.data?.active_travelers ?? "—"} />
        <Kpi label="Trips" value={stats.data?.trips ?? "—"} />
      </div>
      <div className="mt-8 overflow-hidden rounded-3xl border border-line bg-white/50">
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
                  <div className="font-medium">{u.full_name}</div>
                  <div className="text-xs text-muted">{u.email}</div>
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

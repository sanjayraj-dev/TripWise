import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { api } from "../api/client";
import type { AppNotification } from "../types";

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export function NotificationBell({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<AppNotification[]>("/api/notifications"),
    refetchInterval: 20000,
  });

  const markOne = useMutation({
    mutationFn: (id: number) => api(`/api/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAll = useMutation({
    mutationFn: () => api("/api/notifications/read-all", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const items = q.data ?? [];
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function openItem(n: AppNotification) {
    if (!n.read) markOne.mutate(n.id);
    setOpen(false);
    navigate(n.href || "/app");
  }

  const btn = light
    ? "w-full text-paper/70 hover:bg-white/5 hover:text-paper"
    : compact
      ? "text-ink-soft hover:bg-paper-2 hover:text-ink"
      : "w-full text-ink-soft hover:bg-paper-2 hover:text-ink";
  const panel = light
    ? "left-full bottom-0 ml-3 origin-bottom-left"
    : "right-0 top-full mt-2 origin-top-right";

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition ${btn}`}
        aria-label={unread ? `${unread} unread notifications` : "Notifications"}
      >
        <Bell size={18} />
        {!compact && <span>Inbox</span>}
        {unread > 0 && (
          <span className={`${compact ? "absolute right-1 top-1" : "ml-auto"} grid min-w-5 place-items-center rounded-full bg-terracotta px-1.5 text-[10px] font-semibold text-white`}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          className={`absolute z-40 w-80 overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_18px_40px_-20px_rgba(27,42,74,0.55)] ${panel}`}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-medium">Inbox</p>
            {unread > 0 && (
              <button
                type="button"
                className="text-xs text-ink-soft hover:text-ink"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-muted">No notifications yet.</li>
            ) : (
              items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className={`block w-full px-4 py-3 text-left hover:bg-paper-2 ${n.read ? "" : "bg-terracotta/10"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{n.title}</p>
                      <span className="shrink-0 text-[11px] text-muted">{timeAgo(n.created_at)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-soft">{n.body}</p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

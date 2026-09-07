import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { eachDay, shortDate, weekday } from "../lib";
import type { CalEvent } from "../types";

export function CalendarPage() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const { data } = useQuery({ queryKey: ["calendar"], queryFn: () => api<CalEvent[]>("/api/calendar") });
  const monthStart = new Date(cursor + "T00:00:00");
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const days = eachDay(cursor, monthEnd.toISOString().slice(0, 10));
  const pad = monthStart.getDay();

  const byDay = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    for (const e of data ?? []) {
      (map[e.date] ??= []).push(e);
    }
    return map;
  }, [data]);

  function shift(delta: number) {
    const d = new Date(cursor + "T00:00:00");
    d.setMonth(d.getMonth() + delta);
    setCursor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
  }

  const label = monthStart.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">Ops board</p>
          <h1 className="serif mt-2 text-5xl">Calendar</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => shift(-1)} className="rounded-full border border-line px-3 py-1.5 text-sm">Prev</button>
          <span className="serif text-xl">{label}</span>
          <button onClick={() => shift(1)} className="rounded-full border border-line px-3 py-1.5 text-sm">Next</button>
        </div>
      </div>
      <div className="mt-8 grid grid-cols-7 gap-2 text-center text-[11px] uppercase tracking-wider text-muted">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2">
        {Array.from({ length: pad }).map((_, i) => <div key={`p${i}`} />)}
        {days.map((day) => {
          const items = byDay[day] ?? [];
          const isToday = day === new Date().toISOString().slice(0, 10);
          return (
            <div key={day} className={`min-h-28 rounded-2xl border p-2 ${isToday ? "border-terracotta bg-white" : "border-line bg-white/50"}`}>
              <div className="flex justify-between text-xs">
                <span className="font-semibold">{shortDate(day).split(" ")[0]}</span>
                <span className="text-muted">{weekday(day)}</span>
              </div>
              <div className="mt-1 space-y-1">
                {items.slice(0, 3).map((e) => (
                  <Link key={e.id} to={`/app/trips/${e.trip_id}`} className={`block truncate rounded-lg px-1.5 py-1 text-[11px] ${e.kind === "trip" ? "bg-ink text-paper" : "bg-paper-2 text-ink"}`}>
                    {e.title}
                  </Link>
                ))}
                {items.length > 3 && <div className="text-[10px] text-muted">+{items.length - 3}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

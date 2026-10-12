import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { prettyDate, tripLength } from "../lib";
import { Button, inputClass } from "./ui";

const STYLES = [
  { id: "culture", label: "Culture" },
  { id: "leisure", label: "Leisure" },
  { id: "adventure", label: "Adventure" },
] as const;

export type MatchSignal = {
  id: string;
  label: string;
  value: number;
  contribution: number;
};

export type MatchHit = {
  tripId: number;
  title: string;
  owner: string;
  isOwner: boolean;
  isMember?: boolean;
  isPending?: boolean;
  cities: string[];
  startDate: string;
  endDate: string;
  tripType: string;
  seats: number;
  joinMode: string;
  lat: number | null;
  lng: number | null;
  score: number;
  baselineScore: number;
  heuristicScore: number;
  reason: string;
  bucket: "overlap" | "nearby" | "other";
  signals: MatchSignal[];
  overlapDays: number;
};

type ModelCard = {
  algorithm: string;
  nEstimators: number;
  maxDepth: number;
  nTrain: number;
  nTest: number;
  story: string;
  features: { id: string; label: string; importance: number }[];
  metrics: {
    positive_rate: number;
    forest: { accuracy: number; roc_auc: number; log_loss: number };
    linear: { accuracy: number; roc_auc: number; log_loss: number };
  };
};

function band(score: number) {
  if (score >= 70) return "high";
  if (score >= 40) return "mid";
  return "low";
}

function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const color = score >= 70 ? "#E07A5F" : score >= 40 ? "#D4A373" : "#7a6f5f";
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-label={`Match score ${score}`}>
      <circle cx="20" cy="20" r={r} fill="none" stroke="#e2d8c8" strokeWidth="3.5" />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform="rotate(-90 20 20)"
      />
      <text x="20" y="24" textAnchor="middle" fill="#1b2a4a" fontFamily="Fraunces, Georgia, serif" fontSize="12">
        {score}
      </text>
    </svg>
  );
}

function FeatureBars({ signals }: { signals: MatchSignal[] }) {
  return (
    <ul className="space-y-2">
      {signals.map((s) => (
        <li key={s.id}>
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-medium text-ink">{s.label}</span>
            <span className="text-muted">
              {s.value}
              {s.contribution !== 0 && (
                <span className={s.contribution > 0 ? "text-sage-dark" : "text-danger"}>
                  {" "}
                  {s.contribution > 0 ? "+" : ""}
                  {s.contribution}
                </span>
              )}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-3">
            <div
              className="h-full rounded-full bg-terracotta"
              style={{ width: `${Math.max(4, Math.min(100, s.value))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function MatchMap({
  matches,
  selectedId,
  onSelect,
}: {
  matches: MatchHit[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const points = matches.filter((m) => m.lat != null && m.lng != null);
  const pinKey = points.map((m) => `${m.tripId}:${m.score}:${selectedId === m.tripId ? 1 : 0}`).join("|");

  useEffect(() => {
    if (!ref.current || !points.length) return;
    const map = L.map(ref.current, { scrollWheelZoom: false, attributionControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    const latlngs: [number, number][] = [];
    points.forEach((m) => {
      const ll = [m.lat as number, m.lng as number] as [number, number];
      latlngs.push(ll);
      const on = m.tripId === selectedId ? " is-on" : "";
      const icon = L.divIcon({
        className: "",
        html: `<div class="tw-match-pin is-${band(m.score)}${on}">${m.score}</div>`,
        iconSize: [36, 32],
        iconAnchor: [18, 16],
      });
      const marker = L.marker(ll, { icon }).bindPopup(`${m.title} · ${m.score}`).addTo(map);
      marker.on("click", () => onSelect(m.tripId));
    });

    if (latlngs.length === 1) map.setView(latlngs[0], 5);
    else map.fitBounds(L.latLngBounds(latlngs).pad(0.28));
    const t = setTimeout(() => map.invalidateSize(), 80);
    return () => {
      clearTimeout(t);
      map.remove();
    };
    // pinKey captures score + selection; points is derived from matches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinKey, onSelect]);

  if (!points.length) {
    return (
      <div className="grid h-full min-h-[280px] place-items-center rounded-[1.6rem] border border-dashed border-line text-sm text-muted">
        Ranked crews will land on the map once a destination is set.
      </div>
    );
  }

  return <div ref={ref} className="h-full min-h-[280px] overflow-hidden rounded-[1.6rem] border border-line" />;
}

export function MatchFinder() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [destination, setDestination] = useState(user?.home_city || "Kyoto");
  const [startDate, setStartDate] = useState("2026-10-10");
  const [endDate, setEndDate] = useState("2026-10-16");
  const [interests, setInterests] = useState<string[]>([]);
  const [seatsNeeded, setSeatsNeeded] = useState(1);
  const [matches, setMatches] = useState<MatchHit[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modelOpen, setModelOpen] = useState(false);

  const model = useQuery({
    queryKey: ["match-model"],
    queryFn: () => api<ModelCard>("/api/match/model"),
    staleTime: Infinity,
  });

  const join = useMutation({
    mutationFn: (id: number) => api<{ status: string; message: string }>(`/api/trips/${id}/join`, { method: "POST" }),
    onSuccess: (res, id) => {
      qc.invalidateQueries({ queryKey: ["discover"] });
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      if (res.status === "pending") {
        setMatches((prev) => prev.map((m) => (m.tripId === id ? { ...m, isPending: true } : m)));
      }
      if (res.status === "active") {
        setMatches((prev) => prev.map((m) => (m.tripId === id ? { ...m, isMember: true, isPending: false } : m)));
      }
    },
  });

  useEffect(() => {
    join.reset();
  }, [selectedId]);

  function toggleStyle(id: string) {
    setInterests((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  useEffect(() => {
    if (!destination.trim() || !startDate || !endDate) return;
    if (endDate < startDate) {
      setError("End date must be on or after start date.");
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const data = await api<{ matches: MatchHit[] }>("/api/match/design", {
          method: "POST",
          json: {
            destination: destination.trim(),
            startDate,
            endDate,
            interests,
            seatsNeeded,
          },
        });
        const rows = data.matches ?? [];
        setMatches(rows);
        setSelectedId((current) => (current && rows.some((r) => r.tripId === current) ? current : rows[0]?.tripId ?? null));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not rank trips");
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [destination, startDate, endDate, interests, seatsNeeded]);

  const selected = matches.find((m) => m.tripId === selectedId) ?? matches[0] ?? null;

  const maxImportance = useMemo(() => {
    const feats = model.data?.features ?? [];
    return Math.max(0.01, ...feats.map((f) => f.importance));
  }, [model.data]);

  return (
    <div className="mt-8 rounded-[1.6rem] border border-line bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">Crew matcher</p>
      <h2 className="serif mt-1 text-3xl">Find overlapping crews</h2>
      <p className="mt-1 max-w-2xl text-sm text-ink-soft">
        Type a city and dates. Place comes first — Bangalore ranks Coorg above a Kyoto trip that only shares the month.
        Dates and style then reshuffle the nearby crews.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wider text-muted">Destination</span>
          <input className={inputClass} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Bangalore, Kyoto, Lisbon…" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wider text-muted">Seats needed</span>
          <input
            className={inputClass}
            type="number"
            min={1}
            max={12}
            value={seatsNeeded}
            onChange={(e) => setSeatsNeeded(Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wider text-muted">From</span>
          <input className={inputClass} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wider text-muted">Until</span>
          <input className={inputClass} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {STYLES.map((s) => {
          const on = interests.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggleStyle(s.id)}
              className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                on ? "bg-ink text-paper" : "bg-paper-2 text-ink-soft hover:bg-paper-3"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-muted">
        <span className={`inline-block h-2 w-2 rounded-full ${loading ? "animate-pulse bg-terracotta" : "bg-sage"}`} />
        {loading ? "Ranking public crews…" : `${matches.length} public trip${matches.length === 1 ? "" : "s"} ranked`}
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {!!matches.length && (
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div>
            <MatchMap matches={matches} selectedId={selectedId} onSelect={setSelectedId} />
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <i className="inline-block h-2.5 w-2.5 rounded-full bg-terracotta" /> Strong match
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="inline-block h-2.5 w-2.5 rounded-full bg-gold" /> Possible
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="inline-block h-2.5 w-2.5 rounded-full bg-navy" /> Weak
              </span>
            </div>
          </div>

          <div className="flex max-h-[420px] flex-col overflow-hidden rounded-[1.4rem] border border-line bg-paper/40">
            <div className="overflow-y-auto p-2">
              {matches.map((m) => (
                <button
                  key={m.tripId}
                  type="button"
                  onClick={() => setSelectedId(m.tripId)}
                  className={`mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                    m.tripId === selected?.tripId ? "bg-white shadow-sm" : "hover:bg-white/70"
                  }`}
                >
                  <ScoreRing score={m.score} size={52} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{m.title}</span>
                      {m.bucket === "overlap" && (
                        <span className="shrink-0 rounded-full bg-terracotta/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-terracotta">
                          dates
                        </span>
                      )}
                      {m.bucket === "nearby" && (
                        <span className="shrink-0 rounded-full bg-gold/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                          nearby
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-ink-soft">
                      {(m.cities || []).join(", ") || "Route TBA"} · {prettyDate(m.startDate)}
                    </div>
                    <div className="truncate text-xs text-muted">{m.reason}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="mt-5 grid gap-5 rounded-[1.4rem] bg-paper-2/80 p-5 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">{selected.owner}</p>
            <h3 className="serif text-2xl">{selected.title}</h3>
            <p className="mt-1 text-sm text-ink-soft">
              {(selected.cities || []).join(" → ") || "Route TBA"} · {prettyDate(selected.startDate)} —{" "}
              {prettyDate(selected.endDate)} · {tripLength(selected.startDate, selected.endDate)} days
            </p>
            <p className="mt-2 text-sm">{selected.reason}</p>
            <div className="mt-4 flex items-end gap-4">
              <div>
                <ScoreRing score={selected.score} />
                <p className="mt-1 text-center text-[11px] uppercase tracking-wider text-muted">Forest</p>
              </div>
              <div className="pb-2 text-sm text-ink-soft">
                Linear baseline <span className="serif text-xl text-ink">{selected.baselineScore}</span>
                <div className="text-xs text-muted">Heuristic sum {selected.heuristicScore}</div>
                {selected.score !== selected.baselineScore && (
                  <div className="mt-1 text-xs">
                    Gap of {Math.abs(selected.score - selected.baselineScore)} — the forest uses dest × dates, not a
                    weighted sum.
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4">
              {selected.isOwner || selected.isMember ? (
                <Link to={`/app/trips/${selected.tripId}`} className="inline-flex rounded-full bg-ink px-4 py-2 text-sm text-paper">
                  Open workspace
                </Link>
              ) : selected.isPending ? (
                <span className="text-sm text-muted">Request pending — waiting for the owner.</span>
              ) : (
                <Button onClick={() => join.mutate(selected.tripId)} disabled={join.isPending}>
                  Request to join
                </Button>
              )}
              {join.isSuccess && !selected.isOwner && !selected.isMember && !selected.isPending && (
                <span className="ml-3 text-sm text-sage-dark">{join.data?.message ?? "Sent."}</span>
              )}
              {join.isError && (
                <p className="mt-2 text-sm text-danger">{join.error instanceof Error ? join.error.message : "Could not join."}</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">What the model saw</p>
            <p className="mb-3 mt-1 text-xs text-ink-soft">Bar length is the input. Green/red is how much it moved this score vs the average crew.</p>
            <FeatureBars signals={selected.signals ?? []} />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setModelOpen((v) => !v)}
        className="mt-5 text-sm text-ink-soft underline-offset-2 hover:text-ink hover:underline"
      >
        {modelOpen ? "Hide how crews are ranked" : "How crews are ranked"}
      </button>

      {modelOpen && model.data && (
        <div className="mt-4 grid gap-6 rounded-[1.4rem] border border-line bg-paper/50 p-5 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-terracotta">Held-out test</p>
            <p className="mt-2 text-sm text-ink-soft">{model.data.story}</p>
            <p className="mt-3 text-xs text-muted">
              {model.data.nTrain.toLocaleString()} train · {model.data.nTest.toLocaleString()} test · join rate{" "}
              {Math.round(model.data.metrics.positive_rate * 100)}% · {model.data.algorithm} ({model.data.nEstimators}{" "}
              trees, depth {model.data.maxDepth})
            </p>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted">
                  <th className="pb-2 font-medium">Model</th>
                  <th className="pb-2 font-medium">ROC-AUC</th>
                  <th className="pb-2 font-medium">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-1">Forest</td>
                  <td className="serif text-lg">{model.data.metrics.forest.roc_auc}</td>
                  <td>{model.data.metrics.forest.accuracy}</td>
                </tr>
                <tr className="text-ink-soft">
                  <td className="py-1">Linear baseline</td>
                  <td className="serif text-lg">{model.data.metrics.linear.roc_auc}</td>
                  <td>{model.data.metrics.linear.accuracy}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Global feature importance</p>
            <ul className="mt-4 space-y-3">
              {model.data.features.map((f) => (
                <li key={f.id}>
                  <div className="flex justify-between text-xs">
                    <span>{f.label}</span>
                    <span className="text-muted">{f.importance.toFixed(2)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-3">
                    <div
                      className="h-full rounded-full bg-navy"
                      style={{ width: `${(f.importance / maxImportance) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

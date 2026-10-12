import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RouteMapPayload, RouteStop, RouteVia } from "../types";

function formatLeg(distanceKm: number, durationMin: number) {
  if (!distanceKm && !durationMin) return "";
  const km = Math.round(distanceKm).toLocaleString("en-IN");
  const hours = Math.floor(durationMin / 60);
  const mins = durationMin % 60;
  const time = durationMin ? (hours > 0 ? `${hours} hr ${mins} min` : `${mins} min`) : "";
  return time ? `${km} km · ${time}` : `${km} km`;
}

export function MapView({
  route,
  selectedId,
  onSelect,
  height = 420,
}: {
  route: RouteMapPayload | null;
  selectedId?: number | null;
  onSelect?: (id: number) => void;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const stops = route?.stops ?? [];
  const vias = route?.vias ?? [];
  const origin = route?.origin;
  const drive = route?.driveGeometry?.length ? route.driveGeometry : route?.mode === "driving" ? route.geometry : [];
  const flight = route?.flightGeometry ?? [];
  const pinKey = [
    origin ? `${origin.kind}:${origin.lat}:${origin.lng}` : "",
    stops.map((s) => `${s.id}:${s.lat}`).join("|"),
    vias.map((v) => v.label).join(","),
    drive.length,
    flight.length,
    selectedId ?? "",
    route?.mode ?? "",
  ].join(":");

  useEffect(() => {
    if (!ref.current) return;
    if (!stops.length && !origin) return;
    const map = L.map(ref.current, { scrollWheelZoom: true, attributionControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    const bounds: [number, number][] = [];

    if (flight.length > 1) {
      const line = flight.map(([lat, lng]) => [lat, lng] as [number, number]);
      L.polyline(line, { color: "#1B2A4A", weight: 3, opacity: 0.75, dashArray: "8 10" }).addTo(map);
      bounds.push(...line);
    }
    if (drive.length > 1) {
      const dashed = route?.mode === "straight";
      const line = drive.map(([lat, lng]) => [lat, lng] as [number, number]);
      L.polyline(line, {
        color: "#E07A5F",
        weight: dashed ? 3 : 5,
        opacity: 0.9,
        dashArray: dashed ? "6 8" : undefined,
      }).addTo(map);
      bounds.push(...line);
    } else if (!flight.length && (route?.geometry?.length ?? 0) > 1) {
      const line = (route?.geometry ?? []).map(([lat, lng]) => [lat, lng] as [number, number]);
      L.polyline(line, { color: "#E07A5F", weight: 5, opacity: 0.9 }).addTo(map);
      bounds.push(...line);
    }

    vias.forEach((v: RouteVia) => {
      const ll = [v.lat, v.lng] as [number, number];
      bounds.push(ll);
      const icon = L.divIcon({
        className: "",
        html: `<div class="tw-via-pin" title="${v.label}"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      L.marker(ll, { icon, zIndexOffset: 200 }).bindPopup(`Via · ${v.label}`).addTo(map);
    });

    if (origin && origin.kind !== "stop") {
      const ll = [origin.lat, origin.lng] as [number, number];
      bounds.push(ll);
      const icon = L.divIcon({
        className: "",
        html: `<div class="tw-here-pin" title="${origin.label}"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker(ll, { icon, zIndexOffset: 500 }).bindPopup(`${origin.kind === "home" ? "Home" : "You"} · ${origin.label}`).addTo(map);
    }

    stops.forEach((s: RouteStop, i: number) => {
      const ll = [s.lat, s.lng] as [number, number];
      bounds.push(ll);
      const selected = s.id === selectedId;
      const icon = L.divIcon({
        className: "",
        html: `<div class="tw-pin${selected ? " is-on" : ""}">${s.sequence || i + 1}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = L.marker(ll, { icon, zIndexOffset: 400 }).bindPopup(`${s.sequence || i + 1}. ${s.city}`).addTo(map);
      marker.on("click", () => onSelect?.(s.id));
    });

    if (bounds.length === 1) map.setView(bounds[0], 11);
    else if (bounds.length) map.fitBounds(L.latLngBounds(bounds).pad(0.22));

    const t = setTimeout(() => map.invalidateSize(), 80);
    return () => {
      clearTimeout(t);
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinKey, onSelect]);

  if (!stops.length && !origin) {
    return (
      <div className="rounded-[1.6rem] border border-dashed border-line p-10 text-center text-sm text-muted">
        Add destinations so TripWise can geocode them onto the map.
      </div>
    );
  }

  const label =
    route?.mode === "driving"
      ? `Driving route · ${formatLeg(route.distanceKm, route.durationMin)}`
      : route?.mode === "mixed"
        ? `Flight then road · ${formatLeg(route.distanceKm, route.durationMin)}`
        : route?.mode === "flight"
          ? `Flight path · ${formatLeg(route.distanceKm, 0)}`
          : route?.mode === "straight"
            ? `Corridor · ${formatLeg(route.distanceKm, 0)}`
            : "";

  return (
    <div>
      <div ref={ref} className="overflow-hidden rounded-[1.6rem] border border-line" style={{ height }} />
      {label && <p className="mt-2 text-sm text-ink-soft">{label}</p>}
      {route?.message && <p className="mt-1 text-sm text-muted">{route.message}</p>}
      {(flight.length > 1 || (route?.mode === "mixed")) && (
        <p className="mt-1 text-xs text-muted">Dashed navy = flight / no road. Terracotta = driving.</p>
      )}
    </div>
  );
}

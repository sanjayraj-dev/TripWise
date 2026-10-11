import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Point = { id: number; city: string; lat: number; lng: number };

async function roadRoute(points: [number, number][]) {
  if (points.length < 2) return null;
  const coords = points.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0];
    const line = route?.geometry?.coordinates;
    if (!line?.length) return null;
    return {
      line: line.map(([lng, lat]: number[]) => [lat, lng] as [number, number]),
      distanceM: route.distance as number,
      durationS: route.duration as number,
    };
  } catch {
    return null;
  }
}

function getLocation(): Promise<[number, number] | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}

function formatLeg(distanceM: number, durationS: number) {
  const km = Math.round(distanceM / 1000);
  const hours = Math.floor(durationS / 3600);
  const mins = Math.round((durationS % 3600) / 60);
  const time = hours > 0 ? `${hours} hr ${mins} min` : `${mins} min`;
  return `${km.toLocaleString()} km · ${time}`;
}

export function MapView({
  points,
  height = 320,
  selectedId,
  onSelect,
}: {
  points: Point[];
  height?: number;
  selectedId?: number | null;
  onSelect?: (id: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!ref.current || !points.length) return;
    const map = L.map(ref.current, { scrollWheelZoom: false, attributionControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    const latlngs = points.map((p) => [p.lat, p.lng] as [number, number]);
    latlngs.forEach((ll, i) => {
      const selected = points[i].id === selectedId;
      const icon = L.divIcon({
        className: "",
        html: `<div class="tw-pin${selected ? " is-on" : ""}">${i + 1}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = L.marker(ll, { icon }).bindPopup(`${i + 1}. ${points[i].city}`).addTo(map);
      marker.on("click", () => onSelect?.(points[i].id));
    });

    let cancelled = false;
    (async () => {
      const here = await getLocation();
      if (cancelled) return;

      const routePoints = here ? [here, ...latlngs] : latlngs;
      if (here) {
        L.circleMarker(here, {
          radius: 8,
          color: "#1B3A4B",
          fillColor: "#2F6FED",
          fillOpacity: 1,
          weight: 2,
        }).bindTooltip("You are here").addTo(map);
      }

      const road = await roadRoute(routePoints);
      if (cancelled) return;

      if (road) {
        L.polyline(road.line, { color: "#E07A5F", weight: 5, opacity: 0.9 }).addTo(map);
        map.fitBounds(L.latLngBounds(road.line).pad(0.2));
        setLabel(formatLeg(road.distanceM, road.durationS));
      } else if (latlngs.length > 1) {
        L.polyline(latlngs, { color: "#E07A5F", weight: 3, dashArray: "6 8" }).addTo(map);
        map.fitBounds(L.latLngBounds(latlngs).pad(0.35));
        setLabel("");
      } else {
        map.setView(latlngs[0], 11);
        setLabel("");
      }
    })();

    const t = setTimeout(() => map.invalidateSize(), 80);
    return () => {
      cancelled = true;
      clearTimeout(t);
      map.remove();
    };
  }, [points, selectedId, onSelect]);

  if (!points.length) {
    return (
      <div className="rounded-[1.6rem] border border-dashed border-line p-10 text-center text-sm text-muted">
        Add destinations so TripWise can geocode them onto the map.
      </div>
    );
  }

  return (
    <div>
      <div ref={ref} className="overflow-hidden rounded-[1.6rem] border border-line" style={{ height }} />
      {label && (
        <p className="mt-2 text-sm text-ink-soft">
          Driving route · {label}
        </p>
      )}
    </div>
  );
}
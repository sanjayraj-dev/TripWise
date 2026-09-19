import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Point = { id: number; city: string; lat: number; lng: number };

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
    if (latlngs.length > 1) {
      L.polyline(latlngs, { color: "#E07A5F", weight: 3, dashArray: "6 8" }).addTo(map);
    }
    map.fitBounds(L.latLngBounds(latlngs).pad(0.35));
    const t = setTimeout(() => map.invalidateSize(), 80);
    return () => {
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
  return <div ref={ref} className="overflow-hidden rounded-[1.6rem] border border-line" style={{ height }} />;
}

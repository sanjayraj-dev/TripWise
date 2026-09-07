import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Point = { id: number; city: string; lat: number; lng: number };

export function MapView({ points, height = 320 }: { points: Point[]; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !points.length) return;
    const map = L.map(ref.current, { scrollWheelZoom: false, attributionControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    const latlngs = points.map((p) => [p.lat, p.lng] as [number, number]);
    latlngs.forEach((ll, i) => {
      L.circleMarker(ll, { radius: 8, color: "#E07A5F", fillColor: "#1B2A4A", fillOpacity: 0.9, weight: 2 })
        .bindPopup(`${i + 1}. ${points[i].city}`)
        .addTo(map);
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
  }, [points]);

  if (!points.length) {
    return <div className="rounded-[1.6rem] border border-dashed border-line p-10 text-center text-sm text-muted">Add destinations to plot the route.</div>;
  }
  return <div ref={ref} className="overflow-hidden rounded-[1.6rem] border border-line" style={{ height }} />;
}

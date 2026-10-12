"""Corridor from the traveler's current place (or home city) to trip destinations."""

from __future__ import annotations

from math import asin, atan2, cos, degrees, radians, sin, sqrt

import httpx

from app.core.geo import NOMINATIM_HEADERS

OSRM_URL = "https://router.project-osrm.org/route/v1/driving"
PHOTON_URL = "https://photon.komoot.io/reverse"
NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse"

_REVERSE_CACHE: dict[tuple[float, float], dict | None] = {}

# Major cities used when a driving route does not exist (oceans / flights).
MAJOR_CITIES: list[tuple[str, float, float]] = [
    ("Mumbai", 19.0760, 72.8777),
    ("Delhi", 28.6139, 77.2090),
    ("Bengaluru", 12.9716, 77.5946),
    ("Chennai", 13.0827, 80.2707),
    ("Hyderabad", 17.3850, 78.4867),
    ("Kolkata", 22.5726, 88.3639),
    ("Pune", 18.5204, 73.8567),
    ("Ahmedabad", 23.0225, 72.5714),
    ("Jaipur", 26.9124, 75.7873),
    ("Panaji", 15.4909, 73.8278),
    ("Mysore", 12.2958, 76.6394),
    ("Mangalore", 12.9141, 74.8560),
    ("Hubli", 15.3647, 75.1240),
    ("Hospet", 15.2695, 76.3871),
    ("Udaipur", 24.5854, 73.7125),
    ("Ahmednagar", 19.0948, 74.7480),
    ("Surat", 21.1702, 72.8311),
    ("Vadodara", 22.3072, 73.1812),
    ("Indore", 22.7196, 75.8577),
    ("Bhopal", 23.2599, 77.4126),
    ("Nagpur", 21.1458, 79.0882),
    ("Nashik", 19.9975, 73.7898),
    ("Chandigarh", 30.7333, 76.7794),
    ("Shimla", 31.1048, 77.1734),
    ("Manali", 32.2396, 77.1887),
    ("Dehradun", 30.3165, 78.0322),
    ("Rishikesh", 30.0869, 78.2676),
    ("Leh", 34.1526, 77.5771),
    ("Srinagar", 34.0837, 74.7973),
    ("Kochi", 9.9312, 76.2673),
    ("Madurai", 9.9252, 78.1198),
    ("Coimbatore", 11.0168, 76.9558),
    ("Visakhapatnam", 17.6868, 83.2185),
    ("Bhubaneswar", 20.2961, 85.8245),
    ("Patna", 25.5941, 85.1376),
    ("Lucknow", 26.8467, 80.9462),
    ("Varanasi", 25.3176, 82.9739),
    ("Guwahati", 26.1445, 91.7362),
    ("Tokyo", 35.6762, 139.6503),
    ("Yokohama", 35.4437, 139.6380),
    ("Nagoya", 35.1815, 136.9066),
    ("Kyoto", 35.0116, 135.7681),
    ("Osaka", 34.6937, 135.5023),
    ("Kobe", 34.6901, 135.1955),
    ("Hiroshima", 34.3853, 132.4553),
    ("Fukuoka", 33.5904, 130.4017),
    ("Sendai", 38.2682, 140.8694),
    ("Sapporo", 43.0618, 141.3545),
    ("Seoul", 37.5665, 126.9780),
    ("Busan", 35.1796, 129.0756),
    ("Taipei", 25.0330, 121.5654),
    ("Hong Kong", 22.3193, 114.1694),
    ("Shanghai", 31.2304, 121.4737),
    ("Beijing", 39.9042, 116.4074),
    ("Bangkok", 13.7563, 100.5018),
    ("Hanoi", 21.0278, 105.8342),
    ("Singapore", 1.3521, 103.8198),
    ("Kuala Lumpur", 3.1390, 101.6869),
    ("Dhaka", 23.8103, 90.4125),
    ("Kathmandu", 27.7172, 85.3240),
    ("Colombo", 6.9271, 79.8612),
    ("Dubai", 25.2048, 55.2708),
    ("Doha", 25.2854, 51.5310),
    ("Lisbon", 38.7223, -9.1393),
    ("Porto", 41.1579, -8.6291),
    ("Faro", 37.0194, -7.9304),
    ("Madrid", 40.4168, -3.7038),
    ("Barcelona", 41.3874, 2.1686),
    ("Seville", 37.3891, -5.9845),
    ("Paris", 48.8566, 2.3522),
    ("Lyon", 45.7640, 4.8357),
    ("Rome", 41.9028, 12.4964),
    ("Milan", 45.4642, 9.1900),
    ("Frankfurt", 50.1109, 8.6821),
    ("London", 51.5074, -0.1278),
    ("Amsterdam", 52.3676, 4.9041),
    ("Zurich", 47.3769, 8.5417),
    ("Vienna", 48.2082, 16.3738),
    ("Athens", 37.9838, 23.7275),
    ("Istanbul", 41.0082, 28.9784),
    ("Cairo", 30.0444, 31.2357),
    ("Nairobi", 1.2921, 36.8219),
    ("New York", 40.7128, -74.0060),
    ("Los Angeles", 34.0522, -118.2437),
    ("San Francisco", 37.7749, -122.4194),
    ("Sydney", 33.8688, 151.2093),
]


def haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lng1 = a
    lat2, lng2 = b
    r = 6371.0
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    h = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    return 2 * r * atan2(sqrt(h), sqrt(max(0.0, 1 - h)))


def _bearing(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1 = radians(a[0]), radians(a[1])
    lat2, lon2 = radians(b[0]), radians(b[1])
    dlon = lon2 - lon1
    x = sin(dlon) * cos(lat2)
    y = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dlon)
    return atan2(x, y)


def cross_track_km(origin: tuple[float, float], dest: tuple[float, float], point: tuple[float, float]) -> float:
    d13 = haversine_km(origin, point) / 6371.0
    ang = _bearing(origin, point) - _bearing(origin, dest)
    return abs(asin(max(-1.0, min(1.0, sin(d13) * sin(ang))))) * 6371.0


def likely_flight(a: tuple[float, float], b: tuple[float, float]) -> bool:
    return haversine_km(a, b) > 1500


def geodesic_line(a: tuple[float, float], b: tuple[float, float], n: int = 72) -> list[list[float]]:
    lat1, lon1 = radians(a[0]), radians(a[1])
    lat2, lon2 = radians(b[0]), radians(b[1])
    d = 2 * asin(
        min(
            1.0,
            sqrt(
                sin((lat2 - lat1) / 2) ** 2
                + cos(lat1) * cos(lat2) * sin((lon2 - lon1) / 2) ** 2
            ),
        )
    )
    if d < 1e-8:
        return [[a[0], a[1]], [b[0], b[1]]]
    out: list[list[float]] = []
    for i in range(n + 1):
        f = i / n
        a_w = sin((1 - f) * d) / sin(d)
        b_w = sin(f * d) / sin(d)
        x = a_w * cos(lat1) * cos(lon1) + b_w * cos(lat2) * cos(lon2)
        y = a_w * cos(lat1) * sin(lon1) + b_w * cos(lat2) * sin(lon2)
        z = a_w * sin(lat1) + b_w * sin(lat2)
        lat = atan2(z, sqrt(x * x + y * y))
        lon = atan2(y, x)
        out.append([degrees(lat), degrees(lon)])
    return out


def gazetteer_vias(
    origin: tuple[float, float],
    dest: tuple[float, float],
    skip_names: set[str],
    max_vias: int = 5,
) -> list[dict]:
    ab = haversine_km(origin, dest)
    if ab < 90:
        return []
    min_end = max(50.0, ab * 0.1)
    min_gap = max(90.0, ab / (max_vias + 2))
    max_off = min(380.0, max(70.0, ab * 0.06))
    ranked: list[tuple[float, str, float, float]] = []
    for name, lat, lng in MAJOR_CITIES:
        if name.strip().lower() in skip_names:
            continue
        p = (lat, lng)
        if haversine_km(origin, p) < min_end or haversine_km(dest, p) < min_end:
            continue
        detour = (haversine_km(origin, p) + haversine_km(p, dest)) / ab
        if detour > 1.10:
            continue
        if cross_track_km(origin, dest, p) > max_off:
            continue
        ranked.append((haversine_km(origin, p), name, lat, lng))
    ranked.sort()
    found: list[dict] = []
    for _dist, name, lat, lng in ranked:
        if any(haversine_km((lat, lng), (v["lat"], v["lng"])) < min_gap for v in found):
            continue
        found.append(
            {
                "label": name,
                "lat": round(lat, 5),
                "lng": round(lng, 5),
                "kind": "via",
            }
        )
        if len(found) >= max_vias:
            break
    return found


def osrm_drive(points: list[tuple[float, float]]) -> dict | None:
    if len(points) < 2:
        return None
    coords = ";".join(f"{lng},{lat}" for lat, lng in points)
    try:
        res = httpx.get(
            f"{OSRM_URL}/{coords}",
            params={"overview": "full", "geometries": "geojson", "steps": "false"},
            timeout=20.0,
        )
        if res.status_code != 200:
            return None
        data = res.json()
    except Exception:
        return None
    if data.get("code") != "Ok" or not data.get("routes"):
        return None
    route = data["routes"][0]
    geom = route.get("geometry") or {}
    line = geom.get("coordinates") or []
    if len(line) < 2:
        return None
    legs = []
    for i, leg in enumerate(route.get("legs") or []):
        legs.append(
            {
                "fromIndex": i,
                "toIndex": i + 1,
                "distanceKm": round(float(leg.get("distance") or 0) / 1000, 1),
                "durationMin": round(float(leg.get("duration") or 0) / 60),
            }
        )
    return {
        "geometry": [[float(lat), float(lng)] for lng, lat in line],
        "distanceKm": round(float(route.get("distance") or 0) / 1000, 1),
        "durationMin": round(float(route.get("duration") or 0) / 60),
        "legs": legs,
    }


def _photon_label(lat: float, lng: float) -> str | None:
    try:
        res = httpx.get(PHOTON_URL, params={"lat": lat, "lon": lng, "lang": "en"}, timeout=6.0)
        res.raise_for_status()
        feats = (res.json() or {}).get("features") or []
        if not feats:
            return None
        props = feats[0].get("properties") or {}
        if props.get("osm_key") in {"highway", "building"}:
            return None
        for key in ("city", "town", "village", "name"):
            val = str(props.get(key) or "").strip()
            if val:
                return val
    except Exception:
        return None
    return None


def _nominatim_label(lat: float, lng: float) -> str | None:
    try:
        res = httpx.get(
            NOMINATIM_REVERSE,
            params={"lat": lat, "lon": lng, "format": "json", "zoom": 10, "addressdetails": 1, "accept-language": "en"},
            headers=NOMINATIM_HEADERS,
            timeout=6.0,
        )
        res.raise_for_status()
        addr = (res.json() or {}).get("address") or {}
        for key in ("city", "town", "village", "municipality", "county"):
            val = str(addr.get(key) or "").strip()
            if val:
                return val
    except Exception:
        return None
    return None


def _latin(name: str | None) -> bool:
    if not name:
        return False
    return all(ord(c) < 128 for c in name)


def reverse_place(lat: float, lng: float) -> str | None:
    key = (round(lat, 2), round(lng, 2))
    if key in _REVERSE_CACHE:
        cached = _REVERSE_CACHE[key]
        return cached.get("label") if cached else None
    photon = _photon_label(lat, lng)
    if _latin(photon):
        label = photon
    else:
        nominatim = _nominatim_label(lat, lng)
        label = nominatim if _latin(nominatim) else nominatim or photon
    if label and label.lower() in {"india", "japan", "portugal", "spain", "south korea", "taiwan", "china"}:
        label = None
    _REVERSE_CACHE[key] = {"label": label} if label else None
    return label


def _nearest_index(line: list[list[float]], point: tuple[float, float]) -> int:
    return min(range(len(line)), key=lambda i: haversine_km((line[i][0], line[i][1]), point))


def _sample_segment(line: list[list[float]], start_i: int, end_i: int, count: int) -> list[list[float]]:
    if end_i <= start_i + 2 or count <= 0:
        return []
    seg = line[start_i : end_i + 1]
    if len(seg) < 3:
        return []
    cum = [0.0]
    for i in range(1, len(seg)):
        cum.append(cum[-1] + haversine_km((seg[i - 1][0], seg[i - 1][1]), (seg[i][0], seg[i][1])))
    total = cum[-1]
    if total < 70:
        return []
    n = min(count, max(1, int(total // 90)))
    targets = [total * (i + 1) / (n + 1) for i in range(n)]
    out: list[list[float]] = []
    j = 0
    for t in targets:
        while j < len(cum) - 1 and cum[j] < t:
            j += 1
        out.append(seg[j])
    return out


def via_cities(
    geometry: list[list[float]],
    nodes: list[dict],
    max_vias: int = 6,
) -> list[dict]:
    if len(geometry) < 8 or len(nodes) < 2:
        return []
    indices = [_nearest_index(geometry, (s["lat"], s["lng"])) for s in nodes]
    skip_names = {(s.get("city") or s.get("label") or "").strip().lower() for s in nodes}
    found: list[dict] = []
    per_leg = max(1, max_vias // max(1, len(nodes) - 1))
    for leg_i, (a, b) in enumerate(zip(indices, indices[1:])):
        lo, hi = (a, b) if a <= b else (b, a)
        for pt in _sample_segment(geometry, lo, hi, per_leg):
            lat, lng = float(pt[0]), float(pt[1])
            if any(haversine_km((lat, lng), (s["lat"], s["lng"])) < 35 for s in nodes):
                continue
            if any(haversine_km((lat, lng), (v["lat"], v["lng"])) < 40 for v in found):
                continue
            label = reverse_place(lat, lng)
            if not label or label.strip().lower() in skip_names:
                continue
            low = label.lower()
            if any(w in low for w in ("taluk", "taluka", "tahsil", "tehsil", "mandal", "district")):
                continue
            found.append(
                {
                    "label": label,
                    "lat": round(lat, 5),
                    "lng": round(lng, 5),
                    "kind": "via",
                    "afterSequence": nodes[leg_i]["sequence"],
                }
            )
            skip_names.add(label.strip().lower())
            if len(found) >= max_vias:
                return found
    return found


def _corridor(nodes: list[dict], vias: list[dict]) -> list[dict]:
    by_seq: dict[int, list[dict]] = {}
    for v in vias:
        by_seq.setdefault(int(v.get("afterSequence") or 0), []).append(v)
    out: list[dict] = []
    for s in nodes:
        item = {
            "kind": s.get("kind") if s.get("kind") in {"here", "home", "stop"} else "stop",
            "label": s["label"],
            "lat": s["lat"],
            "lng": s["lng"],
        }
        if s.get("id") is not None:
            item["id"] = s["id"]
        if s.get("sequence") is not None:
            item["sequence"] = s["sequence"]
        out.append(item)
        for v in by_seq.get(int(s.get("sequence") or 0), []):
            out.append({"kind": "via", "label": v["label"], "lat": v["lat"], "lng": v["lng"]})
    return out


def _empty(stops: list[dict], message: str) -> dict:
    return {
        "origin": None,
        "destination": None,
        "stops": stops,
        "vias": [],
        "corridor": [],
        "geometry": [],
        "flightGeometry": [],
        "driveGeometry": [],
        "distanceKm": 0,
        "durationMin": 0,
        "legs": [],
        "mode": "none",
        "source": "none",
        "message": message,
        "geometryPointCount": 0,
    }


def build_route_map(destinations: list, start: dict | None = None) -> dict:
    stops = []
    for i, d in enumerate(sorted(destinations, key=lambda x: (x.arrival_date, x.sequence_no, x.id))):
        if d.lat is None or d.lng is None:
            continue
        stops.append(
            {
                "id": d.id,
                "city": d.city,
                "country": d.country,
                "label": d.city,
                "lat": float(d.lat),
                "lng": float(d.lng),
                "kind": "stop",
                "sequence": i + 1,
                "arrivalDate": d.arrival_date.isoformat() if d.arrival_date else None,
                "departureDate": d.departure_date.isoformat() if d.departure_date else None,
            }
        )

    if not stops:
        return _empty([], "Add destinations with coordinates to plot this route.")

    extra = None
    if start and start.get("lat") is not None and start.get("lng") is not None:
        slat, slng = float(start["lat"]), float(start["lng"])
        if haversine_km((slat, slng), (stops[0]["lat"], stops[0]["lng"])) >= 25:
            extra = {
                "id": 0,
                "city": start.get("label") or "You",
                "country": "",
                "label": start.get("label") or "You",
                "lat": slat,
                "lng": slng,
                "kind": start.get("kind") or "here",
                "sequence": 0,
            }

    nodes = ([extra] if extra else []) + stops
    dest = stops[-1]
    origin = nodes[0]

    if len(nodes) == 1:
        return {
            **_empty(stops, "Could not resolve a starting place. Set a home city on your profile, or allow location."),
            "origin": origin,
            "destination": dest,
            "corridor": _corridor(nodes, []),
            "mode": "place",
            "source": "geocode",
            "message": "Single stop — allow location or set a home city to draw the route from where you are.",
        }

    skip = {(n.get("city") or n.get("label") or "").strip().lower() for n in nodes}
    points = [(n["lat"], n["lng"]) for n in nodes]
    full_drive_ok = True
    if extra and likely_flight((extra["lat"], extra["lng"]), (stops[0]["lat"], stops[0]["lng"])):
        full_drive_ok = False
    driven = osrm_drive(points) if full_drive_ok else None
    if driven and driven["distanceKm"] > haversine_km(points[0], points[-1]) * 2.4:
        driven = None
    if driven:
        vias = via_cities(driven["geometry"], nodes)
        if not vias:
            for a, b in zip(nodes, nodes[1:]):
                chunk = gazetteer_vias((a["lat"], a["lng"]), (b["lat"], b["lng"]), skip)
                for v in chunk:
                    v["afterSequence"] = a["sequence"]
                    skip.add(v["label"].lower())
                vias.extend(chunk)
        from_label = extra["label"] if extra else origin["label"]
        return {
            "origin": origin,
            "destination": dest,
            "stops": stops,
            "vias": vias,
            "corridor": _corridor(nodes, vias),
            "geometry": driven["geometry"],
            "flightGeometry": [],
            "driveGeometry": driven["geometry"],
            "distanceKm": driven["distanceKm"],
            "durationMin": driven["durationMin"],
            "legs": driven["legs"],
            "mode": "driving",
            "source": "osrm",
            "message": f"Driving from {from_label}." if extra else None,
            "geometryPointCount": len(driven["geometry"]),
        }

    flight_geom: list[list[float]] = []
    flight_vias: list[dict] = []
    drive_geom: list[list[float]] = []
    drive_vias: list[dict] = []
    drive_meta = None
    message_bits: list[str] = []

    if extra:
        flight_geom = geodesic_line((extra["lat"], extra["lng"]), (stops[0]["lat"], stops[0]["lng"]))
        flight_vias = gazetteer_vias((extra["lat"], extra["lng"]), (stops[0]["lat"], stops[0]["lng"]), skip)
        for i, v in enumerate(flight_vias):
            v["afterSequence"] = 0
        message_bits.append(f"No continuous road from {extra['label']} — showing a flight path, then the trip.")
        skip.update(v["label"].lower() for v in flight_vias)

    if len(stops) >= 2:
        drive_meta = osrm_drive([(s["lat"], s["lng"]) for s in stops])
        if drive_meta:
            drive_geom = drive_meta["geometry"]
            drive_vias = via_cities(drive_geom, stops)
            if not drive_vias:
                for a, b in zip(stops, stops[1:]):
                    chunk = gazetteer_vias((a["lat"], a["lng"]), (b["lat"], b["lng"]), skip)
                    for v in chunk:
                        v["afterSequence"] = a["sequence"]
                        skip.add(v["label"].lower())
                    drive_vias.extend(chunk)
        else:
            drive_geom = [[s["lat"], s["lng"]] for s in stops]
            for a, b in zip(stops, stops[1:]):
                drive_vias.extend(
                    gazetteer_vias((a["lat"], a["lng"]), (b["lat"], b["lng"]), skip, max_vias=3)
                )
            for v in drive_vias:
                v.setdefault("afterSequence", stops[0]["sequence"])

    if not extra and not drive_meta:
        geometry = [[s["lat"], s["lng"]] for s in stops]
        vias = gazetteer_vias((stops[0]["lat"], stops[0]["lng"]), (dest["lat"], dest["lng"]), skip)
        for v in vias:
            v["afterSequence"] = stops[0]["sequence"]
        return {
            "origin": origin,
            "destination": dest,
            "stops": stops,
            "vias": vias,
            "corridor": _corridor(nodes, vias),
            "geometry": geometry,
            "flightGeometry": geodesic_line((origin["lat"], origin["lng"]), (dest["lat"], dest["lng"])) if haversine_km((origin["lat"], origin["lng"]), (dest["lat"], dest["lng"])) > 80 else [],
            "driveGeometry": geometry,
            "distanceKm": round(sum(haversine_km(points[i], points[i + 1]) for i in range(len(points) - 1)), 1),
            "durationMin": 0,
            "legs": [],
            "mode": "straight",
            "source": "haversine",
            "message": "No continuous driving route between these stops (likely a flight).",
            "geometryPointCount": len(geometry),
        }

    all_vias = flight_vias + drive_vias
    geometry = (flight_geom + drive_geom) if flight_geom else drive_geom
    dist = 0.0
    if extra:
        dist += haversine_km((extra["lat"], extra["lng"]), (stops[0]["lat"], stops[0]["lng"]))
    if drive_meta:
        dist += drive_meta["distanceKm"]
    elif len(stops) >= 2:
        dist += sum(haversine_km((stops[i]["lat"], stops[i]["lng"]), (stops[i + 1]["lat"], stops[i + 1]["lng"])) for i in range(len(stops) - 1))

    mode = "mixed" if extra and (drive_geom or len(stops) >= 1) else ("flight" if extra else "driving")
    return {
        "origin": origin,
        "destination": dest,
        "stops": stops,
        "vias": all_vias,
        "corridor": _corridor(nodes, all_vias),
        "geometry": geometry,
        "flightGeometry": flight_geom,
        "driveGeometry": drive_geom,
        "distanceKm": round(dist, 1),
        "durationMin": drive_meta["durationMin"] if drive_meta else 0,
        "legs": drive_meta["legs"] if drive_meta else [],
        "mode": mode,
        "source": "osrm+geodesic" if extra else "osrm",
        "message": " ".join(message_bits) or None,
        "geometryPointCount": len(geometry),
    }

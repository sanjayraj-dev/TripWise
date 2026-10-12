"""Shared trip-match features. Training and inference must use this module."""

from __future__ import annotations

from datetime import date
from math import atan2, cos, radians, sin, sqrt

REGIONS: dict[str, set[str]] = {
    "japan": {"tokyo", "kyoto", "osaka", "fukuoka"},
    "korea": {"seoul"},
    "taiwan": {"taipei"},
    "portugal": {"lisbon", "porto", "lagos"},
    "spain": {"barcelona"},
    "india_north": {"manali", "rishikesh", "leh", "udaipur", "ladakh"},
    "india_south": {
        "panaji",
        "goa",
        "hampi",
        "madikeri",
        "coorg",
        "bengaluru",
        "bangalore",
        "mysore",
        "mysuru",
        "mangalore",
        "chennai",
        "kochi",
        "coimbatore",
    },
}

# Query spellings that should collapse onto a canonical city in CITY_COORDS / REGIONS.
CITY_ALIASES: dict[str, str] = {
    "bangalore": "bengaluru",
    "blr": "bengaluru",
    "coorg": "madikeri",
    "kodagu": "madikeri",
    "goa": "panaji",
    "panjim": "panaji",
    "bombay": "mumbai",
    "mysuru": "mysore",
    "ladakh": "leh",
    "madras": "chennai",
    "calcutta": "kolkata",
}

# Seed / demo cities not always present on the road gazetteer.
_EXTRA_COORDS: dict[str, tuple[float, float]] = {
    "madikeri": (12.4244, 75.7382),
    "hampi": (15.3350, 76.4600),
    "coorg": (12.4244, 75.7382),
}

_COORDS: dict[str, tuple[float, float]] | None = None

STYLE_ALIASES: dict[str, set[str]] = {
    "culture": {"culture"},
    "leisure": {"leisure"},
    "adventure": {"adventure"},
    "food": {"leisure", "food"},
    "chill": {"leisure"},
    "family": {"family", "leisure"},
    "flexible": {"culture", "leisure", "adventure", "family", "flexible"},
}

FEATURE_NAMES = (
    "dest_sim",
    "overlap_frac",
    "tag_sim",
    "seats_ratio",
    "month_prox",
    "duration_sim",
)

FEATURE_LABELS = {
    "dest_sim": "Destination",
    "overlap_frac": "Dates",
    "tag_sim": "Style",
    "seats_ratio": "Seats",
    "month_prox": "Month",
    "duration_sim": "Length",
}


def span_days(start: date, end: date) -> int:
    return max(1, (end - start).days + 1)


def _norm(name: str) -> str:
    key = (name or "").strip().lower()
    return CITY_ALIASES.get(key, key)


def _coords() -> dict[str, tuple[float, float]]:
    global _COORDS
    if _COORDS is None:
        from app.core.routing import MAJOR_CITIES

        m = {name.strip().lower(): (lat, lng) for name, lat, lng in MAJOR_CITIES}
        m.update(_EXTRA_COORDS)
        for alias, canon in CITY_ALIASES.items():
            if canon in m:
                m.setdefault(alias, m[canon])
        _COORDS = m
    return _COORDS


def lookup_ll(name: str) -> tuple[float, float] | None:
    key = _norm(name)
    table = _coords()
    return table.get(key) or table.get((name or "").strip().lower())


def _haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lng1 = a
    lat2, lng2 = b
    r = 6371.0
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    h = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    return 2 * r * atan2(sqrt(h), sqrt(max(0.0, 1 - h)))


def geo_sim(km: float) -> float:
    """Drive-scale decay. ~250 km (Bengaluru–Madikeri) stays high; oceans collapse."""
    if km <= 30:
        return 1.0
    if km <= 400:
        return 1.0 - 0.18 * (km - 30) / 370.0
    if km <= 2200:
        return 0.82 - 0.60 * (km - 400) / 1800.0
    return 0.12


def _name_dest_sim(wanted: str, cities: list[str]) -> float:
    w = _norm(wanted)
    cities_l = [_norm(c) for c in cities if c]
    if not w or not cities_l:
        return 0.15
    if any(w == c or w in c or c in w for c in cities_l):
        return 1.0
    if w in REGIONS and any(c in REGIONS[w] for c in cities_l):
        return 0.65
    for group in REGIONS.values():
        if w in group and any(c in group for c in cities_l):
            return 0.65
    return 0.15


def dest_sim(
    wanted: str,
    cities: list[str],
    wanted_ll: tuple[float, float] | None = None,
    trip_points: list[tuple[float, float]] | None = None,
) -> float:
    name = _name_dest_sim(wanted, cities)
    origin = wanted_ll or lookup_ll(wanted)
    points = list(trip_points or [])
    if not points:
        points = [p for c in cities if (p := lookup_ll(c))]
    if not origin or not points:
        return name
    km = min(_haversine_km(origin, p) for p in points)
    geo = geo_sim(km)
    if name < 1.0:
        geo = min(geo, 0.92)
    return max(name, geo)


def overlap_days(a0: date, a1: date, b0: date, b1: date) -> int:
    start = max(a0, b0)
    end = min(a1, b1)
    return max(0, (end - start).days + 1)


def overlap_frac(a0: date, a1: date, b0: date, b1: date) -> float:
    return min(1.0, overlap_days(a0, a1, b0, b1) / span_days(a0, a1))


def tag_sim(wanted: list[str], trip_type: str | None) -> float:
    if not wanted:
        return 0.4
    style = (trip_type or "").strip().lower()
    hits = 0
    for raw in wanted:
        key = raw.strip().lower()
        if not key:
            continue
        group = STYLE_ALIASES.get(key, {key})
        if style in group or key in style or style in key:
            hits += 1
    n = len([t for t in wanted if t.strip()])
    if not n:
        return 0.4
    return min(1.0, hits / n)


def seats_ratio(seats: int, needed: int) -> float:
    need = max(1, needed)
    have = max(0, seats)
    return 1.0 if have >= need else have / need


def month_prox(wanted_start: date, trip_start: date) -> float:
    dist = min((wanted_start.month - trip_start.month) % 12, (trip_start.month - wanted_start.month) % 12)
    return 1.0 - dist / 6.0


def duration_sim(a0: date, a1: date, b0: date, b1: date) -> float:
    return 1.0 - min(abs(span_days(a0, a1) - span_days(b0, b1)), 14) / 14.0


def feature_vector(
    wanted_city: str,
    start: date,
    end: date,
    interests: list[str],
    seats_needed: int,
    cities: list[str],
    trip_start: date,
    trip_end: date,
    trip_type: str | None,
    seats: int,
    wanted_ll: tuple[float, float] | None = None,
    trip_points: list[tuple[float, float]] | None = None,
) -> list[float]:
    return [
        dest_sim(wanted_city, cities, wanted_ll, trip_points),
        overlap_frac(start, end, trip_start, trip_end),
        tag_sim(interests, trip_type),
        seats_ratio(seats, seats_needed),
        month_prox(start, trip_start),
        duration_sim(start, end, trip_start, trip_end),
    ]


def heuristic_score(vector: list[float]) -> float:
    """Original weighted sum — linear, no interactions. Used as a demo baseline."""
    dest, overlap, tag, seats = vector[0], vector[1], vector[2], vector[3]
    return 40 * dest + 30 * overlap + 20 * tag + 10 * seats

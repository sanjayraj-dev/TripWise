"""OpenStreetMap / Nominatim, Open-Meteo, and Overpass adapters."""

from __future__ import annotations

import httpx

WEATHER_LABELS = {
    0: "Clear",
    1: "Mostly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Fog",
    51: "Drizzle",
    61: "Rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Snow",
    80: "Showers",
    95: "Thunderstorm",
}

NOMINATIM_HEADERS = {"User-Agent": "TripWise/1.3 (academic travel planner)"}


def _nominatim(city: str, country: str) -> tuple[float | None, float | None]:
    try:
        res = httpx.get(
            "https://nominatim.openstreetmap.org/search",
            params={"city": city, "country": country, "format": "json", "limit": 1},
            headers=NOMINATIM_HEADERS,
            timeout=6.0,
        )
        res.raise_for_status()
        rows = res.json() or []
        if not rows:
            res = httpx.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": f"{city}, {country}", "format": "json", "limit": 1},
                headers=NOMINATIM_HEADERS,
                timeout=6.0,
            )
            res.raise_for_status()
            rows = res.json() or []
        if not rows:
            return None, None
        return float(rows[0]["lat"]), float(rows[0]["lon"])
    except Exception:
        return None, None


def _open_meteo_geocode(city: str, country: str) -> tuple[float | None, float | None]:
    try:
        res = httpx.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={"name": city, "count": 5, "language": "en"},
            timeout=6.0,
        )
        res.raise_for_status()
        results = res.json().get("results") or []
        country_l = country.lower()
        pick = next((r for r in results if country_l in str(r.get("country", "")).lower()), None) or (
            results[0] if results else None
        )
        if not pick:
            return None, None
        return float(pick["latitude"]), float(pick["longitude"])
    except Exception:
        return None, None


def geocode(city: str, country: str) -> tuple[float | None, float | None]:
    lat, lng = _nominatim(city, country)
    if lat is not None:
        return lat, lng
    return _open_meteo_geocode(city, country)


def forecast(lat: float, lng: float) -> list[dict]:
    try:
        res = httpx.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lng,
                "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
                "timezone": "auto",
                "forecast_days": 7,
            },
            timeout=8.0,
        )
        res.raise_for_status()
        daily = res.json().get("daily") or {}
        days = daily.get("time") or []
        out = []
        for i, day in enumerate(days):
            code = (daily.get("weather_code") or [0])[i]
            out.append(
                {
                    "date": day,
                    "code": code,
                    "label": WEATHER_LABELS.get(int(code), "Mixed"),
                    "t_max": (daily.get("temperature_2m_max") or [None])[i],
                    "t_min": (daily.get("temperature_2m_min") or [None])[i],
                    "precip": (daily.get("precipitation_probability_max") or [None])[i],
                }
            )
        return out
    except Exception:
        return []


def nearby_places(lat: float, lng: float, kind: str = "restaurant") -> list[dict]:
    amenity = {
        "restaurant": "restaurant",
        "cafe": "cafe",
        "hospital": "hospital",
        "atm": "atm",
        "hotel": "hotel",
        "pharmacy": "pharmacy",
        "tourism": "tourism",
    }.get(kind, "restaurant")
    if amenity == "tourism":
        query = f'[out:json][timeout:12];node["tourism"](around:900,{lat},{lng});out 12;'
    else:
        query = f'[out:json][timeout:12];node["amenity"="{amenity}"](around:900,{lat},{lng});out 12;'
    try:
        res = httpx.post("https://overpass-api.de/api/interpreter", content=query, timeout=14.0)
        res.raise_for_status()
        elements = res.json().get("elements") or []
    except Exception:
        return []
    out = []
    for el in elements[:12]:
        tags = el.get("tags") or {}
        name = tags.get("name")
        if not name:
            continue
        out.append(
            {
                "name": name,
                "kind": amenity,
                "lat": el.get("lat"),
                "lng": el.get("lon"),
                "extra": tags.get("cuisine") or tags.get("opening_hours") or "",
            }
        )
    return out

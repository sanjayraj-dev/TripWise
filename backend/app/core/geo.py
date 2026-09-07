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


def geocode(city: str, country: str) -> tuple[float | None, float | None]:
    try:
        res = httpx.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={"name": city, "count": 5, "language": "en"},
            timeout=6.0,
        )
        res.raise_for_status()
        results = res.json().get("results") or []
        country_l = country.lower()
        pick = next((r for r in results if country_l in str(r.get("country", "")).lower()), None) or (results[0] if results else None)
        if not pick:
            return None, None
        return float(pick["latitude"]), float(pick["longitude"])
    except Exception:
        return None, None


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

"""LLM itinerary adapter (SpaceXAI / xAI) with a deterministic city template fallback."""

from __future__ import annotations

import json
import re
from datetime import date, timedelta

import httpx

from app.core.config import settings

STYLES = ("balanced", "food", "culture", "chill")
CATEGORIES = ("Sightseeing", "Culture", "Food", "Nature", "Transit", "Rest")

STYLE_HINTS = {
    "balanced": "Mix sightseeing, food, culture, and a slower late afternoon. Do not overpack the day.",
    "food": "Bias toward markets, cafes, bakeries, and a proper dinner. Keep one landmark so the day still has a spine.",
    "culture": "Bias toward museums, galleries, historic quarters, and a performance or viewpoint at dusk.",
    "chill": "Slow pace: cafe, park or waterfront, one optional landmark, long meals, rest blocks. No rushed transfers.",
}

TEMPLATES: dict[str, list[tuple[str, str, str, str, str]]] = {
    "balanced": [
        ("Sunrise walk through {city}", "Sightseeing", "07:30", "09:00", "Historic center"),
        ("Neighborhood breakfast", "Food", "09:15", "10:15", "Local cafe"),
        ("Anchor museum or gallery", "Culture", "10:45", "13:00", ""),
        ("Long lunch", "Food", "13:15", "15:00", ""),
        ("Park, river, or viewpoint", "Nature", "15:30", "17:30", ""),
        ("Blue-hour lookout", "Sightseeing", "18:00", "19:00", ""),
        ("Dinner reservation", "Food", "19:30", "21:30", ""),
    ],
    "food": [
        ("Morning market wander", "Food", "08:00", "09:30", "Market"),
        ("Bakery breakfast", "Food", "09:45", "10:30", ""),
        ("One landmark before lunch", "Sightseeing", "11:00", "12:30", "Historic center"),
        ("Signature lunch", "Food", "12:45", "14:30", ""),
        ("Cafe and a slow street", "Food", "15:00", "16:30", ""),
        ("Sunset snack", "Food", "17:30", "18:30", ""),
        ("Dinner the city is known for", "Food", "19:30", "21:30", ""),
    ],
    "culture": [
        ("Old-town orientation walk", "Culture", "08:30", "10:00", "Historic center"),
        ("Coffee near the first museum", "Food", "10:15", "10:45", ""),
        ("Major museum or palace", "Culture", "11:00", "13:30", ""),
        ("Lunch in a historic quarter", "Food", "13:45", "15:00", ""),
        ("Gallery, temple, or archive", "Culture", "15:30", "17:00", ""),
        ("Golden-hour architecture walk", "Sightseeing", "17:30", "18:45", ""),
        ("Evening performance or plaza", "Culture", "19:30", "21:00", ""),
    ],
    "chill": [
        ("Slow cafe morning", "Food", "09:00", "10:30", "Neighborhood cafe"),
        ("Easy landmark, no tickets rush", "Sightseeing", "11:00", "12:30", ""),
        ("Leisurely lunch", "Food", "12:45", "14:30", ""),
        ("Park, garden, or waterfront rest", "Rest", "15:00", "17:00", ""),
        ("Golden-hour stroll", "Nature", "17:30", "18:30", ""),
        ("Unhurried dinner", "Food", "19:00", "21:00", ""),
    ],
}


def _dates(arrival: date, departure: date) -> list[date]:
    if departure < arrival:
        return [arrival]
    days: list[date] = []
    cur = arrival
    while cur <= departure:
        days.append(cur)
        cur += timedelta(days=1)
    return days


def template_draft(
    city: str,
    arrival: date,
    departure: date,
    style: str = "balanced",
) -> list[dict]:
    key = style if style in TEMPLATES else "balanced"
    slots = TEMPLATES[key]
    out: list[dict] = []
    for day in _dates(arrival, departure):
        for title, cat, start, end, loc in slots:
            out.append(
                {
                    "title": title.format(city=city)[:160],
                    "description": f"Drafted for {city}. Edit freely — this is a starting plot, not a booking.",
                    "activity_date": day.isoformat(),
                    "start_time": start,
                    "end_time": end,
                    "location": loc or city,
                    "category": cat,
                }
            )
    return out


def _extract_json(text: str) -> dict | list | None:
    raw = (text or "").strip()
    if not raw:
        return None
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
    if fence:
        raw = fence.group(1).strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(raw[start : end + 1])
            except json.JSONDecodeError:
                return None
    return None


def _normalize_item(item: dict, city: str, valid_days: set[str]) -> dict | None:
    title = str(item.get("title") or "").strip()
    if not title:
        return None
    day = str(item.get("activity_date") or item.get("date") or "").strip()
    if day not in valid_days:
        return None
    cat = str(item.get("category") or "Sightseeing").strip().title()
    if cat not in CATEGORIES:
        cat = "Sightseeing"
    start = str(item.get("start_time") or "").strip() or None
    end = str(item.get("end_time") or "").strip() or None
    if start and len(start) == 5 and end and len(end) == 5 and end <= start:
        end = None
    loc = str(item.get("location") or item.get("area") or city).strip() or city
    desc = str(item.get("description") or "").strip()
    return {
        "title": title[:160],
        "description": desc[:800],
        "activity_date": day,
        "start_time": start,
        "end_time": end,
        "location": loc[:200],
        "category": cat,
    }


def _call_llm(prompt: str) -> list[dict] | None:
    key = (settings.xai_api_key or "").strip()
    if not key:
        return None
    url = settings.xai_base_url.rstrip("/") + "/chat/completions"
    try:
        res = httpx.post(
            url,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": settings.xai_model,
                "temperature": 0.6,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You plan realistic day-wise travel itineraries. "
                            "Reply with JSON only: {\"activities\": [ ... ]}. "
                            "Each activity needs title, activity_date (YYYY-MM-DD), start_time (HH:MM), "
                            "end_time (HH:MM), category (Sightseeing|Culture|Food|Nature|Transit|Rest), "
                            "location (area or place name), and a short description. "
                            "Do not book tickets or invent exact street addresses you are unsure of."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
            },
            timeout=25.0,
        )
        res.raise_for_status()
        content = (((res.json().get("choices") or [{}])[0].get("message") or {}).get("content")) or ""
        parsed = _extract_json(content)
        if parsed is None:
            return None
        if isinstance(parsed, list):
            return [x for x in parsed if isinstance(x, dict)]
        if isinstance(parsed, dict):
            acts = parsed.get("activities") or parsed.get("items") or []
            if isinstance(acts, list):
                return [x for x in acts if isinstance(x, dict)]
        return None
    except Exception:
        return None


def draft_itinerary(
    *,
    city: str,
    country: str,
    arrival: date,
    departure: date,
    style: str = "balanced",
    trip_type: str = "leisure",
    budget_band: str = "",
    existing: list[str] | None = None,
    weather: list[dict] | None = None,
    nearby: list[str] | None = None,
) -> dict:
    style = style if style in STYLES else "balanced"
    days = _dates(arrival, departure)
    valid = {d.isoformat() for d in days}
    weather_bits = []
    for w in weather or []:
        label = w.get("label") or ""
        day = w.get("date") or ""
        if day and label:
            weather_bits.append(f"{day}: {label}")
    nearby_bits = [n for n in (nearby or []) if n][:12]
    existing = existing or []
    prompt = (
        f"City: {city}, {country}\n"
        f"Stay: {arrival.isoformat()} to {departure.isoformat()} ({len(days)} day(s))\n"
        f"Trip type: {trip_type}\n"
        f"Style: {style}. {STYLE_HINTS[style]}\n"
        f"Budget band: {budget_band or 'not specified'}\n"
        f"Weather (optional): {'; '.join(weather_bits) or 'none'}\n"
        f"Nearby place names to ground the draft: {', '.join(nearby_bits) or 'none'}\n"
        f"Existing activities to avoid duplicating: {'; '.join(existing) or 'none'}\n"
        "Plan every stay date. Keep 4–7 timed activities per day. Use the nearby names when they fit."
    )
    raw = _call_llm(prompt)
    items: list[dict] = []
    if raw:
        for row in raw:
            norm = _normalize_item(row, city, valid)
            if norm:
                items.append(norm)
    if items:
        items.sort(key=lambda a: (a["activity_date"], a["start_time"] or "99:99"))
        return {
            "source": "ai",
            "style": style,
            "message": "AI draft — nothing is saved until you accept items.",
            "activities": items,
        }
    fallback = template_draft(city, arrival, departure, style)
    return {
        "source": "template",
        "style": style,
        "message": "The AI service was unavailable or returned an invalid draft, so this is a city template. Review it before accepting.",
        "activities": fallback,
    }

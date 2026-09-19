from datetime import time as time_cls

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.access import assert_activity_timing, get_activity, load_destination, serialize_activity
from app.core.ai import STYLES, draft_itinerary
from app.core.deps import get_traveler
from app.core.geo import forecast, geocode, nearby_places
from app.db.session import get_db
from app.models.activity import Activity
from app.models.user import User
from app.schemas.common import ActivityCreate, ActivityUpdate, DraftAcceptIn, DraftGenerateIn

router = APIRouter(tags=["itinerary"])


def _budget_band(amount) -> str:
    try:
        n = float(amount or 0)
    except (TypeError, ValueError):
        return "unspecified"
    if n <= 0:
        return "unspecified"
    if n < 25000:
        return "lean"
    if n < 100000:
        return "moderate"
    return "comfortable"


def _parse_hhmm(value: str | None):
    if not value:
        return None
    parts = str(value).split(":")
    try:
        return time_cls(int(parts[0]), int(parts[1]))
    except (ValueError, IndexError):
        return None


@router.post("/api/destinations/{destination_id}/activities", status_code=201)
def add_activity(
    destination_id: int, body: ActivityCreate, db: Session = Depends(get_db), user: User = Depends(get_traveler)
):
    dest = load_destination(db, destination_id, user)
    assert_activity_timing(dest, body.activity_date, body.start_time, body.end_time)
    act = Activity(
        destination_id=dest.id,
        title=body.title.strip(),
        description=body.description or "",
        activity_date=body.activity_date,
        start_time=body.start_time,
        end_time=body.end_time,
        location=body.location or "",
        category=body.category or "Sightseeing",
    )
    db.add(act)
    db.commit()
    db.refresh(act)
    return serialize_activity(act, dest)


@router.post("/api/trips/{trip_id}/activities", status_code=201)
def add_activity_on_trip(
    trip_id: int, body: ActivityCreate, db: Session = Depends(get_db), user: User = Depends(get_traveler)
):
    if not body.destination_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Please choose a destination for this activity.")
    dest = load_destination(db, body.destination_id, user)
    if dest.trip_id != trip_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Destination does not belong to this trip.")
    return add_activity(body.destination_id, body, db, user)


@router.put("/api/activities/{activity_id}")
def update_activity(
    activity_id: int, body: ActivityUpdate, db: Session = Depends(get_db), user: User = Depends(get_traveler)
):
    act = get_activity(db, activity_id, user)
    dest = load_destination(db, act.destination_id, user)
    if body.title is not None:
        act.title = body.title.strip()
    if body.description is not None:
        act.description = body.description
    if body.activity_date is not None:
        act.activity_date = body.activity_date
    if body.start_time is not None:
        act.start_time = body.start_time
    if body.end_time is not None:
        act.end_time = body.end_time
    if body.location is not None:
        act.location = body.location
    if body.category is not None:
        act.category = body.category
    assert_activity_timing(dest, act.activity_date, act.start_time, act.end_time)
    db.commit()
    db.refresh(act)
    return serialize_activity(act, dest)


@router.delete("/api/activities/{activity_id}")
def delete_activity(activity_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    act = get_activity(db, activity_id, user)
    db.delete(act)
    db.commit()
    return {"message": "Activity deleted."}


@router.post("/api/destinations/{destination_id}/itinerary-draft")
def generate_itinerary_draft(
    destination_id: int,
    body: DraftGenerateIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_traveler),
):
    dest = load_destination(db, destination_id, user)
    style = (body.style or "balanced").lower()
    if style not in STYLES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Style must be one of: {', '.join(STYLES)}.")
    weather: list[dict] = []
    nearby: list[str] = []
    try:
        if dest.lat is None or dest.lng is None:
            lat, lng = geocode(dest.city, dest.country)
            if lat is not None:
                dest.lat, dest.lng = lat, lng
                db.commit()
                db.refresh(dest)
        if dest.lat is not None and dest.lng is not None:
            weather = forecast(dest.lat, dest.lng) or []
            nearby = [p.get("name") for p in nearby_places(dest.lat, dest.lng, "tourism")[:6] if p.get("name")]
    except Exception:
        weather, nearby = [], []
    existing = []
    try:
        existing = [f"{a.title} ({a.activity_date.isoformat()})" for a in dest.activities]
    except Exception:
        existing = []
    trip = dest.trip
    result = draft_itinerary(
        city=dest.city,
        country=dest.country,
        arrival=dest.arrival_date,
        departure=dest.departure_date,
        style=style,
        trip_type=getattr(trip, "trip_type", None) or "leisure",
        budget_band=_budget_band(getattr(trip, "estimated_budget", 0)),
        existing=existing,
        weather=weather,
        nearby=nearby,
    )
    result["destination_id"] = dest.id
    result["city"] = dest.city
    result["existing_count"] = len(existing)
    return result


@router.post("/api/destinations/{destination_id}/itinerary-draft/accept", status_code=201)
def accept_itinerary_draft(
    destination_id: int,
    body: DraftAcceptIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_traveler),
):
    dest = load_destination(db, destination_id, user)
    if not body.items:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Select at least one draft activity to accept.")
    if body.replace:
        for act in list(dest.activities):
            db.delete(act)
        db.flush()
    created = []
    for item in body.items:
        start = item.start_time
        end = item.end_time
        if isinstance(start, str):
            start = _parse_hhmm(start)
        if isinstance(end, str):
            end = _parse_hhmm(end)
        assert_activity_timing(dest, item.activity_date, start, end)
        act = Activity(
            destination_id=dest.id,
            title=item.title.strip(),
            description=item.description or "",
            activity_date=item.activity_date,
            start_time=start,
            end_time=end,
            location=item.location or "",
            category=item.category or "Sightseeing",
        )
        db.add(act)
        db.flush()
        created.append(serialize_activity(act, dest))
    db.commit()
    return {"created": created, "replaced": body.replace}

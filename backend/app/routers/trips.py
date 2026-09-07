from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.access import (
    ensure_owner_member,
    load_owned_trip,
    require_dates,
    require_owner,
    serialize_trip_card,
    serialize_trip_detail,
    trip_options,
)
from app.core.deps import get_traveler
from app.db.session import get_db
from app.models.member import TripMember
from app.models.trip import Trip
from app.models.user import User
from app.schemas.common import TripCreate, TripUpdate

router = APIRouter(prefix="/api/trips", tags=["trips"])


def _all_trips(db: Session, user: User) -> list[Trip]:
    member_ids = db.query(TripMember.trip_id).filter(TripMember.user_id == user.id)
    return (
        db.query(Trip)
        .options(*trip_options())
        .filter((Trip.user_id == user.id) | (Trip.id.in_(member_ids)))
        .order_by(Trip.start_date.desc())
        .all()
    )


@router.get("")
def list_trips(db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    return [serialize_trip_card(t, user) for t in _all_trips(db, user)]


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    cards = [serialize_trip_card(t, user) for t in _all_trips(db, user) if t.user_id == user.id or any(m.user_id == user.id and m.status == "active" for m in t.members)]
    upcoming = [c for c in cards if c["status"] in ("upcoming", "ongoing")]
    completed = [c for c in cards if c["status"] == "completed"]
    upcoming.sort(key=lambda c: c["start_date"])
    completed.sort(key=lambda c: c["end_date"], reverse=True)
    active = upcoming
    estimated = sum(c["estimated_budget"] for c in active)
    spent = sum(c["spent"] for c in active)
    today = date.today()
    week_end = today + timedelta(days=7)
    next_acts = []
    for trip in _all_trips(db, user):
        for dest in trip.destinations:
            for act in dest.activities:
                if today <= act.activity_date <= week_end:
                    next_acts.append(
                        {
                            "trip_id": trip.id,
                            "trip_title": trip.title,
                            "title": act.title,
                            "activity_date": act.activity_date.isoformat(),
                            "start_time": act.start_time.strftime("%H:%M") if act.start_time else None,
                            "city": dest.city,
                            "category": getattr(act, "category", None) or "Sightseeing",
                        }
                    )
    next_acts.sort(key=lambda a: (a["activity_date"], a["start_time"] or "99:99"))
    return {
        "upcoming": upcoming,
        "completed": completed[:6],
        "active_budget": {
            "estimated": estimated,
            "spent": spent,
            "remaining": estimated - spent,
            "trip_count": len(active),
        },
        "trip_count": len(cards),
        "week": next_acts[:12],
        "avg_readiness": round(sum(c["readiness"]["score"] for c in upcoming) / len(upcoming), 1) if upcoming else 0,
    }


@router.post("", status_code=201)
def create_trip(body: TripCreate, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    require_dates(body.start_date, body.end_date, "End date must be on or after start date.")
    trip = Trip(
        user_id=user.id,
        title=body.title.strip(),
        start_date=body.start_date,
        end_date=body.end_date,
        estimated_budget=body.estimated_budget,
        trip_type=body.trip_type or "leisure",
        currency=body.currency or "INR",
        visibility=body.visibility or "private",
        join_mode=body.join_mode or "request",
        seats=body.seats or 0,
        looking_for_ride=body.looking_for_ride or False,
        is_public=(body.visibility == "public"),
    )
    db.add(trip)
    db.flush()
    ensure_owner_member(db, trip)
    db.commit()
    return serialize_trip_detail(load_owned_trip(db, trip.id, user), user)


@router.get("/{trip_id}")
def get_trip(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    return serialize_trip_detail(load_owned_trip(db, trip_id, user), user)


@router.put("/{trip_id}")
def update_trip(trip_id: int, body: TripUpdate, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    trip = load_owned_trip(db, trip_id, user)
    if body.title is not None:
        trip.title = body.title.strip()
    if body.start_date is not None:
        trip.start_date = body.start_date
    if body.end_date is not None:
        trip.end_date = body.end_date
    if body.estimated_budget is not None:
        trip.estimated_budget = body.estimated_budget
    if body.trip_type is not None:
        trip.trip_type = body.trip_type
    if body.currency is not None:
        trip.currency = body.currency
    if body.visibility is not None:
        trip.visibility = body.visibility
        trip.is_public = body.visibility == "public"
    if body.join_mode is not None:
        trip.join_mode = body.join_mode
    if body.seats is not None:
        trip.seats = body.seats
    if body.looking_for_ride is not None:
        trip.looking_for_ride = body.looking_for_ride
    require_dates(trip.start_date, trip.end_date, "End date must be on or after start date.")
    for dest in trip.destinations:
        if dest.arrival_date < trip.start_date or dest.departure_date > trip.end_date:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Trip dates cannot exclude existing destinations.",
            )
    db.commit()
    return serialize_trip_detail(load_owned_trip(db, trip.id, user), user)


@router.delete("/{trip_id}")
def delete_trip(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    trip = load_owned_trip(db, trip_id, user)
    require_owner(trip, user)
    db.delete(trip)
    db.commit()
    return {"message": "Trip deleted."}

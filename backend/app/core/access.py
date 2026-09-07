from datetime import date, time
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.models.accommodation import Accommodation
from app.models.activity import Activity
from app.models.destination import Destination
from app.models.expense import EXPENSE_CATEGORIES, Expense
from app.models.member import TripMember
from app.models.note import Note
from app.models.packing import PackingItem
from app.models.trip import Trip
from app.models.user import User


def require_dates(start: date, end: date, message: str) -> None:
    if end < start:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, message)


def trip_options():
    return (
        selectinload(Trip.destinations).selectinload(Destination.activities),
        selectinload(Trip.destinations).selectinload(Destination.expenses),
        selectinload(Trip.destinations).selectinload(Destination.accommodations),
        selectinload(Trip.notes),
        selectinload(Trip.packing_items),
        selectinload(Trip.documents),
        selectinload(Trip.members).selectinload(TripMember.user),
    )


def get_membership(db: Session, trip_id: int, user_id: int) -> TripMember | None:
    return db.query(TripMember).filter(TripMember.trip_id == trip_id, TripMember.user_id == user_id).first()


def is_active_member(db: Session, trip: Trip, user: User) -> bool:
    if trip.user_id == user.id:
        return True
    m = get_membership(db, trip.id, user.id)
    return m is not None and m.status == "active"


def ensure_owner_member(db: Session, trip: Trip) -> None:
    existing = get_membership(db, trip.id, trip.user_id)
    if existing is None:
        db.add(TripMember(trip_id=trip.id, user_id=trip.user_id, role="owner", status="active"))
        db.flush()
    else:
        existing.role = "owner"
        existing.status = "active"


def require_owner(trip: Trip, user: User) -> None:
    if trip.user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the trip owner can do that.")


def load_owned_trip(db: Session, trip_id: int, user: User) -> Trip:
    trip = db.query(Trip).options(*trip_options()).filter(Trip.id == trip_id).first()
    if trip is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found.")
    if not is_active_member(db, trip, user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have access to this trip.")
    return trip


def load_destination(db: Session, destination_id: int, user: User) -> Destination:
    dest = (
        db.query(Destination)
        .options(selectinload(Destination.trip))
        .filter(Destination.id == destination_id)
        .first()
    )
    if dest is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Destination not found.")
    if not is_active_member(db, dest.trip, user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have access to this destination.")
    return dest


def assert_within_trip(trip: Trip, start: date, end: date) -> None:
    require_dates(start, end, "End date must be on or after start date.")
    if start < trip.start_date or end > trip.end_date:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Destination dates must fall within the trip dates.",
        )


def assert_activity_timing(dest: Destination, activity_date: date, start: time | None, end: time | None) -> None:
    if activity_date < dest.arrival_date or activity_date > dest.departure_date:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Activity date must fall within the destination dates.",
        )
    if start and end and end <= start:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "End time must be after start time.")


def assert_category(category: str) -> None:
    if category not in EXPENSE_CATEGORIES:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Category must be one of: {', '.join(EXPENSE_CATEGORIES)}.",
        )


def trip_spent(trip: Trip) -> Decimal:
    total = Decimal("0")
    for dest in trip.destinations:
        for exp in dest.expenses:
            total += Decimal(exp.amount)
    return total


def trip_status(trip: Trip, today: date | None = None) -> str:
    today = today or date.today()
    if trip.end_date < today:
        return "completed"
    if trip.start_date > today:
        return "upcoming"
    return "ongoing"


def money(value: Decimal | None) -> float:
    return float(value or 0)


def serialize_activity(act: Activity, destination: Destination) -> dict:
    return {
        "id": act.id,
        "destination_id": act.destination_id,
        "city": destination.city,
        "title": act.title,
        "description": act.description or "",
        "activity_date": act.activity_date.isoformat(),
        "start_time": act.start_time.strftime("%H:%M") if act.start_time else None,
        "end_time": act.end_time.strftime("%H:%M") if act.end_time else None,
        "location": act.location or "",
        "category": getattr(act, "category", None) or "Sightseeing",
    }


def serialize_expense(exp: Expense, destination: Destination) -> dict:
    return {
        "id": exp.id,
        "destination_id": exp.destination_id,
        "city": destination.city,
        "amount": money(exp.amount),
        "category": exp.category,
        "expense_date": exp.expense_date.isoformat(),
        "description": exp.description or "",
        "paid_by_user_id": exp.paid_by_user_id,
    }


def serialize_stay(stay: Accommodation, destination: Destination) -> dict:
    return {
        "id": stay.id,
        "destination_id": stay.destination_id,
        "city": destination.city,
        "property_name": stay.property_name,
        "address": stay.address or "",
        "check_in": stay.check_in.isoformat(),
        "check_out": stay.check_out.isoformat(),
        "booking_reference": stay.booking_reference or "",
        "contact": stay.contact or "",
        "price_per_night": money(stay.price_per_night) if stay.price_per_night is not None else None,
        "notes": stay.notes or "",
    }


def serialize_destination(dest: Destination) -> dict:
    return {
        "id": dest.id,
        "trip_id": dest.trip_id,
        "sequence_no": dest.sequence_no,
        "city": dest.city,
        "country": dest.country,
        "arrival_date": dest.arrival_date.isoformat(),
        "departure_date": dest.departure_date.isoformat(),
        "lat": dest.lat,
        "lng": dest.lng,
        "notes": dest.notes or "",
        "activities": [serialize_activity(a, dest) for a in sorted(dest.activities, key=lambda x: (x.activity_date, x.start_time or time.min))],
        "expenses": [serialize_expense(e, dest) for e in dest.expenses],
        "accommodations": [serialize_stay(s, dest) for s in dest.accommodations],
    }


def serialize_member(m: TripMember) -> dict:
    u = m.user
    return {
        "id": m.id,
        "user_id": m.user_id,
        "role": m.role,
        "status": m.status,
        "full_name": u.full_name if u else "",
        "email": u.email if u else "",
        "home_city": getattr(u, "home_city", "") if u else "",
        "travel_style": getattr(u, "travel_style", "") if u else "",
    }


def serialize_trip_card(trip: Trip, user: User | None = None) -> dict:
    spent = trip_spent(trip)
    budget = Decimal(trip.estimated_budget or 0)
    cities = [d.city for d in sorted(trip.destinations, key=lambda d: (d.arrival_date, d.sequence_no))]
    active = [m for m in getattr(trip, "members", []) if m.status == "active"]
    card = {
        "id": trip.id,
        "title": trip.title,
        "start_date": trip.start_date.isoformat(),
        "end_date": trip.end_date.isoformat(),
        "estimated_budget": money(budget),
        "spent": money(spent),
        "remaining": money(budget - spent),
        "status": trip_status(trip),
        "cities": cities,
        "destination_count": len(trip.destinations),
        "trip_type": getattr(trip, "trip_type", None) or "leisure",
        "currency": getattr(trip, "currency", None) or "INR",
        "is_public": bool(getattr(trip, "is_public", False)) or getattr(trip, "visibility", "") == "public",
        "share_token": getattr(trip, "share_token", None),
        "visibility": getattr(trip, "visibility", None) or ("public" if trip.is_public else "private"),
        "join_mode": getattr(trip, "join_mode", None) or "request",
        "seats": getattr(trip, "seats", 0) or 0,
        "looking_for_ride": bool(getattr(trip, "looking_for_ride", False)),
        "member_count": len(active) or 1,
        "readiness": readiness(trip),
        "my_role": None,
        "my_status": None,
    }
    if user:
        if trip.user_id == user.id:
            card["my_role"] = "owner"
            card["my_status"] = "active"
        else:
            mine = next((m for m in getattr(trip, "members", []) if m.user_id == user.id), None)
            card["my_role"] = mine.role if mine else None
            card["my_status"] = mine.status if mine else None
    return card


def serialize_trip_detail(trip: Trip, user: User | None = None) -> dict:
    card = serialize_trip_card(trip, user)
    destinations = [serialize_destination(d) for d in sorted(trip.destinations, key=lambda d: (d.arrival_date, d.sequence_no))]
    activities = []
    expenses = []
    stays = []
    for dest in destinations:
        activities.extend(dest["activities"])
        expenses.extend(dest["expenses"])
        stays.extend(dest["accommodations"])
    activities.sort(key=lambda a: (a["activity_date"], a["start_time"] or "99:99"))
    notes = [
        {
            "id": n.id,
            "title": n.title,
            "content": n.content or "",
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in sorted(trip.notes, key=lambda n: n.id, reverse=True)
    ]
    packing = [
        {
            "id": p.id,
            "item_name": p.item_name,
            "category": p.category,
            "is_packed": p.is_packed,
        }
        for p in sorted(trip.packing_items, key=lambda p: (p.category, p.id))
    ]
    packed = sum(1 for p in packing if p["is_packed"])
    documents = [
        {
            "id": d.id,
            "title": d.title,
            "kind": d.kind,
            "reference": d.reference or "",
            "expiry_date": d.expiry_date.isoformat() if d.expiry_date else None,
            "notes": d.notes or "",
        }
        for d in getattr(trip, "documents", [])
    ]
    card.update(
        {
            "destinations": destinations,
            "activities": activities,
            "expenses": expenses,
            "accommodations": stays,
            "notes": notes,
            "packing": packing,
            "documents": documents,
            "packing_progress": {
                "packed": packed,
                "total": len(packing),
            },
            "members": [serialize_member(m) for m in getattr(trip, "members", [])],
            "owner_id": trip.user_id,
        }
    )
    return card


def readiness(trip: Trip) -> dict:
    checks = {
        "route": bool(trip.destinations),
        "itinerary": any(getattr(d, "activities", None) for d in trip.destinations),
        "stay": any(getattr(d, "accommodations", None) for d in trip.destinations),
        "budget": float(trip.estimated_budget or 0) > 0,
        "packing": bool(trip.packing_items),
        "notes": bool(trip.notes),
        "documents": bool(getattr(trip, "documents", [])),
    }
    filled = sum(1 for v in checks.values() if v)
    return {"score": round(100 * filled / len(checks)), "filled": filled, "total": len(checks), "checks": checks}


def get_note(db: Session, note_id: int, user: User) -> Note:
    note = db.get(Note, note_id)
    if note is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Note not found.")
    load_owned_trip(db, note.trip_id, user)
    return note


def get_packing(db: Session, item_id: int, user: User) -> PackingItem:
    item = db.get(PackingItem, item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Packing item not found.")
    load_owned_trip(db, item.trip_id, user)
    return item


def get_activity(db: Session, activity_id: int, user: User) -> Activity:
    act = db.get(Activity, activity_id)
    if act is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Activity not found.")
    load_destination(db, act.destination_id, user)
    return act


def get_expense(db: Session, expense_id: int, user: User) -> Expense:
    exp = db.get(Expense, expense_id)
    if exp is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Expense not found.")
    load_destination(db, exp.destination_id, user)
    return exp


def get_stay(db: Session, stay_id: int, user: User) -> Accommodation:
    stay = db.get(Accommodation, stay_id)
    if stay is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Accommodation not found.")
    load_destination(db, stay.destination_id, user)
    return stay

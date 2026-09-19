import secrets
from collections import defaultdict
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.core.access import ensure_owner_member, load_destination, load_owned_trip, serialize_trip_detail
from app.core.ai import draft_itinerary
from app.core.deps import get_traveler
from app.core.geo import forecast
from app.db.session import get_db
from app.models.accommodation import Accommodation
from app.models.activity import Activity
from app.models.destination import Destination
from app.models.document import TravelDocument
from app.models.expense import Expense
from app.models.note import Note
from app.models.packing import PackingItem
from app.models.trip import Trip
from app.models.user import User
from app.schemas.common import DocumentCreate, DocumentUpdate

router = APIRouter(tags=["extras"])

@router.post("/api/trips/{trip_id}/share")
def share_trip(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    trip = load_owned_trip(db, trip_id, user)
    if not trip.share_token:
        trip.share_token = secrets.token_urlsafe(8)
    trip.is_public = True
    db.commit()
    return {"share_token": trip.share_token, "url": f"/p/{trip.share_token}"}


@router.post("/api/trips/{trip_id}/unshare")
def unshare_trip(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    trip = load_owned_trip(db, trip_id, user)
    trip.is_public = False
    db.commit()
    return {"message": "Link disabled."}


@router.get("/api/public/{token}")
def public_trip(token: str, db: Session = Depends(get_db)):
    trip = (
        db.query(Trip)
        .options(
            selectinload(Trip.destinations).selectinload(Destination.activities),
            selectinload(Trip.destinations).selectinload(Destination.expenses),
            selectinload(Trip.destinations).selectinload(Destination.accommodations),
            selectinload(Trip.notes),
            selectinload(Trip.packing_items),
            selectinload(Trip.documents),
        )
        .filter(Trip.share_token == token, Trip.is_public.is_(True))
        .first()
    )
    if trip is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This itinerary is not public.")
    data = serialize_trip_detail(trip)
    data.pop("share_token", None)
    return data


@router.post("/api/trips/{trip_id}/duplicate", status_code=201)
def duplicate_trip(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    src = load_owned_trip(db, trip_id, user)
    copy = Trip(
        user_id=user.id,
        title=f"{src.title} (copy)",
        start_date=src.start_date,
        end_date=src.end_date,
        estimated_budget=src.estimated_budget,
        trip_type=src.trip_type,
        currency=src.currency,
    )
    db.add(copy)
    db.flush()
    for dest in src.destinations:
        nd = Destination(
            trip_id=copy.id,
            sequence_no=dest.sequence_no,
            city=dest.city,
            country=dest.country,
            arrival_date=dest.arrival_date,
            departure_date=dest.departure_date,
            lat=dest.lat,
            lng=dest.lng,
            notes=dest.notes,
        )
        db.add(nd)
        db.flush()
        for a in dest.activities:
            db.add(Activity(
                destination_id=nd.id, title=a.title, description=a.description,
                activity_date=a.activity_date, start_time=a.start_time, end_time=a.end_time,
                location=a.location, category=getattr(a, "category", "Sightseeing"),
            ))
        for e in dest.expenses:
            db.add(Expense(
                destination_id=nd.id, amount=e.amount, category=e.category,
                expense_date=e.expense_date, description=e.description,
            ))
        for s in dest.accommodations:
            db.add(Accommodation(
                destination_id=nd.id, property_name=s.property_name, address=s.address,
                check_in=s.check_in, check_out=s.check_out, booking_reference=s.booking_reference,
                contact=s.contact, price_per_night=s.price_per_night, notes=s.notes,
            ))
    for n in src.notes:
        db.add(Note(trip_id=copy.id, title=n.title, content=n.content))
    for p in src.packing_items:
        db.add(PackingItem(trip_id=copy.id, item_name=p.item_name, category=p.category, is_packed=False))
    db.flush()
    ensure_owner_member(db, copy)
    db.commit()
    return serialize_trip_detail(load_owned_trip(db, copy.id, user), user)


@router.get("/api/insights")
def insights(db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    trips = (
        db.query(Trip)
        .options(
            selectinload(Trip.destinations).selectinload(Destination.expenses),
            selectinload(Trip.destinations).selectinload(Destination.activities),
            selectinload(Trip.destinations).selectinload(Destination.accommodations),
            selectinload(Trip.notes),
            selectinload(Trip.packing_items),
            selectinload(Trip.documents),
        )
        .filter(Trip.user_id == user.id)
        .all()
    )
    by_cat: dict[str, float] = defaultdict(float)
    by_month: dict[str, float] = defaultdict(float)
    cities: dict[str, int] = defaultdict(int)
    spent = Decimal("0")
    budget = Decimal("0")
    nights = 0
    acts = 0
    for t in trips:
        budget += Decimal(t.estimated_budget or 0)
        nights += (t.end_date - t.start_date).days + 1
        for d in t.destinations:
            cities[f"{d.city}, {d.country}"] += 1
            acts += len(d.activities)
            for e in d.expenses:
                spent += Decimal(e.amount)
                by_cat[e.category] += float(e.amount)
                key = e.expense_date.strftime("%Y-%m")
                by_month[key] += float(e.amount)
    top_cities = sorted(cities.items(), key=lambda x: -x[1])[:8]
    return {
        "trip_count": len(trips),
        "nights": nights,
        "activities": acts,
        "cities": len(cities),
        "spent": float(spent),
        "budgeted": float(budget),
        "by_category": [{"name": k, "value": v} for k, v in sorted(by_cat.items(), key=lambda x: -x[1])],
        "by_month": [{"month": k, "value": v} for k, v in sorted(by_month.items())],
        "top_cities": [{"label": k, "trips": v} for k, v in top_cities],
    }


@router.get("/api/calendar")
def calendar(db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    trips = (
        db.query(Trip)
        .options(selectinload(Trip.destinations).selectinload(Destination.activities))
        .filter(Trip.user_id == user.id)
        .all()
    )
    events = []
    for t in trips:
        events.append({
            "id": f"trip-{t.id}",
            "kind": "trip",
            "trip_id": t.id,
            "title": t.title,
            "date": t.start_date.isoformat(),
            "end": t.end_date.isoformat(),
            "city": t.destinations[0].city if t.destinations else "",
        })
        for d in t.destinations:
            for a in d.activities:
                events.append({
                    "id": f"act-{a.id}",
                    "kind": "activity",
                    "trip_id": t.id,
                    "title": a.title,
                    "date": a.activity_date.isoformat(),
                    "start_time": a.start_time.strftime("%H:%M") if a.start_time else None,
                    "city": d.city,
                    "category": getattr(a, "category", None) or "Sightseeing",
                })
    events.sort(key=lambda e: (e["date"], e.get("start_time") or ""))
    return events


@router.get("/api/destinations/{destination_id}/weather")
def dest_weather(destination_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    dest = load_destination(db, destination_id, user)
    if dest.lat is None or dest.lng is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This stop has no map coordinates yet.")
    days = forecast(dest.lat, dest.lng)
    return {"city": dest.city, "lat": dest.lat, "lng": dest.lng, "days": days}


@router.post("/api/trips/{trip_id}/suggest-day")
def suggest_day(trip_id: int, body: dict, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    """Preview-only helper. Prefer POST /api/destinations/{id}/itinerary-draft."""
    trip = load_owned_trip(db, trip_id, user)
    dest_id = body.get("destination_id") or (trip.destinations[0].id if trip.destinations else None)
    if not dest_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Pick a destination.")
    dest = load_destination(db, int(dest_id), user)
    style = str(body.get("style") or "balanced")
    result = draft_itinerary(
        city=dest.city,
        country=dest.country,
        arrival=dest.arrival_date,
        departure=dest.departure_date,
        style=style,
        trip_type=getattr(trip, "trip_type", None) or "leisure",
    )
    day = body.get("date")
    ideas = result["activities"]
    if day:
        ideas = [a for a in ideas if a["activity_date"] == day]
    for idea in ideas:
        idea["destination_id"] = dest.id
    return {
        "city": dest.city,
        "date": day,
        "source": result["source"],
        "message": result["message"],
        "ideas": ideas,
    }


@router.post("/api/trips/{trip_id}/documents", status_code=201)
def add_document(trip_id: int, body: DocumentCreate, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    load_owned_trip(db, trip_id, user)
    doc = TravelDocument(
        trip_id=trip_id,
        title=body.title.strip(),
        kind=body.kind or "Other",
        reference=body.reference or "",
        expiry_date=body.expiry_date,
        notes=body.notes or "",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return {
        "id": doc.id, "title": doc.title, "kind": doc.kind, "reference": doc.reference or "",
        "expiry_date": doc.expiry_date.isoformat() if doc.expiry_date else None, "notes": doc.notes or "",
    }


@router.put("/api/documents/{doc_id}")
def update_document(doc_id: int, body: DocumentUpdate, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    doc = db.get(TravelDocument, doc_id)
    if doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found.")
    load_owned_trip(db, doc.trip_id, user)
    doc.title = body.title.strip()
    doc.kind = body.kind
    doc.reference = body.reference or ""
    doc.expiry_date = body.expiry_date
    doc.notes = body.notes or ""
    db.commit()
    db.refresh(doc)
    return {
        "id": doc.id, "title": doc.title, "kind": doc.kind, "reference": doc.reference or "",
        "expiry_date": doc.expiry_date.isoformat() if doc.expiry_date else None, "notes": doc.notes or "",
    }


@router.delete("/api/documents/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    doc = db.get(TravelDocument, doc_id)
    if doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found.")
    load_owned_trip(db, doc.trip_id, user)
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted."}

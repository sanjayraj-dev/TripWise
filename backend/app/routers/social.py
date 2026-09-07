from collections import defaultdict
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.core.access import (
    get_membership,
    load_destination,
    load_owned_trip,
    require_owner,
    serialize_member,
    serialize_trip_card,
    trip_options,
)
from app.core.deps import get_traveler
from app.core.geo import forecast
from app.db.session import get_db
from app.models.member import TripMember
from app.models.message import ChatMessage
from app.models.presence import EmergencyContact, LocationPing
from app.models.trip import Trip
from app.models.user import User

router = APIRouter(tags=["social"])


@router.get("/api/discover")
def discover(
    city: str = "",
    db: Session = Depends(get_db),
    user: User = Depends(get_traveler),
):
    q = (
        db.query(Trip)
        .options(*trip_options())
        .filter(Trip.visibility == "public")
        .filter(Trip.user_id != user.id)
    )
    trips = q.order_by(Trip.start_date.asc()).all()
    city_l = city.strip().lower()
    out = []
    for t in trips:
        mine = get_membership(db, t.id, user.id)
        if mine and mine.status == "active":
            continue
        cities = [d.city for d in t.destinations]
        blob = " ".join(cities).lower() + " " + t.title.lower()
        if city_l and city_l not in blob:
            continue
        card = serialize_trip_card(t, user)
        card["overlap"] = True
        out.append(card)
    return out


@router.post("/api/trips/{trip_id}/join")
def join_trip(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    trip = db.query(Trip).options(*trip_options()).filter(Trip.id == trip_id).first()
    if trip is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found.")
    if trip.visibility != "public" and not trip.is_public:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This group is not open.")
    existing = get_membership(db, trip.id, user.id)
    if existing and existing.status == "active":
        return {"message": "Already a member.", "status": "active"}
    mode = trip.join_mode or "request"
    st = "active" if mode == "open" else "pending"
    if existing:
        existing.status = st
        existing.role = "member"
    else:
        db.add(TripMember(trip_id=trip.id, user_id=user.id, role="member", status=st))
    db.commit()
    return {"message": "Joined." if st == "active" else "Request sent to the owner.", "status": st}


@router.post("/api/trips/{trip_id}/leave")
def leave_trip(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    trip = db.get(Trip, trip_id)
    if trip is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found.")
    if trip.user_id == user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The owner cannot leave. Delete or transfer the trip.")
    m = get_membership(db, trip.id, user.id)
    if m:
        db.delete(m)
        db.commit()
    return {"message": "Left the group."}


@router.get("/api/trips/{trip_id}/members")
def list_members(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    trip = load_owned_trip(db, trip_id, user)
    return [serialize_member(m) for m in trip.members]


@router.post("/api/trips/{trip_id}/members/{member_user_id}/approve")
def approve_member(
    trip_id: int, member_user_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)
):
    trip = load_owned_trip(db, trip_id, user)
    require_owner(trip, user)
    m = get_membership(db, trip.id, member_user_id)
    if m is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found.")
    m.status = "active"
    db.commit()
    return serialize_member(m)


@router.delete("/api/trips/{trip_id}/members/{member_user_id}")
def kick_member(
    trip_id: int, member_user_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)
):
    trip = load_owned_trip(db, trip_id, user)
    require_owner(trip, user)
    if member_user_id == trip.user_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot remove the owner.")
    m = get_membership(db, trip.id, member_user_id)
    if m:
        db.delete(m)
        db.commit()
    return {"message": "Removed."}


@router.get("/api/trips/{trip_id}/messages")
def list_messages(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    load_owned_trip(db, trip_id, user)
    rows = (
        db.query(ChatMessage)
        .options(selectinload(ChatMessage.user))
        .filter(ChatMessage.trip_id == trip_id)
        .order_by(ChatMessage.created_at.asc())
        .limit(200)
        .all()
    )
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "full_name": r.user.full_name if r.user else "",
            "body": r.body,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.post("/api/trips/{trip_id}/messages", status_code=201)
def post_message(trip_id: int, body: dict, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    load_owned_trip(db, trip_id, user)
    text = str(body.get("body") or "").strip()
    if not text:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Message cannot be empty.")
    msg = ChatMessage(trip_id=trip_id, user_id=user.id, body=text[:2000])
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {
        "id": msg.id,
        "user_id": user.id,
        "full_name": user.full_name,
        "body": msg.body,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }


@router.get("/api/trips/{trip_id}/settlement")
def settlement(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    trip = load_owned_trip(db, trip_id, user)
    members = [m for m in trip.members if m.status == "active"]
    if not members:
        members = [TripMember(user_id=trip.user_id, role="owner", status="active")]
    n = max(len(members), 1)
    paid: dict[int, float] = defaultdict(float)
    total = 0.0
    for dest in trip.destinations:
        for exp in dest.expenses:
            amt = float(exp.amount)
            total += amt
            payer = exp.paid_by_user_id or trip.user_id
            paid[payer] += amt
    share = total / n if n else 0
    balances = []
    names = {m.user_id: (m.user.full_name if m.user else f"User {m.user_id}") for m in trip.members}
    names[trip.user_id] = names.get(trip.user_id) or "Owner"
    for m in members:
        balances.append(
            {
                "user_id": m.user_id,
                "full_name": names.get(m.user_id, ""),
                "paid": round(paid[m.user_id], 2),
                "share": round(share, 2),
                "net": round(paid[m.user_id] - share, 2),
            }
        )
    return {"total": round(total, 2), "share": round(share, 2), "balances": balances}


@router.get("/api/destinations/{destination_id}/nearby")
def nearby(destination_id: int, kind: str = "restaurant", db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    dest = load_destination(db, destination_id, user)
    if dest.lat is None or dest.lng is None:
        return []
    amenity = {
        "restaurant": "restaurant",
        "cafe": "cafe",
        "hospital": "hospital",
        "atm": "atm",
        "hotel": "hotel",
        "pharmacy": "pharmacy",
    }.get(kind, "restaurant")
    query = f'[out:json][timeout:12];node["amenity"="{amenity}"](around:900,{dest.lat},{dest.lng});out 12;'
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


@router.get("/api/trips/{trip_id}/alerts")
def trip_alerts(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    trip = load_owned_trip(db, trip_id, user)
    alerts = []
    for dest in trip.destinations:
        if dest.lat is None or dest.lng is None:
            continue
        days = {d["date"]: d for d in forecast(dest.lat, dest.lng)}
        for act in dest.activities:
            key = act.activity_date.isoformat()
            w = days.get(key)
            if not w:
                continue
            precip = w.get("precip") or 0
            if precip >= 50:
                alerts.append(
                    {
                        "kind": "weather",
                        "level": "warn",
                        "title": f"Rain likely in {dest.city}",
                        "body": f"{act.title} on {key} — {precip}% chance of precipitation ({w.get('label')}).",
                    }
                )
    pending = [m for m in trip.members if m.status == "pending"]
    if pending and trip.user_id == user.id:
        alerts.append(
            {
                "kind": "join",
                "level": "info",
                "title": f"{len(pending)} join request(s)",
                "body": "Open the Group tab to approve travelers.",
            }
        )
    return alerts


@router.post("/api/trips/{trip_id}/location")
def ping_location(trip_id: int, body: dict, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    load_owned_trip(db, trip_id, user)
    ping = LocationPing(trip_id=trip_id, user_id=user.id, lat=float(body["lat"]), lng=float(body["lng"]))
    db.add(ping)
    db.commit()
    return {"message": "Location updated."}


@router.get("/api/trips/{trip_id}/locations")
def list_locations(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    load_owned_trip(db, trip_id, user)
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=45)
    rows = (
        db.query(LocationPing)
        .options(selectinload(LocationPing.user))
        .filter(LocationPing.trip_id == trip_id)
        .order_by(LocationPing.created_at.desc())
        .all()
    )
    seen = set()
    out = []
    for r in rows:
        if r.user_id in seen:
            continue
        seen.add(r.user_id)
        ts = r.created_at
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        if ts < cutoff:
            continue
        out.append(
            {
                "user_id": r.user_id,
                "full_name": r.user.full_name if r.user else "",
                "lat": r.lat,
                "lng": r.lng,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
        )
    return out


@router.get("/api/profile/contacts")
def list_contacts(db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    rows = db.query(EmergencyContact).filter(EmergencyContact.user_id == user.id).all()
    return [{"id": r.id, "name": r.name, "phone": r.phone, "email": r.email} for r in rows]


@router.post("/api/profile/contacts", status_code=201)
def add_contact(body: dict, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    c = EmergencyContact(
        user_id=user.id,
        name=str(body.get("name") or "").strip() or "Contact",
        phone=str(body.get("phone") or ""),
        email=str(body.get("email") or ""),
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id, "name": c.name, "phone": c.phone, "email": c.email}


@router.delete("/api/profile/contacts/{contact_id}")
def delete_contact(contact_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    c = db.get(EmergencyContact, contact_id)
    if c is None or c.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Contact not found.")
    db.delete(c)
    db.commit()
    return {"message": "Removed."}


@router.post("/api/trips/{trip_id}/sos")
def sos(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    load_owned_trip(db, trip_id, user)
    contacts = db.query(EmergencyContact).filter(EmergencyContact.user_id == user.id).all()
    return {
        "message": "Dummy SOS dispatched. Wire SMS later.",
        "notified": [{"name": c.name, "channel": c.phone or c.email} for c in contacts],
        "fallback": "No contacts on file — add them in Profile." if not contacts else None,
    }


@router.get("/api/carpool")
def carpool(db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    trips = (
        db.query(Trip)
        .options(*trip_options())
        .filter(Trip.visibility == "public")
        .filter((Trip.seats > 0) | (Trip.looking_for_ride.is_(True)))
        .order_by(Trip.start_date.asc())
        .all()
    )
    return [serialize_trip_card(t, user) for t in trips if t.user_id != user.id]

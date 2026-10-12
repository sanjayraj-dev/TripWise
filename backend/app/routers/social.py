from collections import defaultdict
from datetime import datetime, timedelta, timezone

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
from app.core.geo import forecast, nearby_places
from app.ml.features import dest_sim
from app.db.session import get_db
from app.models.member import TripMember
from app.models.message import ChatMessage
from app.models.notification import Notification
from app.models.presence import EmergencyContact, LocationPing
from app.models.trip import Trip
from app.models.user import User

router = APIRouter(tags=["social"])


def _notification_href(kind: str, trip_id: int | None) -> str:
    if not trip_id:
        return "/app"
    if kind == "join_request":
        return f"/app/trips/{trip_id}?tab=Group"
    if kind == "join_declined":
        return "/app/discover"
    return f"/app/trips/{trip_id}"


def serialize_notification(n: Notification) -> dict:
    return {
        "id": n.id,
        "kind": n.kind,
        "title": n.title,
        "body": n.body,
        "trip_id": n.trip_id,
        "actor_user_id": n.actor_user_id,
        "read": n.read_at is not None,
        "created_at": n.created_at.isoformat() if n.created_at else None,
        "href": _notification_href(n.kind, n.trip_id),
    }


def notify(
    db: Session,
    *,
    user_id: int,
    kind: str,
    title: str,
    body: str,
    trip_id: int | None = None,
    actor_user_id: int | None = None,
) -> None:
    db.add(
        Notification(
            user_id=user_id,
            kind=kind,
            title=title[:200],
            body=body[:400],
            trip_id=trip_id,
            actor_user_id=actor_user_id,
        )
    )


def _mark_join_requests_read(db: Session, owner_id: int, trip_id: int, actor_user_id: int) -> None:
    now = datetime.now(timezone.utc)
    rows = (
        db.query(Notification)
        .filter(
            Notification.user_id == owner_id,
            Notification.trip_id == trip_id,
            Notification.actor_user_id == actor_user_id,
            Notification.kind == "join_request",
            Notification.read_at.is_(None),
        )
        .all()
    )
    for row in rows:
        row.read_at = now


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
        if city_l and city_l not in blob and dest_sim(city, cities) < 0.6:
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
    if (trip.visibility or "") != "public":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This group is not open.")
    if trip.user_id == user.id:
        return {"message": "You already own this trip.", "status": "active"}
    existing = get_membership(db, trip.id, user.id)
    if existing and existing.status == "active":
        return {"message": "Already a member.", "status": "active"}
    if existing and existing.status == "pending":
        return {"message": "Request already sent. Waiting for the owner.", "status": "pending"}
    if existing:
        existing.status = "pending"
        existing.role = "member"
    else:
        db.add(TripMember(trip_id=trip.id, user_id=user.id, role="member", status="pending"))
    notify(
        db,
        user_id=trip.user_id,
        actor_user_id=user.id,
        trip_id=trip.id,
        kind="join_request",
        title=f"{user.full_name} wants to join {trip.title}",
        body="Open the Group tab to approve or decline.",
    )
    db.commit()
    return {"message": "Request sent. The owner will be notified.", "status": "pending"}


@router.post("/api/trips/{trip_id}/leave")
def leave_trip(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    trip = db.get(Trip, trip_id)
    if trip is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found.")
    if trip.user_id == user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The owner cannot leave. Delete or transfer the trip.")
    m = get_membership(db, trip.id, user.id)
    if m:
        if m.status == "pending":
            _mark_join_requests_read(db, trip.user_id, trip.id, user.id)
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
    if m is None or m.status != "pending":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found.")
    m.status = "active"
    _mark_join_requests_read(db, user.id, trip.id, member_user_id)
    notify(
        db,
        user_id=member_user_id,
        actor_user_id=user.id,
        trip_id=trip.id,
        kind="join_approved",
        title=f"You're in — {trip.title}",
        body=f"{user.full_name} approved your request. The workspace is open.",
    )
    db.commit()
    db.refresh(m)
    return serialize_member(m)


@router.post("/api/trips/{trip_id}/members/{member_user_id}/decline")
def decline_member(
    trip_id: int, member_user_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)
):
    trip = load_owned_trip(db, trip_id, user)
    require_owner(trip, user)
    m = get_membership(db, trip.id, member_user_id)
    if m is None or m.status != "pending":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found.")
    m.status = "declined"
    _mark_join_requests_read(db, user.id, trip.id, member_user_id)
    notify(
        db,
        user_id=member_user_id,
        actor_user_id=user.id,
        trip_id=trip.id,
        kind="join_declined",
        title=f"Request declined — {trip.title}",
        body="The owner declined this request. You can ask again from Discover.",
    )
    db.commit()
    return {"message": "Request declined.", "status": "declined"}


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
    return nearby_places(dest.lat, dest.lng, kind)


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


@router.get("/api/notifications")
def list_notifications(db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    rows = (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(40)
        .all()
    )
    return [serialize_notification(n) for n in rows]


@router.post("/api/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)
):
    n = db.get(Notification, notification_id)
    if n is None or n.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found.")
    if n.read_at is None:
        n.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(n)
    return serialize_notification(n)


@router.post("/api/notifications/read-all")
def mark_all_notifications_read(db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    now = datetime.now(timezone.utc)
    rows = (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.read_at.is_(None))
        .all()
    )
    for row in rows:
        row.read_at = now
    db.commit()
    return {"message": "All caught up.", "count": len(rows)}


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
    out = []
    for t in trips:
        if t.user_id == user.id:
            continue
        mine = get_membership(db, t.id, user.id)
        if mine and mine.status == "active":
            continue
        out.append(serialize_trip_card(t, user))
    return out

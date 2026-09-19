from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.core.access import trip_status
from app.core.deps import get_admin
from app.db.session import get_db
from app.models.activity import Activity
from app.models.destination import Destination
from app.models.expense import Expense
from app.models.note import Note
from app.models.trip import Trip
from app.models.user import User
from app.schemas.common import StatusUpdate, UserPublic

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _trip_summary(trip: Trip) -> dict:
    cities = [d.city for d in sorted(trip.destinations, key=lambda d: (d.arrival_date, d.sequence_no))]
    return {
        "id": trip.id,
        "title": trip.title,
        "start_date": trip.start_date.isoformat(),
        "end_date": trip.end_date.isoformat(),
        "status": trip_status(trip),
        "cities": cities,
        "owner_id": trip.user_id,
        "owner_name": trip.owner.full_name if trip.owner else "",
        "owner_email": trip.owner.email if trip.owner else "",
    }


@router.get("/stats")
def stats(db: Session = Depends(get_db), _admin: User = Depends(get_admin)):
    travelers = db.query(func.count(User.id)).filter(User.role == "traveler").scalar() or 0
    active = (
        db.query(func.count(User.id)).filter(User.role == "traveler", User.status == "active").scalar() or 0
    )
    trips = db.query(Trip).options(selectinload(Trip.destinations), selectinload(Trip.owner)).all()
    today = date.today()
    upcoming = sum(1 for t in trips if t.start_date > today)
    ongoing = sum(1 for t in trips if t.start_date <= today <= t.end_date)
    completed = sum(1 for t in trips if t.end_date < today)
    dests = db.query(func.count(Destination.id)).scalar() or 0
    acts = db.query(func.count(Activity.id)).scalar() or 0
    notes = db.query(func.count(Note.id)).scalar() or 0
    expense_count = db.query(func.count(Expense.id)).scalar() or 0
    recent = sorted(
        trips,
        key=lambda t: t.created_at.isoformat() if t.created_at else t.start_date.isoformat(),
        reverse=True,
    )[:8]
    return {
        "travelers": travelers,
        "active_travelers": active,
        "deactivated_travelers": travelers - active,
        "trips": len(trips),
        "upcoming_trips": upcoming,
        "ongoing_trips": ongoing,
        "completed_trips": completed,
        "destinations": dests,
        "activities": acts,
        "notes": notes,
        "expenses": expense_count,
        "recent_trips": [_trip_summary(t) for t in recent],
    }


@router.get("/users")
def list_users(db: Session = Depends(get_db), _admin: User = Depends(get_admin)):
    users = db.query(User).filter(User.role == "traveler").order_by(User.created_at.desc()).all()
    out = []
    for u in users:
        count = db.query(func.count(Trip.id)).filter(Trip.user_id == u.id).scalar() or 0
        out.append({**UserPublic.model_validate(u).model_dump(), "trip_count": count, "created_at": u.created_at.isoformat()})
    return out


@router.get("/users/{user_id}")
def user_detail(user_id: int, db: Session = Depends(get_db), _admin: User = Depends(get_admin)):
    user = db.get(User, user_id)
    if user is None or user.role != "traveler":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Traveler not found.")
    trips = (
        db.query(Trip)
        .options(selectinload(Trip.destinations), selectinload(Trip.owner))
        .filter(Trip.user_id == user.id)
        .order_by(Trip.start_date.desc())
        .all()
    )
    payload = UserPublic.model_validate(user).model_dump()
    payload["trip_count"] = len(trips)
    payload["created_at"] = user.created_at.isoformat() if user.created_at else None
    return {"user": payload, "trips": [_trip_summary(t) for t in trips]}


@router.patch("/users/{user_id}")
def set_status(user_id: int, body: StatusUpdate, db: Session = Depends(get_db), admin: User = Depends(get_admin)):
    if body.status not in ("active", "deactivated"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Status must be active or deactivated.")
    user = db.get(User, user_id)
    if user is None or user.role != "traveler":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Traveler not found.")
    if user.id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot change your own status.")
    user.status = body.status
    db.commit()
    db.refresh(user)
    return UserPublic.model_validate(user)


@router.delete("/trips/{trip_id}")
def delete_trip(trip_id: int, db: Session = Depends(get_db), _admin: User = Depends(get_admin)):
    trip = db.get(Trip, trip_id)
    if trip is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found.")
    db.delete(trip)
    db.commit()
    return {"message": "Trip removed."}

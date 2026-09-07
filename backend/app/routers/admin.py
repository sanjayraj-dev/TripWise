from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_admin
from app.db.session import get_db
from app.models.trip import Trip
from app.models.user import User
from app.schemas.common import StatusUpdate, UserPublic

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats")
def stats(db: Session = Depends(get_db), _admin: User = Depends(get_admin)):
    travelers = db.query(func.count(User.id)).filter(User.role == "traveler").scalar() or 0
    active = (
        db.query(func.count(User.id)).filter(User.role == "traveler", User.status == "active").scalar() or 0
    )
    trips = db.query(func.count(Trip.id)).scalar() or 0
    return {
        "travelers": travelers,
        "active_travelers": active,
        "deactivated_travelers": travelers - active,
        "trips": trips,
    }


@router.get("/users")
def list_users(db: Session = Depends(get_db), _admin: User = Depends(get_admin)):
    users = db.query(User).filter(User.role == "traveler").order_by(User.created_at.desc()).all()
    out = []
    for u in users:
        count = db.query(func.count(Trip.id)).filter(Trip.user_id == u.id).scalar() or 0
        out.append({**UserPublic.model_validate(u).model_dump(), "trip_count": count, "created_at": u.created_at.isoformat()})
    return out


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

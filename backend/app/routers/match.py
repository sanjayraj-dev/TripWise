from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_traveler
from app.db.session import get_db
from app.core.access import get_membership
from app.ml.features import lookup_ll
from app.ml.match import explain, model_card, score_trip
from app.models.trip import Trip
from app.models.user import User

router = APIRouter(prefix="/api", tags=["match"])


class MatchIn(BaseModel):
    destSim: float = Field(ge=0, le=1)
    overlapFrac: float | None = Field(default=None, ge=0, le=1)
    dateOverlapDays: int | None = Field(default=None, ge=0, le=30)
    tagSim: float = Field(ge=0, le=1)
    seatsRatio: float = Field(ge=0, le=1)
    monthProx: float = Field(default=0.5, ge=0, le=1)
    durationSim: float = Field(default=0.5, ge=0, le=1)


class DesignIn(BaseModel):
    destination: str = Field(min_length=1, max_length=120)
    startDate: date
    endDate: date
    interests: list[str] = Field(default_factory=list)
    seatsNeeded: int = Field(default=1, ge=1, le=12)


@router.get("/match/model")
def match_model_card():
    return model_card()


@router.post("/match")
def match(body: MatchIn):
    if body.overlapFrac is not None:
        overlap = body.overlapFrac
        days = round(overlap * 7)
    else:
        days = body.dateOverlapDays or 0
        overlap = min(1.0, days / 7)
    vector = [body.destSim, overlap, body.tagSim, body.seatsRatio, body.monthProx, body.durationSim]
    return explain(vector, days)


@router.post("/match/design")
def design_match(body: DesignIn, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    if body.endDate < body.startDate:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "End date must be on or after start date.")
    trips = (
        db.query(Trip)
        .options(selectinload(Trip.destinations), selectinload(Trip.owner))
        .filter(Trip.visibility == "public")
        .all()
    )
    results = []
    wanted_ll = lookup_ll(body.destination)
    for t in trips:
        cities = [d.city for d in (t.destinations or [])]
        trip_points = [
            (d.lat, d.lng)
            for d in (t.destinations or [])
            if d.lat is not None and d.lng is not None
        ]
        scored = score_trip(
            body.destination,
            body.startDate,
            body.endDate,
            body.interests,
            body.seatsNeeded,
            cities,
            t.start_date,
            t.end_date,
            t.trip_type,
            t.seats or 0,
            wanted_ll,
            trip_points,
        )
        pin = next((d for d in (t.destinations or []) if d.lat is not None and d.lng is not None), None)
        mine = get_membership(db, t.id, user.id)
        results.append(
            {
                "tripId": t.id,
                "title": t.title,
                "owner": t.owner.full_name if t.owner else "",
                "isOwner": t.user_id == user.id,
                "isMember": t.user_id == user.id or (mine is not None and mine.status == "active"),
                "isPending": bool(mine is not None and mine.status == "pending"),
                "cities": cities,
                "startDate": t.start_date.isoformat(),
                "endDate": t.end_date.isoformat(),
                "tripType": t.trip_type,
                "seats": t.seats,
                "joinMode": t.join_mode,
                "lat": pin.lat if pin else None,
                "lng": pin.lng if pin else None,
                **scored,
            }
        )
    results.sort(key=lambda r: r["score"], reverse=True)
    return {"matches": results}

from datetime import date

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.ml.match import score_match
from app.models.trip import Trip

router = APIRouter(prefix="/api", tags=["match"])

REGIONS = {
    "japan": {"tokyo", "kyoto", "osaka", "fukuoka"},
    "korea": {"seoul"},
    "taiwan": {"taipei"},
    "portugal": {"lisbon", "porto", "lagos"},
    "spain": {"barcelona"},
    "india_north": {"manali", "rishikesh", "leh", "udaipur"},
    "india_south": {"panaji", "goa", "hampi", "madikeri"},
}


class MatchIn(BaseModel):
    destSim: float = Field(ge=0, le=1)
    dateOverlapDays: int = Field(ge=0, le=30)
    tagSim: float = Field(ge=0, le=1)
    seatsRatio: float = Field(ge=0, le=1)


class DesignIn(BaseModel):
    destination: str
    startDate: date
    endDate: date
    interests: list[str] = Field(default_factory=list)
    seatsNeeded: int = 1


@router.post("/match")
def match(body: MatchIn):
    return score_match(body.destSim, body.dateOverlapDays, body.tagSim, body.seatsRatio)


def _cities(trip: Trip) -> list[str]:
    return [d.city.lower() for d in (trip.destinations or [])]


def _dest_sim(wanted: str, trip: Trip) -> float:
    w = wanted.strip().lower()
    cities = _cities(trip)
    if any(w == c or w in c or c in w for c in cities):
        return 1.0
    for group in REGIONS.values():
        if w in group and any(c in group for c in cities):
            return 0.65
    return 0.15


def _overlap_days(a0: date, a1: date, b0: date, b1: date) -> int:
    start = max(a0, b0)
    end = min(a1, b1)
    return max(0, (end - start).days + 1)


def _tag_sim(wanted: list[str], trip: Trip) -> float:
    if not wanted:
        return 0.4
    style = (trip.trip_type or "").lower()
    hits = sum(1 for t in wanted if t.lower() in style or style in t.lower())
    return min(1.0, 0.3 + hits / max(1, len(wanted)))


@router.post("/match/design")
def design_match(body: DesignIn, db: Session = Depends(get_db)):
    trips = (
        db.query(Trip)
        .options(selectinload(Trip.destinations), selectinload(Trip.owner))
        .filter(Trip.visibility == "public")
        .all()
    )
    results = []
    for t in trips:
        dest = _dest_sim(body.destination, t)
        overlap = _overlap_days(body.startDate, body.endDate, t.start_date, t.end_date)
        tags = _tag_sim(body.interests, t)
        seats_ratio = 1.0 if (t.seats or 0) >= body.seatsNeeded else (t.seats or 0) / max(1, body.seatsNeeded)
        scored = score_match(dest, overlap, tags, seats_ratio)
        nearby = overlap == 0 and dest >= 0.6
        results.append({
            "tripId": t.id,
            "title": t.title,
            "owner": t.owner.full_name if t.owner else "",
            "cities": [d.city for d in t.destinations],
            "startDate": t.start_date.isoformat(),
            "endDate": t.end_date.isoformat(),
            "tripType": t.trip_type,
            "seats": t.seats,
            "score": scored["score"],
            "reason": scored["reason"],
            "bucket": "overlap" if overlap else ("nearby" if nearby else "other"),
        })
    results.sort(key=lambda r: r["score"], reverse=True)
    return {"matches": results}
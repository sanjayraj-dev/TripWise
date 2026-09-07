from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.access import assert_within_trip, load_destination, load_owned_trip, serialize_destination
from app.core.geo import geocode
from app.core.deps import get_traveler
from app.db.session import get_db
from app.models.destination import Destination
from app.models.user import User
from app.schemas.common import DestinationCreate, DestinationUpdate

router = APIRouter(tags=["destinations"])


@router.get("/api/trips/{trip_id}/destinations")
def list_destinations(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    trip = load_owned_trip(db, trip_id, user)
    dests = sorted(trip.destinations, key=lambda d: (d.arrival_date, d.sequence_no))
    return [serialize_destination(d) for d in dests]


@router.post("/api/trips/{trip_id}/destinations", status_code=201)
def add_destination(
    trip_id: int, body: DestinationCreate, db: Session = Depends(get_db), user: User = Depends(get_traveler)
):
    trip = load_owned_trip(db, trip_id, user)
    assert_within_trip(trip, body.arrival_date, body.departure_date)
    seq = (max((d.sequence_no for d in trip.destinations), default=0) + 1)
    lat, lng = geocode(body.city.strip(), body.country.strip())
    dest = Destination(
        trip_id=trip.id,
        sequence_no=seq,
        city=body.city.strip(),
        country=body.country.strip(),
        arrival_date=body.arrival_date,
        departure_date=body.departure_date,
        notes=body.notes or "",
        lat=lat,
        lng=lng,
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)
    return serialize_destination(load_destination(db, dest.id, user))


@router.put("/api/destinations/{destination_id}")
def update_destination(
    destination_id: int,
    body: DestinationUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_traveler),
):
    dest = load_destination(db, destination_id, user)
    trip = dest.trip
    assert_within_trip(trip, body.arrival_date, body.departure_date)
    dest.city = body.city.strip()
    dest.country = body.country.strip()
    dest.arrival_date = body.arrival_date
    dest.departure_date = body.departure_date
    dest.notes = body.notes or ""
    lat, lng = geocode(dest.city, dest.country)
    if lat is not None:
        dest.lat, dest.lng = lat, lng
    db.commit()
    return serialize_destination(load_destination(db, dest.id, user))


@router.delete("/api/destinations/{destination_id}")
def delete_destination(destination_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    dest = load_destination(db, destination_id, user)
    db.delete(dest)
    db.commit()
    return {"message": "Destination deleted."}

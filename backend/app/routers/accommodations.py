from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.access import get_stay, load_destination, require_dates, serialize_stay
from app.core.deps import get_traveler
from app.db.session import get_db
from app.models.accommodation import Accommodation
from app.models.user import User
from app.schemas.common import AccommodationCreate, AccommodationUpdate

router = APIRouter(tags=["accommodations"])


def _validate_stay(dest, check_in, check_out):
    require_dates(check_in, check_out, "Check-out must be on or after check-in.")
    if check_in < dest.arrival_date or check_out > dest.departure_date:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Stay dates must fall within the destination dates.",
        )


@router.post("/api/destinations/{destination_id}/accommodations", status_code=201)
def add_stay(
    destination_id: int,
    body: AccommodationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_traveler),
):
    dest = load_destination(db, destination_id, user)
    _validate_stay(dest, body.check_in, body.check_out)
    stay = Accommodation(
        destination_id=dest.id,
        property_name=body.property_name.strip(),
        address=body.address or "",
        check_in=body.check_in,
        check_out=body.check_out,
        booking_reference=body.booking_reference or "",
        contact=body.contact or "",
        price_per_night=body.price_per_night,
        notes=body.notes or "",
    )
    db.add(stay)
    db.commit()
    db.refresh(stay)
    return serialize_stay(stay, dest)


@router.post("/api/trips/{trip_id}/accommodations", status_code=201)
def add_stay_on_trip(
    trip_id: int, body: AccommodationCreate, db: Session = Depends(get_db), user: User = Depends(get_traveler)
):
    if not body.destination_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Please choose a destination for this stay.")
    dest = load_destination(db, body.destination_id, user)
    if dest.trip_id != trip_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Destination does not belong to this trip.")
    return add_stay(body.destination_id, body, db, user)


@router.put("/api/accommodations/{stay_id}")
def update_stay(
    stay_id: int, body: AccommodationUpdate, db: Session = Depends(get_db), user: User = Depends(get_traveler)
):
    stay = get_stay(db, stay_id, user)
    dest = load_destination(db, stay.destination_id, user)
    if body.property_name is not None:
        stay.property_name = body.property_name.strip()
    if body.address is not None:
        stay.address = body.address
    if body.check_in is not None:
        stay.check_in = body.check_in
    if body.check_out is not None:
        stay.check_out = body.check_out
    if body.booking_reference is not None:
        stay.booking_reference = body.booking_reference
    if body.contact is not None:
        stay.contact = body.contact
    if body.price_per_night is not None:
        stay.price_per_night = body.price_per_night
    if body.notes is not None:
        stay.notes = body.notes
    _validate_stay(dest, stay.check_in, stay.check_out)
    db.commit()
    db.refresh(stay)
    return serialize_stay(stay, dest)


@router.delete("/api/accommodations/{stay_id}")
def delete_stay(stay_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    stay = get_stay(db, stay_id, user)
    db.delete(stay)
    db.commit()
    return {"message": "Accommodation deleted."}

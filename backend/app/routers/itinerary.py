from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.access import assert_activity_timing, get_activity, load_destination, serialize_activity
from app.core.deps import get_traveler
from app.db.session import get_db
from app.models.activity import Activity
from app.models.user import User
from app.schemas.common import ActivityCreate, ActivityUpdate

router = APIRouter(tags=["itinerary"])


@router.post("/api/destinations/{destination_id}/activities", status_code=201)
def add_activity(
    destination_id: int, body: ActivityCreate, db: Session = Depends(get_db), user: User = Depends(get_traveler)
):
    dest = load_destination(db, destination_id, user)
    assert_activity_timing(dest, body.activity_date, body.start_time, body.end_time)
    act = Activity(
        destination_id=dest.id,
        title=body.title.strip(),
        description=body.description or "",
        activity_date=body.activity_date,
        start_time=body.start_time,
        end_time=body.end_time,
        location=body.location or "",
        category=body.category or "Sightseeing",
    )
    db.add(act)
    db.commit()
    db.refresh(act)
    return serialize_activity(act, dest)


@router.post("/api/trips/{trip_id}/activities", status_code=201)
def add_activity_on_trip(
    trip_id: int, body: ActivityCreate, db: Session = Depends(get_db), user: User = Depends(get_traveler)
):
    if not body.destination_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Please choose a destination for this activity.")
    dest = load_destination(db, body.destination_id, user)
    if dest.trip_id != trip_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Destination does not belong to this trip.")
    return add_activity(body.destination_id, body, db, user)


@router.put("/api/activities/{activity_id}")
def update_activity(
    activity_id: int, body: ActivityUpdate, db: Session = Depends(get_db), user: User = Depends(get_traveler)
):
    act = get_activity(db, activity_id, user)
    dest = load_destination(db, act.destination_id, user)
    if body.title is not None:
        act.title = body.title.strip()
    if body.description is not None:
        act.description = body.description
    if body.activity_date is not None:
        act.activity_date = body.activity_date
    if body.start_time is not None:
        act.start_time = body.start_time
    if body.end_time is not None:
        act.end_time = body.end_time
    if body.location is not None:
        act.location = body.location
    if body.category is not None:
        act.category = body.category
    assert_activity_timing(dest, act.activity_date, act.start_time, act.end_time)
    db.commit()
    db.refresh(act)
    return serialize_activity(act, dest)


@router.delete("/api/activities/{activity_id}")
def delete_activity(activity_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    act = get_activity(db, activity_id, user)
    db.delete(act)
    db.commit()
    return {"message": "Activity deleted."}

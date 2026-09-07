from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.access import get_note, get_packing, load_owned_trip
from app.core.deps import get_traveler
from app.db.session import get_db
from app.models.note import Note
from app.models.packing import PackingItem
from app.models.user import User
from app.schemas.common import NoteCreate, NoteUpdate, PackingCreate, PackingUpdate

router = APIRouter(tags=["notes-packing"])


@router.post("/api/trips/{trip_id}/notes", status_code=201)
def add_note(trip_id: int, body: NoteCreate, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    load_owned_trip(db, trip_id, user)
    note = Note(trip_id=trip_id, title=body.title.strip(), content=body.content or "")
    db.add(note)
    db.commit()
    db.refresh(note)
    return {"id": note.id, "title": note.title, "content": note.content or "", "created_at": note.created_at.isoformat()}


@router.put("/api/notes/{note_id}")
def update_note(note_id: int, body: NoteUpdate, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    note = get_note(db, note_id, user)
    note.title = body.title.strip()
    note.content = body.content or ""
    db.commit()
    db.refresh(note)
    return {"id": note.id, "title": note.title, "content": note.content or "", "created_at": note.created_at.isoformat()}


@router.delete("/api/notes/{note_id}")
def delete_note(note_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    note = get_note(db, note_id, user)
    db.delete(note)
    db.commit()
    return {"message": "Note deleted."}


@router.post("/api/trips/{trip_id}/packing", status_code=201)
def add_packing(trip_id: int, body: PackingCreate, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    load_owned_trip(db, trip_id, user)
    item = PackingItem(
        trip_id=trip_id,
        item_name=body.item_name.strip(),
        category=body.category or "Other",
        is_packed=False,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id, "item_name": item.item_name, "category": item.category, "is_packed": item.is_packed}


@router.put("/api/packing/{item_id}")
def update_packing(item_id: int, body: PackingUpdate, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    item = get_packing(db, item_id, user)
    if body.item_name is not None:
        item.item_name = body.item_name.strip()
    if body.category is not None:
        item.category = body.category
    if body.is_packed is not None:
        item.is_packed = body.is_packed
    db.commit()
    db.refresh(item)
    return {"id": item.id, "item_name": item.item_name, "category": item.category, "is_packed": item.is_packed}


@router.delete("/api/packing/{item_id}")
def delete_packing(item_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    item = get_packing(db, item_id, user)
    db.delete(item)
    db.commit()
    return {"message": "Packing item deleted."}

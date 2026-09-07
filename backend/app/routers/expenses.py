from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.access import assert_category, get_expense, load_destination, serialize_expense
from app.core.deps import get_traveler
from app.db.session import get_db
from app.models.expense import Expense
from app.models.user import User
from app.schemas.common import ExpenseCreate, ExpenseUpdate

router = APIRouter(tags=["expenses"])


@router.post("/api/destinations/{destination_id}/expenses", status_code=201)
def add_expense(
    destination_id: int, body: ExpenseCreate, db: Session = Depends(get_db), user: User = Depends(get_traveler)
):
    dest = load_destination(db, destination_id, user)
    assert_category(body.category)
    exp = Expense(
        destination_id=dest.id,
        amount=body.amount,
        category=body.category,
        expense_date=body.expense_date,
        description=body.description or "",
        paid_by_user_id=body.paid_by_user_id or user.id,
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return serialize_expense(exp, dest)


@router.post("/api/trips/{trip_id}/expenses", status_code=201)
def add_expense_on_trip(
    trip_id: int, body: ExpenseCreate, db: Session = Depends(get_db), user: User = Depends(get_traveler)
):
    if not body.destination_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Please choose a destination for this expense.")
    dest = load_destination(db, body.destination_id, user)
    if dest.trip_id != trip_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Destination does not belong to this trip.")
    return add_expense(body.destination_id, body, db, user)


@router.put("/api/expenses/{expense_id}")
def update_expense(
    expense_id: int, body: ExpenseUpdate, db: Session = Depends(get_db), user: User = Depends(get_traveler)
):
    exp = get_expense(db, expense_id, user)
    dest = load_destination(db, exp.destination_id, user)
    if body.amount is not None:
        exp.amount = body.amount
    if body.category is not None:
        assert_category(body.category)
        exp.category = body.category
    if body.expense_date is not None:
        exp.expense_date = body.expense_date
    if body.description is not None:
        exp.description = body.description
    db.commit()
    db.refresh(exp)
    return serialize_expense(exp, dest)


@router.delete("/api/expenses/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db), user: User = Depends(get_traveler)):
    exp = get_expense(db, expense_id, user)
    db.delete(exp)
    db.commit()
    return {"message": "Expense deleted."}

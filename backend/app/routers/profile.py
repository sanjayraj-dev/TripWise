from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import hash_password, validate_password_policy, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import PasswordChange, ProfileUpdate, UserPublic

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("", response_model=UserPublic)
def get_profile(user: User = Depends(get_current_user)):
    return user


@router.put("", response_model=UserPublic)
def update_profile(body: ProfileUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    user.full_name = body.full_name.strip()
    user.bio = (body.bio or "").strip()
    user.home_city = (body.home_city or "").strip()
    user.travel_style = body.travel_style or "flexible"
    db.commit()
    db.refresh(user)
    return user


@router.post("/password")
def change_password(body: PasswordChange, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect.")
    validate_password_policy(body.new_password)
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"message": "Password updated."}

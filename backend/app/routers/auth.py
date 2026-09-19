from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.config import settings
from app.core.security import bump_token_version, create_access_token, hash_password, validate_password_policy, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import LoginIn, RegisterIn, TokenResponse, UserPublic

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    validate_password_policy(body.password)
    existing = db.query(User).filter(User.email == body.email.lower()).first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists.")
    user = User(
        full_name=body.full_name.strip(),
        email=body.email.lower(),
        password_hash=hash_password(body.password),
        role="traveler",
        status="active",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenResponse(
        access_token=create_access_token(user.id, user.role, user.token_version),
        user=UserPublic.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password.")
    if user.status != "active":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been deactivated.")
    return TokenResponse(
        access_token=create_access_token(user.id, user.role, user.token_version),
        user=UserPublic.model_validate(user),
    )


@router.post("/logout")
def logout(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bump_token_version(user)
    db.commit()
    return {"message": "Signed out."}


@router.get("/session")
def session_policy():
    return {
        "inactivity_timeout_minutes": settings.inactivity_timeout_minutes,
        "token_expire_minutes": settings.access_token_expire_minutes,
    }


@router.get("/me", response_model=UserPublic)
def me(user: User = Depends(get_current_user)):
    return user

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated.")
    payload = decode_token(creds.credentials)
    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found.")
    if user.status != "active":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been deactivated.")
    token_tv = int(payload.get("tv") or 0)
    if token_tv != int(getattr(user, "token_version", 0) or 0):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired. Please sign in again.")
    return user


def get_traveler(user: User = Depends(get_current_user)) -> User:
    if user.role != "traveler":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Traveler access required.")
    return user


def get_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Administrator access required.")
    return user

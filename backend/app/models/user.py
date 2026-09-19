from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="traveler", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    bio: Mapped[str] = mapped_column(String(400), default="")
    home_city: Mapped[str] = mapped_column(String(120), default="")
    travel_style: Mapped[str] = mapped_column(String(40), default="flexible")
    token_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    trips: Mapped[list["Trip"]] = relationship(back_populates="owner", cascade="all, delete-orphan")

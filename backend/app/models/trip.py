from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    estimated_budget: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    trip_type: Mapped[str] = mapped_column(String(40), default="leisure")
    currency: Mapped[str] = mapped_column(String(8), default="INR")
    share_token: Mapped[str | None] = mapped_column(String(40), unique=True, nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    visibility: Mapped[str] = mapped_column(String(20), default="private")  # private | unlisted | public
    join_mode: Mapped[str] = mapped_column(String(20), default="request")  # open | request
    seats: Mapped[int] = mapped_column(Integer, default=0)
    looking_for_ride: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    owner: Mapped["User"] = relationship(back_populates="trips")
    destinations: Mapped[list["Destination"]] = relationship(
        back_populates="trip", cascade="all, delete-orphan", order_by="Destination.arrival_date"
    )
    notes: Mapped[list["Note"]] = relationship(back_populates="trip", cascade="all, delete-orphan")
    packing_items: Mapped[list["PackingItem"]] = relationship(
        back_populates="trip", cascade="all, delete-orphan"
    )
    documents: Mapped[list["TravelDocument"]] = relationship(
        back_populates="trip", cascade="all, delete-orphan"
    )
    members: Mapped[list["TripMember"]] = relationship(
        back_populates="trip", cascade="all, delete-orphan"
    )

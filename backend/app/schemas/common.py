from datetime import date, datetime, time
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserPublic(ORMModel):
    id: int
    full_name: str
    email: EmailStr
    role: str
    status: str
    created_at: datetime
    bio: str = ""
    home_city: str = ""
    travel_style: str = "flexible"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class RegisterIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    bio: str = ""
    home_city: str = ""
    travel_style: str = "flexible"


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class TripCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    start_date: date
    end_date: date
    estimated_budget: Decimal = Field(default=0, ge=0)
    trip_type: str = "leisure"
    currency: str = "INR"
    visibility: str = "private"
    join_mode: str = "request"
    seats: int = 0
    looking_for_ride: bool = False


class TripUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    start_date: date | None = None
    end_date: date | None = None
    estimated_budget: Decimal | None = Field(default=None, ge=0)
    trip_type: str | None = None
    currency: str | None = None
    visibility: str | None = None
    join_mode: str | None = None
    seats: int | None = None
    looking_for_ride: bool | None = None


class DestinationCreate(BaseModel):
    city: str = Field(min_length=1, max_length=120)
    country: str = Field(min_length=1, max_length=120)
    arrival_date: date
    departure_date: date
    notes: str = ""


class DestinationUpdate(DestinationCreate):
    pass


class ActivityCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    description: str = ""
    activity_date: date
    start_time: time | None = None
    end_time: time | None = None
    location: str = ""
    category: str = "Sightseeing"
    destination_id: int | None = None


class ActivityUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    activity_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    location: str | None = None
    category: str | None = None


class DocumentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    kind: str = "Other"
    reference: str = ""
    expiry_date: date | None = None
    notes: str = ""


class DocumentUpdate(DocumentCreate):
    pass


class ExpenseCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    category: str
    expense_date: date
    description: str = ""
    destination_id: int | None = None
    paid_by_user_id: int | None = None


class ExpenseUpdate(BaseModel):
    amount: Decimal | None = Field(default=None, gt=0)
    category: str | None = None
    expense_date: date | None = None
    description: str | None = None


class AccommodationCreate(BaseModel):
    property_name: str = Field(min_length=1, max_length=160)
    address: str = ""
    check_in: date
    check_out: date
    booking_reference: str = ""
    contact: str = ""
    price_per_night: Decimal | None = Field(default=None, ge=0)
    notes: str = ""
    destination_id: int | None = None


class AccommodationUpdate(BaseModel):
    property_name: str | None = None
    address: str | None = None
    check_in: date | None = None
    check_out: date | None = None
    booking_reference: str | None = None
    contact: str | None = None
    price_per_night: Decimal | None = None
    notes: str | None = None


class NoteCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    content: str = ""


class NoteUpdate(NoteCreate):
    pass


class PackingCreate(BaseModel):
    item_name: str = Field(min_length=1, max_length=160)
    category: str = "Other"


class PackingUpdate(BaseModel):
    item_name: str | None = None
    category: str | None = None
    is_packed: bool | None = None


class StatusUpdate(BaseModel):
    status: str

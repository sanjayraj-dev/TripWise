from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.routers import accommodations, admin, auth, destinations, expenses, extras, itinerary, notes, profile, social, trips
from app.seed import seed_if_empty

import app.models  # noqa: F401  — register metadata


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    if not settings.skip_seed:
        db = SessionLocal()
        try:
            seed_if_empty(db)
        finally:
            db.close()
    yield


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(IntegrityError)
async def integrity_handler(_request: Request, _exc: IntegrityError):
    return JSONResponse(status_code=409, content={"detail": "That record already exists."})


app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(trips.router)
app.include_router(destinations.router)
app.include_router(itinerary.router)
app.include_router(expenses.router)
app.include_router(accommodations.router)
app.include_router(notes.router)
app.include_router(admin.router)
app.include_router(extras.router)
app.include_router(social.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "name": "TripWise"}

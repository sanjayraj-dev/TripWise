import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["SKIP_SEED"] = "true"

from app.core.config import settings  # noqa: E402

settings.database_url = "sqlite+pysqlite:///:memory:"
settings.skip_seed = True

from app.db.base import Base  # noqa: E402
from app.db.session import engine, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.user import User  # noqa: E402
from app.core.security import hash_password  # noqa: E402

TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture()
def db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db):
    def override():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def traveler(client, db):
    res = client.post(
        "/api/auth/register",
        json={"full_name": "Test Traveler", "email": "test@tripwise.dev", "password": "TripWise@123"},
    )
    assert res.status_code == 201, res.text
    return res.json()


@pytest.fixture()
def other(client, db):
    res = client.post(
        "/api/auth/register",
        json={"full_name": "Other Person", "email": "other@tripwise.dev", "password": "TripWise@123"},
    )
    assert res.status_code == 201
    return res.json()


@pytest.fixture()
def admin_user(client, db):
    admin = User(
        full_name="Admin",
        email="admin@test.dev",
        password_hash=hash_password("TripWise@123"),
        role="admin",
        status="active",
    )
    db.add(admin)
    db.commit()
    res = client.post("/api/auth/login", json={"email": "admin@test.dev", "password": "TripWise@123"})
    assert res.status_code == 200, res.text
    return res.json()


def auth_header(token_payload: dict) -> dict:
    return {"Authorization": f"Bearer {token_payload['access_token']}"}


@pytest.fixture(autouse=True)
def _offline_adapters(monkeypatch):
    monkeypatch.setattr("app.core.geo.geocode", lambda *_a, **_k: (35.0, 135.0))
    monkeypatch.setattr("app.core.geo.forecast", lambda *_a, **_k: [])
    monkeypatch.setattr("app.core.geo.nearby_places", lambda *_a, **_k: [])
    monkeypatch.setattr("app.routers.destinations.geocode", lambda *_a, **_k: (35.0, 135.0))
    monkeypatch.setattr("app.routers.itinerary.geocode", lambda *_a, **_k: (35.0, 135.0))
    monkeypatch.setattr("app.routers.itinerary.forecast", lambda *_a, **_k: [])
    monkeypatch.setattr("app.routers.itinerary.nearby_places", lambda *_a, **_k: [])

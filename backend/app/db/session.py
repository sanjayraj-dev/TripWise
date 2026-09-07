from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings


def _make_engine():
    url = settings.database_url
    if url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
        kwargs = {"connect_args": connect_args, "poolclass": StaticPool} if ":memory:" in url else {"connect_args": connect_args}
        return create_engine(url, **kwargs)

    try:
        engine = create_engine(url, pool_pre_ping=True, connect_args={"connect_timeout": 3})
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return engine
    except Exception:
        db_file = Path(__file__).resolve().parents[2] / "tripwise.db"
        sqlite_url = f"sqlite+pysqlite:///{db_file}"
        print(f"PostgreSQL is not reachable; using SQLite at {db_file}")
        return create_engine(sqlite_url, connect_args={"check_same_thread": False})


engine = _make_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

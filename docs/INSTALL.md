# TripWise installation guide

TripWise is a React frontend and a FastAPI backend. PostgreSQL is the primary database. If Docker is not running, the backend falls back to a local SQLite file so you can still demo the app.

## Requirements

- Python 3.11+
- Node.js 20+
- Docker Desktop (optional, for PostgreSQL)
- A modern browser (Chrome, Edge, Firefox, or Safari)

## 1. Database (optional)

From the repository root:

```bash
docker compose up -d
```

This starts PostgreSQL 16 on `localhost:5432` with user/password/database `tripwise`.

## 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy ..\.env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

On macOS/Linux activate with `source .venv/bin/activate` and copy the env file with `cp ../.env.example .env`.

- API docs: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/api/health

To enable AI itinerary drafts, set `XAI_API_KEY` in `.env` (SpaceXAI / xAI). Without a key, TripWise still generates a labeled city template.

## 3. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to the backend.

## 4. Tests

```bash
cd backend
pytest -q
```

## HTTPS

Production deployments should terminate TLS in front of Uvicorn (nginx, Caddy, or a cloud load balancer) so browsers talk HTTPS as required by the SRS. Local development uses HTTP on localhost.

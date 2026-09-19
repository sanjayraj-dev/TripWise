# TripWise

**Smart Travel Companion** — a web application for planning and managing personal travel in one place.

TripWise replaces scattered spreadsheets, notes, and chat threads with a single workspace: trips, destinations, day-wise itineraries, budgets, stays, notes, and packing lists. Version **1.3** adds AI-assisted itinerary drafts per stop, an interactive map of geocoded destinations, and short-range weather.

Built for the Software Engineering Laboratory (academic year 2026–2027) against [IEEE 29148](https://standards.ieee.org/ieee/29148/6061/)-style SRS v1.3.

[Features](#features) · [Architecture](#architecture) · [Quick start](#quick-start) · [Documentation](#documentation)

---

## Features

| Module | What travelers can do |
|---|---|
| **Authentication** | Register with a unique email, sign in with JWT, sign out (token invalidated), change password, idle session timeout |
| **Dashboard** | Upcoming and completed trips, active budget remaining, next week of activities |
| **Trips** | Create, edit, delete, and keep multiple trips (title, dates, estimated budget) |
| **Destinations** | Add ordered TripStops (city, country, dates); coordinates stored when geocoding succeeds |
| **Itinerary** | Day-wise activities with times, category, and location |
| **AI drafts (v1.3)** | Generate a **preview** for a stop (balanced / food / culture / chill). Accept selected items. Existing activities are not overwritten unless confirmed. If the LLM is unavailable, a labeled city template is used |
| **Map & weather (v1.3)** | OpenStreetMap of numbered stops and route; 7-day forecast for the selected geocoded stop |
| **Budget** | Categorized expenses, remaining budget, spending summary |
| **Stays** | Property, address, check-in/out, booking reference, contact — tied to a destination |
| **Notes & packing** | Trip notes and a checklist with packed / unpacked state |
| **Profile** | View and update personal details; change password with current-password verification |
| **Administration** | Traveler list, activate/deactivate accounts, usage statistics, remove inappropriate trips |

The product also includes group discovery, chat, splits, documents, and shareable itinerary links beyond the Version 1 MVP. Flight booking, hotel reservation APIs, payment gateways, and calling remain out of scope.

---

## Architecture

```text
Traveler browser
      │  HTTPS / JSON  (dev: Vite proxy → http://127.0.0.1:8000)
      ▼
React 19 + TypeScript (Vite)
      │  REST + JWT Bearer
      ▼
FastAPI + Uvicorn
      │
      ├── PostgreSQL 16  (SQLite fallback if Docker is down)
      ├── OpenStreetMap / Nominatim   geocoding + map tiles
      ├── Open-Meteo                  forecast
      └── SpaceXAI (xAI)              itinerary drafts (optional)
```

| Layer | Choice |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 4, Leaflet, TanStack Query |
| Backend | FastAPI, SQLAlchemy 2, Pydantic v2, PyJWT, bcrypt |
| Database | PostgreSQL 16 (primary), SQLite (local fallback) |
| Auth | JWT access tokens, bcrypt password hashes, token-version logout |
| AI | SpaceXAI-compatible API (`XAI_API_KEY`); deterministic template fallback |

---

## Quick start

**Requirements:** Python 3.11+, Node.js 20+, and optionally Docker Desktop for PostgreSQL.

```bash
# 1. Database (optional)
docker compose up -d

# 2. Backend
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS / Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# 3. Frontend (second terminal)
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Copy [`.env.example`](.env.example) to `backend/.env` if you need to override secrets or enable AI:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT signing key (change before any shared deploy) |
| `XAI_API_KEY` | Optional. SpaceXAI key for live itinerary generation |
| `INACTIVITY_TIMEOUT_MINUTES` | Idle sign-out (default 30) |

Without `XAI_API_KEY`, **Generate itinerary** still works: the API returns a labeled city template and does not persist activities until the traveler accepts them.

Full install notes: [docs/INSTALL.md](docs/INSTALL.md).

---

## Demo accounts

Seeded on first backend start (Kyoto Autumn, Lisbon Light, Goa Weekend).

| Role | Email | Password |
|---|---|---|
| Traveler (Aria) | traveler@tripwise.dev | TripWise@123 |
| Traveler (Kenji) | kenji@tripwise.dev | TripWise@123 |
| Admin | admin@tripwise.dev | TripWise@123 |

---

## API

| Resource | URL |
|---|---|
| OpenAPI | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) |
| Health | [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health) |

Itinerary drafts (SRS SF-011):

```http
POST /api/destinations/{id}/itinerary-draft
POST /api/destinations/{id}/itinerary-draft/accept
```

The generate endpoint never writes activities. Accept persists only the selected items; `replace: true` is required to overwrite an existing stop itinerary.

---

## Tests

```bash
cd backend
pytest -q
```

Coverage includes authentication, trip and budget isolation, itinerary generate/accept, notes/packing/stays, and administration.

---

## Documentation

| Document | Audience |
|---|---|
| [Installation guide](docs/INSTALL.md) | Developers setting up a local environment |
| [User manual](docs/USER_MANUAL.md) | Travelers |
| [Administrator guide](docs/ADMIN_GUIDE.md) | Platform operators |
| Software Requirements Specification v1.3 | Course deliverable (IEEE-style SRS) |

---

## Repository layout

```text
TripWise/
├── backend/          FastAPI application, models, tests
├── frontend/         React SPA
├── docs/             Install, user, and admin guides
├── docker-compose.yml
└── .env.example
```

---

## Team

Sanjay Raj K · Palvadi Adithya · Durgesh Kumar  
Department of Computer Science & Engineering — Software Engineering Laboratory

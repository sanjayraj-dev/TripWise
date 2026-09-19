# TripWise — Smart Travel Companion

### *A traveler’s notebook that actually knows the itinerary*

[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20TypeScript-61DAFB.svg?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-4169E1.svg?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![JWT](https://img.shields.io/badge/Auth-JWT%20%2B%20bcrypt-000000.svg?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![OpenStreetMap](https://img.shields.io/badge/Maps-OpenStreetMap-7EBC6F.svg?style=for-the-badge&logo=openstreetmap&logoColor=white)](https://www.openstreetmap.org/)
[![SRS v1.3](https://img.shields.io/badge/Specification-IEEE%20SRS%20v1.3-E07A5F.svg?style=for-the-badge)](#-srs-v13-alignment)

> **Software Engineering Laboratory | Academic Year 2026–2027**  
> **TripWise** is a web application that consolidates trip planning — destinations, day-wise itineraries, budgets, stays, notes, and packing — into one authenticated workspace. Version **1.3** of the IEEE-style Software Requirements Specification adds AI-assisted itinerary drafts per TripStop, an interactive map of geocoded stops, and short-range weather. The generator never writes activities until the traveler accepts them; if the LLM is unavailable, a labeled city template is used instead.

<p align="center">
  <img src="frontend/public/art/hero.jpg" alt="TripWise visual identity" width="90%">
  <br>
  <em>Paper, terracotta, and navy — a travel notebook, not a booking marketplace.</em>
</p>

---

## Table of Contents

- [Executive Overview](#-executive-overview)
- [Product Aesthetic](#-product-aesthetic)
- [System Architecture](#-system-architecture)
  - [High-Level Architecture](#high-level-architecture)
  - [Itinerary Draft Sequence](#itinerary-draft-sequence)
- [Core Modules](#-core-modules)
- [Key Features](#-key-features)
- [Data Model](#-data-model)
- [Project Directory Structure](#-project-directory-structure)
- [Step-by-Step Installation](#-step-by-step-installation)
- [Demo Accounts & Seed Data](#-demo-accounts--seed-data)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Security & Session Model](#-security--session-model)
- [SRS v1.3 Alignment](#-srs-v13-alignment)
- [Tests](#-tests)
- [Documentation](#-documentation)
- [Out of Scope](#-out-of-scope)
- [Team](#-team)

---

## Executive Overview

Travelers still assemble a trip from five disconnected surfaces:

1. **A calendar** for dates that never talks to a budget.
2. **A notes app** for visa reminders, wifi codes, and restaurant names.
3. **A spreadsheet** for spend that is updated after the fact, if at all.
4. **A maps tab** that is not tied to the day-wise script.
5. **A group chat** that becomes the system of record and then goes stale.

None of those tools own the trip. When a date shifts, the itinerary, stays, and remaining budget do not move with it.

### How TripWise solves this

TripWise is the notebook that *is* the itinerary:

- **One trip workspace** — route, days, money, stays, papers, notes, and packing live on the same record.
- **Ownership and confirmation** — travelers only see their own trips; destructive actions ask before they run.
- **AI as a draft, not a booking** — generate a preview for a TripStop (balanced / food / culture / chill), pick the items you want, then accept. Existing activities are not overwritten unless you confirm replacement.
- **Maps and weather as overlays** — Nominatim / Open-Meteo geocode stops onto OpenStreetMap; a 7-day forecast loads for the selected stop with coordinates.
- **Admin that stays out of the way** — operators see usage, deactivate accounts, and can remove a trip. They do not plan personal travel.

---

## Product Aesthetic

TripWise is designed as a paper notebook: warm stock, terracotta marks, navy type. Cover art is chosen from the trip title and cities.

| Japan & East Asia | Europe | Tropics |
|:---:|:---:|:---:|
| <img src="frontend/public/art/cover-japan.jpg" alt="Japan cover" width="100%"> | <img src="frontend/public/art/cover-europe.jpg" alt="Europe cover" width="100%"> | <img src="frontend/public/art/cover-tropics.jpg" alt="Tropics cover" width="100%"> |

| Alpine | Desert | Night city |
|:---:|:---:|:---:|
| <img src="frontend/public/art/cover-alpine.jpg" alt="Alpine cover" width="100%"> | <img src="frontend/public/art/cover-desert.jpg" alt="Desert cover" width="100%"> | <img src="frontend/public/art/cover-city.jpg" alt="City cover" width="100%"> |

| Surface | What you see |
|---|---|
| **Landing** | Product story, feature grid, SRS counts (58 functional requirements, 12 system features) |
| **Dashboard** | Greeting, next departure, remaining budget, readiness, week of activities |
| **Trip workspace** | Tabs: Overview, Group, Chat, Route, Itinerary, Budget, Stays, Papers, Notes & Pack, Later |
| **Route** | Numbered OpenStreetMap markers, polyline, click-to-highlight stop, per-stop weather |
| **Itinerary** | Day columns plus **Generate itinerary** (preview → select → accept / replace) |
| **Admin** | KPIs, recent trips, traveler detail, activate / deactivate, remove trip |

---

## System Architecture

```
+----------------------------------------------------------------------------------+
|                              TRIPWISE RUNTIME                                     |
+----------------------------------------------------------------------------------+
|  [ React 19 + Vite 6 ]   ->  Traveler & admin UI, Leaflet map, Recharts budget    |
|  [ FastAPI + Uvicorn ]   ->  REST JSON, JWT Bearer, OpenAPI at /docs              |
|  [ PostgreSQL 16 ]       ->  Primary store (SQLite file if Docker is down)        |
|  [ Nominatim / OSM ]     ->  Geocode TripStops, render tiles, nearby POIs         |
|  [ Open-Meteo ]          ->  7-day forecast for a geocoded stop                   |
|  [ SpaceXAI adapter ]    ->  Optional LLM drafts; city template if no API key     |
+----------------------------------------------------------------------------------+
```

### High-Level Architecture

```mermaid
flowchart TB
    classDef client fill:#1B2A4A,stroke:#E07A5F,stroke-width:2px,color:#F6F1E8
    classDef api fill:#121C33,stroke:#D4A373,stroke-width:2px,color:#F6F1E8
    classDef data fill:#2F4858,stroke:#6B8F71,stroke-width:2px,color:#F6F1E8
    classDef ext fill:#3D405B,stroke:#81B29A,stroke-width:2px,color:#F6F1E8

    subgraph Client [" Traveler / Admin browser "]
        UI["React SPA (Vite :5173)\nDashboard, trip workspace, admin"]
        Map["Leaflet + OSM tiles"]
    end
    class UI,Map client

    subgraph Gateway [" FastAPI (:8000) "]
        Auth["Auth + profile\nJWT, bcrypt, token version"]
        Trips["Trips, destinations, itinerary"]
        Money["Expenses, stays, notes, packing"]
        AI["Itinerary adapter\nai.py + template fallback"]
        Admin["Admin stats, users, moderation"]
    end
    class Auth,Trips,Money,AI,Admin api

    subgraph Store [" Persistence "]
        PG[("PostgreSQL 16\nor SQLite fallback")]
    end
    class PG data

    subgraph External [" External adapters "]
        Geo["Nominatim + Open-Meteo geocoding"]
        Wx["Open-Meteo forecast"]
        LLM["SpaceXAI chat completions\n(optional XAI_API_KEY)"]
        Overpass["OSM Overpass nearby places"]
    end
    class Geo,Wx,LLM,Overpass ext

    UI -->|"JSON + Bearer JWT\nVite proxy /api"| Auth
    UI --> Map
    Auth --> PG
    Trips --> PG
    Money --> PG
    Admin --> PG
    Trips --> Geo
    Trips --> Wx
    AI --> LLM
    AI --> Geo
    AI --> Wx
    AI --> Overpass
    Map -.->|"tiles"| Geo
```

### Itinerary Draft Sequence

SRS SF-011: generate is a **preview**. Persist only on accept.

```mermaid
sequenceDiagram
    autonumber
    actor T as Traveler
    participant UI as Itinerary tab
    participant API as FastAPI
    participant Geo as Nominatim / Open-Meteo
    participant LLM as SpaceXAI adapter
    participant DB as PostgreSQL

    T->>UI: Open TripStop, pick style (balanced / food / culture / chill)
    UI->>API: POST /api/destinations/{id}/itinerary-draft
    API->>DB: Load destination, trip type, existing activities
    API->>Geo: Geocode if lat/lng missing; forecast; nearby names
    API->>LLM: Draft JSON activities (or skip if no XAI_API_KEY)

    alt LLM returns valid activities
        LLM-->>API: source = ai
    else Missing key, timeout, or invalid JSON
        API->>API: City template for each stay date
        Note over API: source = template, message labeled for the traveler
    end

    API-->>UI: Preview only — nothing written
    UI->>T: Checkboxes, select all / none, Accept selected

    alt Stop already has activities
        T->>UI: Add alongside  or  Replace existing
    end

    T->>UI: Confirm
    UI->>API: POST /api/destinations/{id}/itinerary-draft/accept
    API->>DB: Insert selected rows (delete first if replace=true)
    API-->>UI: Created activities
```

---

## Core Modules

```
+-----------------------------------------------------------------------------------+
|                              TRIPWISE FEATURE SET (SRS v1.3)                      |
+---------------------------+------------------------------+------------------------+
| Module                    | Responsibility               | Key files              |
+---------------------------+------------------------------+------------------------+
| Authentication            | Register, login, logout, JWT | routers/auth.py        |
| Dashboard                 | Upcoming / completed / week  | routers/trips.py       |
| Trip management           | CRUD, dates, budget          | models/trip.py         |
| Destinations (TripStops)  | Ordered cities + geocode     | routers/destinations.py|
| Itinerary                 | Day-wise activities          | routers/itinerary.py   |
| AI itinerary drafts       | Preview + accept / replace   | core/ai.py             |
| Map & weather             | OSM markers, 7-day forecast  | core/geo.py, MapView   |
| Budget & expenses         | Categories + remaining       | routers/expenses.py    |
| Accommodations            | Stays bound to a stop        | routers/accommodations |
| Notes & packing           | Free text + checklist        | routers/notes.py       |
| Profile                   | Name, style, password        | routers/profile.py     |
| Administration            | Users, stats, remove trip    | routers/admin.py       |
+---------------------------+------------------------------+------------------------+
```

### Authentication (`SF-001`)

- Unique email, bcrypt hashes, password policy (8+ characters, upper, lower, digit, special).
- JWT includes a **token version**. Logout and password change increment it; the previous token is rejected.
- Configurable idle timeout (default 30 minutes) signs the browser out.
- Deactivated travelers cannot sign in.

### Traveler dashboard (`SF-002`)

Upcoming and in-progress trips, recently completed trips, remaining budget on active trips, and the next week of activities. Cards open the trip workspace.

### Trip, destination, itinerary (`SF-003`–`SF-005`)

A trip has a title, start/end dates, and estimated budget. Destinations must sit inside those dates and sort by arrival. Activities must sit inside the destination dates; end time must be after start time. Deletes confirm in the UI.

### AI itinerary generator (`SF-011`)

| Rule | Behaviour |
|---|---|
| Input | City, stay dates, trip type, budget band, existing titles, optional weather and nearby names, style |
| Output | `title`, `activity_date`, `start_time`, `end_time`, `category`, `location`, `description` |
| Persist | Never on generate. Accept selected only |
| Overwrite | Only if `replace: true` after an explicit confirm |
| Fallback | Labeled template when `XAI_API_KEY` is empty or the model fails |

No xAI billing account is required to demo this path.

### Map and weather (`SF-012`)

Geocoding prefers Nominatim, then Open-Meteo. Coordinates are stored on the destination. The map shows numbered markers and a connecting route. Clicking a marker highlights the stop in the list and loads that stop’s forecast. If nothing geocoded, a placeholder is shown.

### Budget, stays, notes, packing (`SF-006`–`SF-008`)

Expenses: Food, Transport, Stay, Activities, Shopping, Other. Remaining = estimated − spent. Stays carry property, address, dates, booking reference, and contact. Notes and packing belong to the trip.

### Profile and admin (`SF-009`, `SF-010`)

Travelers update name, bio, home city, and travel style, and change password after verifying the current one. Admins see traveler counts, trip status mix, destinations, activities, recent trips, a traveler’s trip list, activate/deactivate, and can delete a trip.

---

## Key Features

| Feature | Description |
|---|---|
| **Multi-trip notebook** | Keep many trips; search by title or city; filter upcoming / in progress / completed |
| **Readiness score** | Destinations, activities, stays, packing, and papers feed a simple completeness check |
| **Categorized spend** | Pie summary and remaining budget that turns when you overshoot |
| **AI day drafts** | Preview per TripStop; accept selected; template fallback is labeled in the UI |
| **Interactive route** | Numbered OSM markers, polyline, highlight, nearby POIs |
| **Weather overlay** | 7-day Open-Meteo forecast for the selected geocoded city |
| **Travel papers** | Passport / visa / ticket records with expiry (beyond the original MVP) |
| **Share link** | Public itinerary at `/p/:token` without an account |
| **Group extras** | Discover, join/request, chat, equal-share settlement, dummy SOS |
| **Admin moderation** | Usage KPIs and remove-trip for records that should not stay |

---

## Data Model

Primary entities from the SRS. Destinations (TripStops) are the spine: activities, expenses, and stays hang off a stop. Notes and packing hang off the trip.

```
  users 1──N trips 1──N destinations 1──N activities
                   │                 ├──N expenses
                   │                 └──N accommodations
                   ├──N notes
                   ├──N packing_items
                   └──N travel_documents
```

```
+------------------+       +----------------------+       +------------------+
|      users       |       |        trips         |       |   destinations   |
|------------------|       |----------------------|       |------------------|
| id PK            |       | id PK                |       | id PK            |
| full_name        |<--+   | user_id FK           |<--+   | trip_id FK       |
| email UNIQUE     |   |   | title                |   |   | sequence_no      |
| password_hash    |   |   | start_date           |   |   | city, country    |
| role             |   +---| end_date             |   +---| arrival_date     |
| status           |       | estimated_budget     |       | departure_date   |
| token_version    |       | trip_type, currency  |       | lat, lng         |
+------------------+       +----------------------+       +------------------+
                                                                   |
                    +----------------------+-----------------------+
                    |                      |                       |
                    v                      v                       v
           +----------------+     +----------------+     +-------------------+
           |   activities   |     |    expenses    |     |  accommodations   |
           |----------------|     |----------------|     |-------------------|
           | destination_id |     | destination_id |     | destination_id    |
           | title, date    |     | amount, cat.   |     | property_name     |
           | start/end time |     | expense_date   |     | check_in/out      |
           | category, loc. |     | description    |     | booking_reference |
           +----------------+     +----------------+     +-------------------+
```

---

## Project Directory Structure

```
TripWise/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── ai.py              # SpaceXAI adapter + city templates
│   │   │   ├── geo.py             # Nominatim, Open-Meteo, Overpass
│   │   │   ├── security.py        # bcrypt, JWT, password policy
│   │   │   ├── deps.py            # current user / traveler / admin
│   │   │   └── config.py
│   │   ├── models/                # SQLAlchemy entities
│   │   ├── routers/               # REST modules
│   │   ├── schemas/common.py
│   │   ├── db/session.py          # Postgres, SQLite fallback, schema patch
│   │   ├── seed.py                # Demo travelers and trips
│   │   └── main.py
│   ├── tests/                     # Auth, trips, itinerary, planner, groups
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/                 # Landing, auth, dashboard, admin, trip tabs
│   │   ├── pages/trip/            # Route, Itinerary, Budget, Stays, ...
│   │   ├── components/MapView.tsx
│   │   └── auth/AuthContext.tsx   # Token + idle timeout
│   └── public/art/                # Cover photography
├── docs/
│   ├── INSTALL.md
│   ├── USER_MANUAL.md
│   └── ADMIN_GUIDE.md
├── docker-compose.yml             # PostgreSQL 16
├── .env.example
└── README.md
```

---

## Step-by-Step Installation

### Prerequisites

- **Python 3.11+**
- **Node.js 20+**
- **Docker Desktop** (optional — PostgreSQL; the API falls back to SQLite if Docker is down)
- A browser (Chrome, Edge, Firefox, or Safari)

### 1. Clone the repository

```bash
git clone https://github.com/sanjayraj-dev/TripWise.git
cd TripWise
```

### 2. Start PostgreSQL (optional)

```bash
docker compose up -d
```

This publishes Postgres 16 on `localhost:5432` with user / password / database `tripwise`.

### 3. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
copy ..\.env.example .env          # macOS / Linux: cp ../.env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- OpenAPI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Health: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

### 4. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite serves [http://localhost:5173](http://localhost:5173) and proxies `/api` to the backend.

### 5. (Optional) Enable live AI drafts

Itinerary generation **works without a key**. To use SpaceXAI instead of the template, set `XAI_API_KEY` in `backend/.env` and restart Uvicorn. Create a key at [console.x.ai](https://console.x.ai) when you have billing enabled.

Production deployments should terminate **HTTPS** in front of Uvicorn (nginx, Caddy, or a cloud load balancer), as required by the SRS.

---

## Demo Accounts & Seed Data

Created on first backend start if the database is empty.

| Role | Email | Password |
|---|---|---|
| Traveler — Aria (owner) | traveler@tripwise.dev | TripWise@123 |
| Traveler — Kenji (crew) | kenji@tripwise.dev | TripWise@123 |
| Traveler — Meera | meera@tripwise.dev | TripWise@123 |
| Traveler — Lucas | lucas@tripwise.dev | TripWise@123 |
| Administrator | admin@tripwise.dev | TripWise@123 |

Seeded trips for Aria: **Kyoto Autumn**, **Lisbon Light**, and a completed **Goa Weekend**, including coordinates, stays, papers, and packing.

Change these passwords before any shared or production use.

---

## Environment Variables

Copy [`.env.example`](.env.example) to `backend/.env`.

| Variable | Default | Purpose |
|---|---|---|
| `SECRET_KEY` | dev placeholder | JWT signing key — change before sharing |
| `DATABASE_URL` | `postgresql+psycopg://tripwise:tripwise@localhost:5432/tripwise` | Primary database |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed browser origins |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | Absolute JWT lifetime |
| `INACTIVITY_TIMEOUT_MINUTES` | `30` | Browser idle sign-out |
| `XAI_API_KEY` | empty | Optional SpaceXAI key |
| `XAI_MODEL` | `grok-4.5` | Chat model for drafts |
| `XAI_BASE_URL` | `https://api.x.ai/v1` | OpenAI-compatible endpoint |

`.env` is gitignored. Never commit keys.

---

## API Reference

Interactive catalog: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

Authenticated routes send:

```http
Authorization: Bearer <access_token>
```

### Auth

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/auth/register` | Unique email, password policy |
| `POST` | `/api/auth/login` | Returns JWT + user |
| `POST` | `/api/auth/logout` | Increments `token_version` |
| `GET` | `/api/auth/me` | Current user |
| `GET` | `/api/auth/session` | Idle and token TTLs (public) |

**Login**

```json
{ "email": "traveler@tripwise.dev", "password": "TripWise@123" }
```

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": { "id": 1, "full_name": "Aria Sen", "email": "traveler@tripwise.dev", "role": "traveler" }
}
```

### Trips and destinations

| Method | Path |
|---|---|
| `GET` | `/api/trips` |
| `GET` | `/api/trips/dashboard` |
| `POST` | `/api/trips` |
| `GET` `PUT` `DELETE` | `/api/trips/{id}` |
| `POST` | `/api/trips/{id}/destinations` |
| `PUT` `DELETE` | `/api/destinations/{id}` |
| `GET` | `/api/destinations/{id}/weather` |

### Itinerary drafts (SF-011)

**Generate (preview only)**

```http
POST /api/destinations/{id}/itinerary-draft
{ "style": "culture" }
```

```json
{
  "source": "template",
  "style": "culture",
  "message": "The AI service was unavailable or returned an invalid draft, so this is a city template. Review it before accepting.",
  "city": "Lisbon",
  "destination_id": 4,
  "existing_count": 3,
  "activities": [
    {
      "title": "Old-town orientation walk",
      "activity_date": "2026-12-12",
      "start_time": "08:30",
      "end_time": "10:00",
      "category": "Culture",
      "location": "Historic center",
      "description": "Drafted for Lisbon. Edit freely — this is a starting plot, not a booking."
    }
  ]
}
```

**Accept selected**

```http
POST /api/destinations/{id}/itinerary-draft/accept
{
  "items": [ { "title": "Old-town orientation walk", "activity_date": "2026-12-12", "start_time": "08:30", "end_time": "10:00", "category": "Culture", "location": "Historic center" } ],
  "replace": false
}
```

### Money, stays, notes

| Method | Path |
|---|---|
| `POST` | `/api/trips/{id}/expenses` |
| `PUT` `DELETE` | `/api/expenses/{id}` |
| `POST` | `/api/trips/{id}/accommodations` |
| `PUT` `DELETE` | `/api/accommodations/{id}` |
| `POST` | `/api/trips/{id}/notes` |
| `POST` | `/api/trips/{id}/packing` |

### Admin

| Method | Path |
|---|---|
| `GET` | `/api/admin/stats` |
| `GET` | `/api/admin/users` |
| `GET` | `/api/admin/users/{id}` |
| `PATCH` | `/api/admin/users/{id}` |
| `DELETE` | `/api/admin/trips/{id}` |

---

## Security & Session Model

```
[ Email + password ]
        │
        ▼
[ bcrypt verify ] ---- invalid ----> 401 (same message for unknown email)
        │
        ▼
[ JWT: sub, role, tv, iat, exp ]
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  On every authenticated request                         │
│  1. Signature + expiry                                  │
│  2. User exists and status = active                     │
│  3. token tv == users.token_version                     │
└─────────────────────────────────────────────────────────┘
        │
   logout / password change
        │
        ▼
[ token_version += 1 ]  →  previous JWT rejected
```

| Control | Implementation |
|---|---|
| Password storage | bcrypt |
| Password policy | BR-002: length, case, digit, special character |
| Ownership | Travelers only access trips they own or have joined |
| Admin gate | `role = admin` on admin routes |
| SQL | SQLAlchemy bound parameters |
| Secrets | `.env` only; never sent to the browser |
| AI | Server-side `XAI_API_KEY`; drafts are not bookings |
| Deletes | UI confirmation for trips, stops, activities, expenses, stays, notes, packing |

---

## SRS v1.3 Alignment

| Spec item | In the product |
|---|---|
| SF-001 Authentication | Register, login, logout (token revoked), password change, bcrypt |
| SF-002 Dashboard | Upcoming, completed, budget, week |
| SF-003 Trip management | CRUD, date validation, multi-trip |
| SF-004 Destinations | Ordered TripStops, date bounds, geocoded lat/lng |
| SF-005 Itinerary | Day-wise activities with times |
| SF-006 Budget | Categories, remaining, summary chart |
| SF-007 Accommodations | Manual stays on a destination |
| SF-008 Notes & packing | Notes + packed/unpacked list |
| SF-009 Profile | View/update, change password |
| SF-010 Administration | Users, stats, deactivate, remove trip |
| SF-011 AI itinerary | Preview, accept selected, labeled template fallback, replace confirm |
| SF-012 Map & weather | Numbered OSM route, placeholder, per-stop forecast |
| NFR session idle | 30-minute browser timeout, configurable |
| NFR documentation | Install, user, and admin guides in `docs/` |

IEEE-style SRS v1.3 (last updated 19 September 2026) is the course requirements document. UML analysis models are maintained separately.

---

## Tests

```bash
cd backend
pytest -q
```

| File | What it covers |
|---|---|
| `tests/test_auth.py` | Register, duplicate email, weak password, login, logout invalidation, session policy, password change |
| `tests/test_trips.py` | Create, date rules, ownership isolation, budget remaining, admin deactivate, admin stats |
| `tests/test_itinerary.py` | Draft is preview-only, accept selected, replace, manual activity CRUD |
| `tests/test_planner.py` | Notes, packing, stays, expense edit/delete |
| `tests/test_groups.py` | Public discover and join |

External geocoding and weather are stubbed in tests so the suite does not depend on the network.

---

## Documentation

| Document | Audience |
|---|---|
| [docs/INSTALL.md](docs/INSTALL.md) | Local setup, HTTPS note, AI key |
| [docs/USER_MANUAL.md](docs/USER_MANUAL.md) | Travelers — register through weather |
| [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) | Operators — stats, deactivate, remove trip |
| OpenAPI | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) |

---

## Out of Scope

Version 1 / 1.3 does **not** implement live flight search, hotel reservation APIs, payment capture, voice/video calling, offline sync, or push notifications. The trip workspace **Later** tab is an explicit placeholder for those vendors.

Group chat, Discover, splits, carpool listings, location ping, and dummy SOS are present as collaboration extras; they are not substitutes for the Version 2/3 designs in the SRS (carpool matching, live GPS, SOS SMS).

---

## Team

**Sanjay Raj K · Palvadi Adithya · Durgesh Kumar**  
Department of Computer Science & Engineering  
Software Engineering Laboratory — Academic Year 2026–2027

Repository: [github.com/sanjayraj-dev/TripWise](https://github.com/sanjayraj-dev/TripWise)

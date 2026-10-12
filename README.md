# TripWise — Smart Travel Companion

### *A traveler’s notebook that actually knows the itinerary*

[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20TypeScript-61DAFB.svg?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-4169E1.svg?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![scikit-learn](https://img.shields.io/badge/ML-scikit--learn%20RandomForest-F7931E.svg?style=for-the-badge&logo=scikitlearn&logoColor=white)](https://scikit-learn.org/)
[![JWT](https://img.shields.io/badge/Auth-JWT%20%2B%20bcrypt-000000.svg?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![OpenStreetMap](https://img.shields.io/badge/Maps-OpenStreetMap%20%2B%20OSRM-7EBC6F.svg?style=for-the-badge&logo=openstreetmap&logoColor=white)](https://www.openstreetmap.org/)
[![SRS v1.3](https://img.shields.io/badge/Specification-IEEE%20SRS%20v1.3-E07A5F.svg?style=for-the-badge)](#-srs-v13-alignment)

> **Software Engineering Laboratory | Academic Year 2026–2027**  
> **TripWise** consolidates trip planning — destinations, day-wise itineraries, budgets, stays, notes, packing, and crew — into one authenticated workspace. Version **1.3** of the IEEE-style Software Requirements Specification covers AI-assisted itinerary drafts per TripStop, an interactive map of geocoded stops, and short-range weather. This tree also ships an explainable **crew matcher**, origin→destination **route maps**, and **owner-approved joins** on public groups. The itinerary generator never writes activities until the traveler accepts them; if the LLM is unavailable, a labeled city template is used instead.

---

## Table of Contents

- [Executive Overview](#-executive-overview)
- [Product Aesthetic](#-product-aesthetic)
- [System Architecture](#-system-architecture)
  - [High-Level Architecture](#high-level-architecture)
  - [Itinerary Draft Sequence](#itinerary-draft-sequence)
  - [Join Request Sequence](#join-request-sequence)
- [Crew Matcher](#-crew-matcher)
- [Route Map](#-route-map)
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

None of those tools own the trip. When a date shifts, the itinerary, stays, and remaining budget do not move with it. Public groups, if they exist at all, usually dump strangers straight into the thread.

### How TripWise solves this

TripWise is the notebook that *is* the itinerary:

- **One trip workspace** — route, days, money, stays, papers, notes, packing, and crew live on the same record.
- **Ownership and confirmation** — travelers only see trips they own or have an **active** membership on; destructive actions ask before they run.
- **Public groups with a gate** — Discover lists public trips; joining sends a request. The owner is notified and must approve or decline. Pending travelers cannot open chat, budget, or the itinerary.
- **AI as a draft, not a booking** — generate a preview for a TripStop (balanced / food / culture / chill), pick the items you want, then accept. Existing activities are not overwritten unless you confirm replacement.
- **Maps as a corridor** — Nominatim geocodes stops onto OpenStreetMap; OSRM drives short hops; long hauls are drawn as flights. A 7-day Open-Meteo forecast loads for the selected stop.
- **Crew matcher** — a trained random forest ranks public groups against destination, dates, style, and seats, with a linear baseline and per-signal contributions on the card.
- **Admin that stays out of the way** — operators see usage, deactivate accounts, and can remove a trip. They do not plan personal travel.

---

## Product Aesthetic

TripWise is designed as a paper notebook: warm stock, terracotta marks, navy type. Trip cards use a palette gradient derived from the title — no stock photography.

| Surface | What you see |
|---|---|
| **Landing** | Product story, feature grid, SRS counts (58 functional requirements, 12 system features) |
| **Dashboard** | Greeting, next departure, remaining budget, readiness, week of activities, join-request banner |
| **Discover** | Public groups plus the crew matcher (design-your-trip ranking, model card, map of hits) |
| **Trip workspace** | Tabs: Overview, Group, Chat, Route, Itinerary, Budget, Stays, Papers, Notes & Pack, Later |
| **Route** | Origin (home city or GPS), numbered OSM markers, drive and/or flight geometry, per-stop weather |
| **Group** | Active crew, pending requests with Approve / Decline |
| **Inbox** | Bell in the shell — join requests, approvals, and declines |
| **Admin** | KPIs, recent trips, traveler detail, activate / deactivate, remove trip |

---

## System Architecture

```
+----------------------------------------------------------------------------------+
|                              TRIPWISE RUNTIME                                     |
+----------------------------------------------------------------------------------+
|  [ React 19 + Vite 6 ]   ->  Traveler and admin UI, Leaflet map, Recharts         |
|  [ FastAPI + Uvicorn ]   ->  REST JSON, JWT Bearer, OpenAPI at /docs              |
|  [ PostgreSQL 16 ]       ->  Primary store (SQLite file if Docker is down)        |
|  [ Nominatim / OSM ]     ->  Geocode TripStops, render tiles, nearby POIs         |
|  [ OSRM ]                ->  Drive geometry when the geodesic is short            |
|  [ Open-Meteo ]          ->  7-day forecast for a geocoded stop                   |
|  [ scikit-learn ]        ->  Random forest crew rank vs linear baseline           |
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

    subgraph Client[Traveler browser]
        UI[React SPA]
        Map[Leaflet OSM map]
    end
    class UI,Map client

    subgraph Gateway[FastAPI]
        Auth[Auth and profile]
        Trips[Trips destinations itinerary]
        Money[Expenses stays notes packing]
        Social[Discover join inbox]
        Match[Crew matcher]
        Route[Route map]
        AI[Itinerary adapter]
        Admin[Admin stats and moderation]
    end
    class Auth,Trips,Money,Social,Match,Route,AI,Admin api

    subgraph Store[Persistence]
        PG[(PostgreSQL or SQLite)]
    end
    class PG data

    subgraph External[External adapters]
        Geo[Nominatim geocoding]
        Wx[Open-Meteo forecast]
        OSRM[OSRM drive]
        LLM[SpaceXAI optional]
        Overpass[OSM nearby places]
        SK[sklearn forest]
    end
    class Geo,Wx,OSRM,LLM,Overpass,SK ext

    UI -->|JSON JWT| Auth
    UI --> Map
    Auth --> PG
    Trips --> PG
    Money --> PG
    Social --> PG
    Match --> PG
    Match --> SK
    Route --> PG
    Admin --> PG
    Trips --> Geo
    Trips --> Wx
    Route --> Geo
    Route --> OSRM
    AI --> LLM
    AI --> Geo
    AI --> Wx
    AI --> Overpass
    Map -.-> Geo
```

### Itinerary Draft Sequence

SRS SF-011: generate is a **preview**. Persist only on accept.

```mermaid
sequenceDiagram
    autonumber
    actor Traveler
    participant UI as Itinerary tab
    participant API as FastAPI
    participant Geo as Geocoding and weather
    participant LLM as SpaceXAI adapter
    participant DB as PostgreSQL

    Traveler->>UI: Open a stop and pick a style
    UI->>API: POST itinerary-draft
    API->>DB: Load destination and existing activities
    API->>Geo: Geocode, forecast, nearby names
    API->>LLM: Request a JSON draft

    alt Model returns a valid draft
        LLM-->>API: source ai
    else Missing key, timeout, or invalid JSON
        API->>API: Labeled city template
    end

    API-->>UI: Preview only, nothing saved
    UI->>Traveler: Select items, then accept

    alt Stop already has activities
        Traveler->>UI: Add alongside or replace
    end

    UI->>API: POST itinerary-draft accept
    API->>DB: Insert selected rows
    API-->>UI: Created activities
```

### Join Request Sequence

Public groups never activate a stranger on `POST /join`. Status is **pending** until the owner acts.

```mermaid
sequenceDiagram
    autonumber
    actor Traveler
    actor Owner
    participant UI as Discover
    participant API as FastAPI
    participant DB as Store

    Traveler->>UI: Request to join a public trip
    UI->>API: POST join
    API->>DB: Member status pending
    API->>DB: Notify owner
    API-->>UI: Request sent
    Note over Traveler: Workspace stays closed

    Owner->>UI: Open inbox or Group tab
    alt Approve
        Owner->>API: POST approve
        API->>DB: Member status active
        API->>DB: Notify traveler
        Note over Traveler: Workspace opens
    else Decline
        Owner->>API: POST decline
        API->>DB: Member status declined
        API->>DB: Notify traveler
    end
```

---

## Crew Matcher

Faculty-facing ML on Discover. The traveler fills destination, dates, interests, and seats; the API ranks public trips.

| Piece | Behaviour |
|---|---|
| Endpoint | `POST /api/match/design` |
| Model card | `GET /api/match/model` — algorithm, train/test size, forest vs linear metrics, feature importance |
| Forest | scikit-learn `RandomForestClassifier`, pickled at `backend/app/ml/match_model.pkl` |
| Baseline | Logistic regression on the same features |
| Features | `dest_sim`, date overlap, tag/style similarity, seats ratio, month proximity, duration similarity |
| `dest_sim` | Aliases (Bangalore/Bengaluru, Coorg/Madikeri), region groups, haversine gazetteer — not string equality |
| Explain | Each hit returns per-signal contribution so the score is inspectable |
| Place first | Bangalore + October ranks Coorg / Hampi above a Kyoto trip that only shares the month |

Retrain:

```bash
cd backend
python train_match_model.py
```

---

## Route Map

`GET /api/trips/{id}/route-map` returns origin, stops, vias, drive and/or flight geometry.

| Rule | Behaviour |
|---|---|
| Origin | Query `fromLat` / `fromLng` / `fromLabel` if the browser shared GPS; otherwise the traveler’s `home_city` |
| Drive | OSRM when the geodesic is short enough to be a road trip |
| Flight | Great-circle when the hop is long (India → Japan is not a 14-hour drive) |
| Vias | Major-city waypoints with a tight detour budget; junk reverse-geocode labels are dropped |
| Access | Owner or **active** member only |

---

## Core Modules

```
+-----------------------------------------------------------------------------------+
|                              TRIPWISE FEATURE SET (SRS v1.3 + extras)             |
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
| Route map                 | Origin, drive, flight        | core/routing.py        |
| Crew matcher              | Rank public groups           | ml/match.py            |
| Discover & join           | Public list, request/approve | routers/social.py      |
| Inbox                     | Join request notifications   | models/notification.py |
| Budget & expenses         | Categories + remaining       | routers/expenses.py    |
| Accommodations            | Stays bound to a stop        | routers/accommodations |
| Notes & packing           | Free text + checklist        | routers/notes.py       |
| Profile                   | Name, style, SOS contacts    | routers/profile.py     |
| Administration            | Users, stats, remove trip    | routers/admin.py       |
+---------------------------+------------------------------+------------------------+
```

### Authentication (`SF-001`)

- Unique email, bcrypt hashes, password policy (8+ characters, upper, lower, digit, special).
- JWT includes a **token version**. Logout and password change increment it; the previous token is rejected.
- Configurable idle timeout (default 30 minutes) signs the browser out.
- Deactivated travelers cannot sign in.

### Traveler dashboard (`SF-002`)

Upcoming and in-progress trips, recently completed trips, remaining budget on active trips, and the next week of activities. Unread join requests surface as a banner into the Group tab.

### Trip, destination, itinerary (`SF-003`–`SF-005`)

A trip has a title, start/end dates, and estimated budget. Destinations must sit inside those dates and sort by arrival. Activities must sit inside the destination dates; end time must be after start time. Deletes confirm in the UI. Only the **owner** can mutate trip metadata, share, or delete.

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

Geocoding prefers Nominatim, then Open-Meteo. Coordinates are stored on the destination. The map shows numbered markers and a connecting corridor. Clicking a marker highlights the stop in the list and loads that stop’s forecast. If nothing geocoded, a placeholder is shown.

### Budget, stays, notes, packing (`SF-006`–`SF-008`)

Expenses: Food, Transport, Stay, Activities, Shopping, Other. Remaining = estimated − spent. Insights roll spend by category and month across trips the traveler **owns or has joined**. Stays carry property, address, dates, booking reference, and contact. Notes and packing belong to the trip.

### Profile and admin (`SF-009`, `SF-010`)

Travelers update name, bio, home city, and travel style, change password after verifying the current one, and keep emergency contacts for the dummy SOS. Admins see traveler counts, trip status mix, destinations, activities, recent trips, a traveler’s trip list, activate/deactivate, and can delete a trip.

---

## Key Features

| Feature | Description |
|---|---|
| **Multi-trip notebook** | Keep many trips; search by title or city; filter upcoming / in progress / completed |
| **Readiness score** | Destinations, activities, stays, packing, and papers feed a simple completeness check |
| **Categorized spend** | Pie summary and remaining budget that turns when you overshoot |
| **AI day drafts** | Preview per TripStop; accept selected; template fallback is labeled in the UI |
| **Interactive route** | Origin, numbered OSM markers, drive and/or flight geometry, highlight, nearby POIs |
| **Weather overlay** | 7-day Open-Meteo forecast for the selected geocoded city |
| **Crew matcher** | Forest rank of public groups with a linear baseline and inspectable signals |
| **Join requests** | Public join is pending; owner inbox + Group tab approve/decline; requester notified |
| **Travel papers** | Passport / visa / ticket records with expiry |
| **Share link** | Public itinerary at `/p/:token` without an account (documents, packing, notes, members, expenses stripped) |
| **Group extras** | Chat, equal-share settlement, carpool listings, dummy SOS, location ping |
| **Admin moderation** | Usage KPIs and remove-trip for records that should not stay |

---

## Data Model

Primary entities from the SRS. Destinations (TripStops) are the spine: activities, expenses, and stays hang off a stop. Notes, packing, papers, members, chat, and notifications hang off the trip or the user.

```
  users 1──N trips 1──N destinations 1──N activities
     │             │                 ├──N expenses
     │             │                 └──N accommodations
     │             ├──N notes
     │             ├──N packing_items
     │             ├──N travel_documents
     │             ├──N trip_members (owner active, member pending/active/declined)
     │             └──N chat_messages
     ├──N notifications
     └──N emergency_contacts
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
| token_version    |       | visibility, seats    |       | lat, lng         |
| home_city        |       | join_mode = request  |       +------------------+
+------------------+       +----------------------+
         |                          |
         v                          v
+------------------+       +----------------------+
|  notifications   |       |    trip_members      |
|------------------|       |----------------------|
| user_id FK       |       | trip_id, user_id     |
| actor_user_id    |       | role owner/member    |
| trip_id          |       | status active/       |
| kind, title      |       |        pending/      |
| read_at          |       |        declined      |
+------------------+       +----------------------+
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
│   │   │   ├── routing.py         # OSRM vs flight, vias, junk labels
│   │   │   ├── access.py          # owner vs active member
│   │   │   ├── security.py        # bcrypt, JWT, password policy
│   │   │   ├── deps.py            # current user / traveler / admin
│   │   │   └── config.py
│   │   ├── ml/
│   │   │   ├── features.py        # dest_sim, overlap, gazetteer
│   │   │   ├── match.py           # forest + linear score
│   │   │   └── match_model.pkl
│   │   ├── models/                # SQLAlchemy entities
│   │   ├── routers/               # REST modules
│   │   ├── schemas/common.py
│   │   ├── db/session.py          # Postgres, SQLite fallback, schema patch
│   │   ├── seed.py                # Demo travelers and trips
│   │   └── main.py
│   ├── tests/                     # Auth, trips, itinerary, planner, groups, match, route
│   ├── train_match_model.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/                 # Landing, auth, dashboard, admin, trip tabs
│   │   ├── pages/trip/            # Route, Itinerary, Budget, Group, Chat, ...
│   │   ├── components/
│   │   │   ├── MapView.tsx
│   │   │   ├── MatchFinder.tsx
│   │   │   └── NotificationBell.tsx
│   │   └── auth/AuthContext.tsx   # Token + idle timeout
│   └── public/
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
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

On **Windows** omit `--reload` — it hangs Uvicorn. Restart the process after backend edits.

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

Created on first backend start if the database is empty. Password for every account: **`TripWise@123`**

| Role | Email | What to show |
|---|---|---|
| Traveler — **Meera Iyer** | `meera@tripwise.dev` | Owns Coorg / Manali / Rishikesh / Ladakh. Inbox: Kenji wants Coorg. |
| Traveler — **Aria Sen** (owner) | `traveler@tripwise.dev` | Kyoto Autumn, Lisbon Light, completed Goa Weekend. Inbox: Lucas wants Lisbon. |
| Traveler — **Kenji Mori** | `kenji@tripwise.dev` | Osaka; pending on Coorg until Meera approves. |
| Traveler — **Lucas Costa** | `lucas@tripwise.dev` | Lisbon Coast; pending on Lisbon Light. |
| Administrator | `admin@tripwise.dev` | Stats, deactivate, remove trip. |

Faculty walkthrough as Meera: dashboard banner → Inbox → Coorg **Group** → Approve or Decline. As Kenji, Coorg stays **Request pending** and `GET /api/trips/{id}` is 403 until then.

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
{ "email": "meera@tripwise.dev", "password": "TripWise@123" }
```

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": { "id": 4, "full_name": "Meera Iyer", "email": "meera@tripwise.dev", "role": "traveler" }
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
| `GET` | `/api/trips/{id}/route-map` |

`PUT` / share / delete require the **owner**. `GET` allows owner or active member.

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

### Discover, join, inbox

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/discover` | Public trips; optional `?city=` uses `dest_sim` |
| `POST` | `/api/trips/{id}/join` | Always **pending**; notifies the owner |
| `POST` | `/api/trips/{id}/members/{uid}/approve` | Owner only; notifies requester |
| `POST` | `/api/trips/{id}/members/{uid}/decline` | Owner only; notifies requester |
| `POST` | `/api/trips/{id}/leave` | Active or pending member |
| `GET` | `/api/notifications` | Newest first |
| `POST` | `/api/notifications/{id}/read` | |
| `POST` | `/api/notifications/read-all` | |
| `GET` | `/api/carpool` | Public trips with seats; skips trips you already belong to |

### Crew matcher

| Method | Path |
|---|---|
| `POST` | `/api/match/design` |
| `GET` | `/api/match/model` |
| `POST` | `/api/match` |

**Design**

```json
{
  "destination": "Bangalore",
  "startDate": "2026-10-10",
  "endDate": "2026-10-16",
  "interests": ["culture"],
  "seatsNeeded": 1
}
```

Hits include `score`, `baselineScore`, `destSim`, `bucket` (`overlap` / `nearby` / `other`), `signals[]`, `isMember`, `isPending`.

### Money, stays, notes

| Method | Path |
|---|---|
| `POST` | `/api/trips/{id}/expenses` |
| `PUT` `DELETE` | `/api/expenses/{id}` |
| `GET` | `/api/insights` |
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
| Ownership | Travelers access trips they own or have **active** membership on |
| Join gate | Public `POST /join` creates `pending`; mutating trip metadata is owner-only |
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
| SF-002 Dashboard | Upcoming, completed, budget, week, join-request banner |
| SF-003 Trip management | CRUD, date validation, multi-trip, owner-only mutate |
| SF-004 Destinations | Ordered TripStops, date bounds, geocoded lat/lng |
| SF-005 Itinerary | Day-wise activities with times |
| SF-006 Budget | Categories, remaining, summary chart, insights for joined trips |
| SF-007 Accommodations | Manual stays on a destination |
| SF-008 Notes & packing | Notes + packed/unpacked list |
| SF-009 Profile | View/update, change password, emergency contacts |
| SF-010 Administration | Users, stats, deactivate, remove trip |
| SF-011 AI itinerary | Preview, accept selected, labeled template fallback, replace confirm |
| SF-012 Map & weather | Numbered OSM route, placeholder, per-stop forecast, origin corridor |
| NFR session idle | 30-minute browser timeout, configurable |
| NFR documentation | Install, user, and admin guides in `docs/` |

Beyond the SRS, this tree adds the crew matcher, OSRM/flight route map, and the join-request inbox. IEEE-style SRS v1.3 (last updated 19 September 2026) remains the course requirements document. UML analysis models are maintained separately.

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
| `tests/test_planner.py` | Notes, packing, stays, expense edit/delete, insights after approved join |
| `tests/test_groups.py` | Discover, pending join, 403 until approve, decline, notifications |
| `tests/test_match.py` | `dest_sim` Bangalore vs Coorg vs Kyoto, forest ranks nearby over far |
| `tests/test_route_map.py` | Route JSON after approved join, home-city origin, GPS override |

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

In-app inbox is for join requests only — not a general push channel. Dummy SOS does not send SMS. Group chat, splits, carpool listings, and location ping are collaboration extras; they are not substitutes for the Version 2/3 designs in the SRS (carpool matching, live GPS, SOS SMS).

---

## Team

**Sanjay Raj K · Palvadi Adithya · Durgesh Kumar**  
Department of Computer Science & Engineering  
Software Engineering Laboratory — Academic Year 2026–2027

Repository: [github.com/sanjayraj-dev/TripWise](https://github.com/sanjayraj-dev/TripWise)

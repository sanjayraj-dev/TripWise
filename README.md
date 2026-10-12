# TripWise

A trip notebook — route, days, money, crew — in one authenticated workspace.

React 19 + Vite 6 · FastAPI · PostgreSQL (SQLite fallback) · JWT

**Software Engineering Laboratory · 2026–2027**  
Sanjay Raj K · Palvadi Adithya · Durgesh Kumar

This branch (`review2-match-model`) is the faculty demo: an explainable crew matcher, origin→destination route maps, and owner-approved joins on public trips.

---

## What it does

One trip record holds destinations, a day-wise itinerary, budget, stays, papers, notes, and packing. Travelers own their trips; members only see a workspace after the owner approves them.

| Surface | Point |
|---|---|
| **Dashboard** | Next departure, remaining budget, readiness, the week ahead, join-request banner |
| **Discover** | Public groups ranked by a trained forest — place first, then dates and style |
| **Trip workspace** | Overview · Group · Chat · Route · Itinerary · Budget · Stays · Papers · Notes & Pack |
| **Route** | Home or GPS origin, OSRM drive when it is plausible, great-circle flight when it is not |
| **Insights** | Spend by category and month across trips you own *and* trips you have joined |
| **Admin** | Usage, deactivate accounts, remove a trip |

AI itinerary drafts are a **preview**. Nothing is saved until the traveler accepts selected items. If there is no `XAI_API_KEY`, a labeled city template is used.

---

## This branch

### Crew matcher

`POST /api/match/design` ranks public trips against a destination, dates, interests, and seats.

- **Random forest** vs a linear baseline (held-out ROC-AUC on the card under Discover)
- Features: destination similarity (aliases, regions, haversine gazetteer), date overlap, style, seats, month, duration
- Bangalore + October ranks **Coorg / Hampi** above a Kyoto trip that only shares the month
- Each hit shows per-signal contribution so the score is inspectable

### Route map

`GET /api/trips/{id}/route-map` plots origin → stops.

- Origin is GPS if offered, otherwise the traveler’s home city
- Drive via OSRM when the geodesic is short; **flight** when it is not (India → Japan is not a 14-hour drive)
- Junk via labels and implausible detours are dropped

### Join requests

Public groups do not let strangers walk in.

1. Traveler taps **Request to join**
2. Owner gets an inbox notification (and a dashboard banner)
3. Group tab: **Approve** or **Decline**
4. Requester is notified; the workspace stays closed until approval

Instant join is gone. Pending members cannot open chat, budget, or the itinerary.

---

## Run it

Python 3.11+ · Node 20+ · Docker optional (Postgres). Without Docker the API uses `backend/tripwise.db`.

```bash
git clone https://github.com/sanjayraj-dev/TripWise.git
cd TripWise
git checkout review2-match-model
```

**API**

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS / Linux: source .venv/bin/activate
pip install -r requirements.txt
copy ..\.env.example .env          # cp ../.env.example .env
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

On Windows skip `--reload` — it hangs the process. Restart Uvicorn after backend edits.

OpenAPI: http://127.0.0.1:8000/docs

**UI** (second terminal)

```bash
cd frontend
npm install
npm run dev
```

http://localhost:5173 — Vite proxies `/api`.

Optional: `docker compose up -d` for Postgres 16 on `localhost:5432`. Optional: set `XAI_API_KEY` in `backend/.env` for live itinerary drafts.

---

## Demo accounts

Seeded on first start if the database is empty. Password for all: `TripWise@123`

| Who | Email | What to show |
|---|---|---|
| **Meera Iyer** | `meera@tripwise.dev` | Owns Coorg / Manali / Rishikesh / Ladakh. Inbox: Kenji wants Coorg. |
| **Aria Sen** | `traveler@tripwise.dev` | Owns Kyoto Autumn and Lisbon Light. Inbox: Lucas wants Lisbon. |
| **Kenji Mori** | `kenji@tripwise.dev` | Osaka; pending on Coorg until Meera approves. |
| **Lucas Costa** | `lucas@tripwise.dev` | Lisbon Coast; pending on Lisbon Light. |
| Admin | `admin@tripwise.dev` | Stats, deactivate, remove trip. |

Faculty walkthrough as Meera: dashboard banner → Inbox → Coorg **Group** → approve or decline. As Kenji, Coorg stays **Request pending** and the workspace is 403 until then.

Change these passwords before any shared host.

---

## Stack

```
Browser (React 19, Leaflet, Recharts)
        │  JWT
        ▼
FastAPI ── PostgreSQL or SQLite
        ├── Nominatim / Open-Meteo / OSRM
        ├── sklearn forest  (crew rank)
        └── SpaceXAI        (optional day drafts)
```

Travelers only read trips they own or have an **active** membership on. Logout and password change bump `token_version` so the previous JWT dies. Idle timeout defaults to 30 minutes.

---

## Tests

```bash
cd backend
pytest -q
```

Auth, trips, itinerary drafts, planner, **join approval + notifications**, matcher ranking (Bangalore → Coorg), route-map JSON. Geocoding and weather are stubbed.

---

## Docs

| | |
|---|---|
| [docs/INSTALL.md](docs/INSTALL.md) | Setup, HTTPS, AI key |
| [docs/USER_MANUAL.md](docs/USER_MANUAL.md) | Traveler surfaces |
| [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) | Operator actions |
| OpenAPI | http://127.0.0.1:8000/docs |

Not in v1: live flights, hotel APIs, payments, push, offline sync. The workspace **Later** tab is the placeholder for those.

---

[github.com/sanjayraj-dev/TripWise](https://github.com/sanjayraj-dev/TripWise)

# TripWise — Smart Travel Companion

Web app for planning trips: destinations, day-wise itineraries, budget, stays, notes, and packing. Built to the Version 1 SRS (React + FastAPI + PostgreSQL + JWT).

## Run locally

You need Python 3.11+ and Node 20+. PostgreSQL via Docker is preferred; if Docker is not running, the backend falls back to a local SQLite file automatically.

```bash
# 1. Database (optional — skip if Docker Desktop is not running)
docker compose up -d

# 2. Backend
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Aria (owner) | traveler@tripwise.dev | TripWise@123 |
| Kenji (crew) | kenji@tripwise.dev | TripWise@123 |
| Meera | meera@tripwise.dev | TripWise@123 |
| Lucas | lucas@tripwise.dev | TripWise@123 |
| Admin | admin@tripwise.dev | TripWise@123 |

The first backend start seeds **Kyoto Autumn**, **Lisbon Light**, and a completed **Goa Weekend** for the traveler — with map coordinates, weather-ready stops, papers, and packing.

Beyond the SRS MVP, the app also includes:

- OpenStreetMap route with geocoded stops
- 7-day weather per destination (Open-Meteo)
- Calendar ops board and lifetime Insights
- Public shareable itinerary links
- Duplicate trip, print briefing, day-draft helper
- Travel documents (passport / visa / tickets) with expiry
- Trip readiness score, types, and search
- Public group trips, Discover, join / request / leave
- Group chat, split settlement, nearby places, weather alerts
- Carpool seats, live location ping, dummy SOS
- Placeholder UI for flights, hotels, payments, and calling

## API

- Docs: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/api/health

## Tests

```bash
cd backend
pytest -q
```

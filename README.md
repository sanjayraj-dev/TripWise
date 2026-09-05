# TripWise

**Smart Travel Companion** — a web app for planning trips together: destinations, day-wise itinerary, budget, stays, notes, and a packing kit.

Software Engineering Lab project, VIT Chennai. SRS v1.2 (July 2026).

| | |
|---|---|
| Team | Sanjay Raj K, Palvadi Adithya, Durgesh Kumar |
| Stack | React 19, TanStack Start, Postgres, Better Auth |
| Spec | [docs/TripWise_SRS_v1.2.docx](docs/TripWise_SRS_v1.2.docx) |

## What it does

- **Open board** — anyone can browse live journeys. Join (or create) after sign-in.
- **Auth** — register / login with email + password (8+ upper, lower, digit, special), or Google / X.
- **Journal** — your owned and joined trips, with budget and packing progress.
- **Trip workspace** — overview + route map, destinations, itinerary, expenses, stays, notes, packing inventory, companions.
- **Open vs private** — open trips list on the board with a party size cap; private stays with members only.
- **Admin** — first registered traveler is admin: accounts, activate/deactivate, usage stats.

Seeded board trips (Kyoto, Himalaya, Lisbon, Kerala, Iceland, Bali, New York, Rajasthan) fill the home page so the product is demoable immediately.

Joinable public trips go beyond the original own-only rule (BR-010 / NFR-012). Core SRS features FR-001–048 still hold.

## Run locally

```bash
npm install
npm run dev
```

Needs Node 22. With no `DATABASE_URL`, the app uses an embedded Postgres (PGLite) so the preview works without a cloud database. Set `DATABASE_URL` for real Postgres (Neon on deploy).

| Script | |
|---|---|
| `npm run dev` | Dev server |
| `npm run typecheck` | TypeScript |
| `npm run build` | Production build + migrations |

## SRS map

| Feature | Where |
|---|---|
| SF-001 Auth (FR-001–006) | `/register`, `/login`, `/profile` |
| SF-002 Dashboard (FR-007–010) | `/journal` |
| SF-003 Trip CRUD (FR-011–015) | `/trips/new`, trip settings |
| SF-004 Destinations (FR-016–019) | Trip → Destinations |
| SF-005 Itinerary (FR-020–024) | Trip → Itinerary |
| SF-006 Budget (FR-025–030) | Trip → Budget |
| SF-007 Stays (FR-031–035) | Trip → Stays |
| SF-008 Notes & packing (FR-036–039) | Trip → Notes / Packing |
| SF-009 Profile (FR-040–043) | `/profile` |
| SF-010 Admin (FR-044–048) | `/admin` |

## Layout

```
src/routes/           pages (board, journal, login, trip workspace, admin)
src/lib/tripwise/     server API, seed data, types
src/components/       UI kit + trip board / workspace
migrations/           Postgres schema + community (open trips, members)
docs/                 SRS
```

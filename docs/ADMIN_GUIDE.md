# TripWise administrator guide

Administrators sign in with an admin account (seeded demo: `admin@tripwise.dev` / `TripWise@123`). Traveler modules are hidden; the admin dashboard is shown instead.

## What you can do

- See platform statistics: travelers, active vs deactivated, trips by upcoming / in progress / completed, destinations, activities.
- Browse recent trips and remove a trip that should not stay on the platform.
- List registered travelers, open one traveler to see their trips, and activate or deactivate the account.

Deactivated travelers cannot sign in until you activate them again.

## What you cannot do

Administrators do not create personal trips. Traveler planning stays on traveler accounts.

## Seeded demo users

| Role | Email | Password |
|---|---|---|
| Traveler (Aria) | traveler@tripwise.dev | TripWise@123 |
| Traveler (Kenji) | kenji@tripwise.dev | TripWise@123 |
| Admin | admin@tripwise.dev | TripWise@123 |

Change these passwords before any shared or production use.

## Operational notes

- Passwords are stored with bcrypt. JWT access tokens expire, and logout increments a token version so the old token is rejected.
- Keep `SECRET_KEY` and `XAI_API_KEY` in a private `.env`, never in git.
- Put HTTPS in front of the API in production.
- `GET /api/health` reports process liveness. FastAPI’s `/docs` is the live API catalog.

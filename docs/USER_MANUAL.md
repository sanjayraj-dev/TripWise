# TripWise user manual

TripWise is a web notebook for one traveler’s trips: route, day-wise itinerary, budget, stays, notes, and packing.

## Create an account

1. Open the app and choose **Create an account**.
2. Enter full name, email, and a password (at least 8 characters with upper, lower, a digit, and a special character).
3. After registration you land on the dashboard.

If the email is already registered, the form shows an error. Invalid login does not reveal whether the email exists.

## Sign in and sign out

Use **Sign in** with email and password. **Sign out** in the sidebar (or the header on a phone) ends the session. The previous token cannot be reused. After 30 minutes of no activity the app also signs you out.

## Dashboard

The dashboard lists upcoming and in-progress trips, recently completed trips, remaining budget on active trips, and the next week of activities. Open a trip card to go to its workspace.

## Trips

**New trip** asks for title, start date, end date, and estimated budget. End date must be on or after start date. You can keep many trips at once.

Inside a trip:

- **Edit** updates title, dates, and budget. Dates cannot exclude destinations you already added.
- **Delete** asks for confirmation, then removes the trip and everything attached to it.

## Destinations (TripStops)

On **Route**, add city, country, arrival, and departure. Dates must sit inside the trip. Stops sort by travel date and geocode onto the OpenStreetMap. Click a numbered marker or a stop in the list to highlight it. **Remove** asks for confirmation.

## Itinerary

Add activities with title, date, start/end time, and description. They show in chronological order per day.

**Generate itinerary** (Version 1.3) builds a **preview** for the selected stop:

1. Pick the destination and a style (balanced, food, culture, chill).
2. Review the draft. Template drafts are labeled if the AI service is down.
3. Select the items you want.
4. Accept. If the stop already has activities, choose **Add alongside** or **Replace existing**.

Nothing from the generator is saved until you accept.

## Budget

Set the trip budget when you create or edit the trip. Record expenses under Food, Transport, Stay, Activities, Shopping, or Other. Remaining budget updates automatically. Edit or delete an expense (delete asks for confirmation). A category chart summarizes spend.

## Stays

Record property name, address, check-in, check-out, booking reference, and contact against a destination. Edit or delete with confirmation.

## Notes and packing

Notes are free text on the trip. The packing list can be marked packed or unpacked. Both belong to the trip, not to a single stop.

## Profile

View and update your name and other profile fields. Change password by entering the current password and a new one that meets the same policy.

## Weather and map

Stops with coordinates appear on the map with a connecting route. Select a stop to load its short-range forecast. If nothing has been geocoded yet, the map shows a placeholder.

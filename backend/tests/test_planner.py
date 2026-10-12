from tests.conftest import auth_header


def _ready(client, traveler):
    headers = auth_header(traveler)
    trip = client.post(
        "/api/trips",
        json={"title": "Lisbon Notes", "start_date": "2026-12-01", "end_date": "2026-12-04", "estimated_budget": 20000},
        headers=headers,
    ).json()
    dest = client.post(
        f"/api/trips/{trip['id']}/destinations",
        json={"city": "Lisbon", "country": "Portugal", "arrival_date": "2026-12-01", "departure_date": "2026-12-04"},
        headers=headers,
    ).json()
    return headers, trip, dest


def test_notes_and_packing(client, traveler):
    headers, trip, _dest = _ready(client, traveler)
    note = client.post(
        f"/api/trips/{trip['id']}/notes",
        json={"title": "Wifi", "content": "Cafe Brasiliera"},
        headers=headers,
    )
    assert note.status_code == 201
    packed = client.post(
        f"/api/trips/{trip['id']}/packing",
        json={"item_name": "Passport", "category": "Documents"},
        headers=headers,
    )
    assert packed.status_code == 201
    item_id = packed.json()["id"]
    toggled = client.put(f"/api/packing/{item_id}", json={"is_packed": True}, headers=headers)
    assert toggled.status_code == 200
    assert toggled.json()["is_packed"] is True
    detail = client.get(f"/api/trips/{trip['id']}", headers=headers).json()
    assert detail["notes"][0]["title"] == "Wifi"
    assert detail["packing_progress"]["packed"] == 1


def test_stay_crud(client, traveler):
    headers, trip, dest = _ready(client, traveler)
    stay = client.post(
        f"/api/destinations/{dest['id']}/accommodations",
        json={
            "property_name": "Alfama House",
            "address": "Rua da Saudade",
            "check_in": "2026-12-01",
            "check_out": "2026-12-04",
            "booking_reference": "TW-1",
            "contact": "+351",
        },
        headers=headers,
    )
    assert stay.status_code == 201, stay.text
    stay_id = stay.json()["id"]
    updated = client.put(
        f"/api/accommodations/{stay_id}",
        json={"property_name": "Alfama House Annex"},
        headers=headers,
    )
    assert updated.json()["property_name"] == "Alfama House Annex"
    deleted = client.delete(f"/api/accommodations/{stay_id}", headers=headers)
    assert deleted.status_code == 200


def test_insights_includes_member_trip_spend(client, traveler, other):
    headers = auth_header(traveler)
    trip = client.post(
        "/api/trips",
        json={
            "title": "Kyoto Autumn",
            "start_date": "2026-10-10",
            "end_date": "2026-10-16",
            "estimated_budget": 50000,
            "visibility": "public",
            "join_mode": "open",
        },
        headers=headers,
    ).json()
    dest = client.post(
        f"/api/trips/{trip['id']}/destinations",
        json={"city": "Kyoto", "country": "Japan", "arrival_date": "2026-10-10", "departure_date": "2026-10-16"},
        headers=headers,
    ).json()
    client.post(
        f"/api/destinations/{dest['id']}/expenses",
        json={"amount": 12500, "category": "Food", "expense_date": "2026-10-12", "description": "Ramen"},
        headers=headers,
    )
    joined = client.post(f"/api/trips/{trip['id']}/join", headers=auth_header(other))
    assert joined.status_code == 200
    assert joined.json()["status"] == "pending"
    approved = client.post(
        f"/api/trips/{trip['id']}/members/{other['user']['id']}/approve",
        headers=headers,
    )
    assert approved.status_code == 200
    insights = client.get("/api/insights", headers=auth_header(other))
    assert insights.status_code == 200, insights.text
    body = insights.json()
    assert body["spent"] == 12500
    assert body["by_category"]
    assert body["by_category"][0]["name"] == "Food"
    assert body["by_month"]
    assert body["by_month"][0]["month"] == "2026-10"


def test_expense_edit_delete(client, traveler):
    headers, trip, dest = _ready(client, traveler)
    exp = client.post(
        f"/api/destinations/{dest['id']}/expenses",
        json={"amount": 40, "category": "Food", "expense_date": "2026-12-02", "description": "Pasteis"},
        headers=headers,
    ).json()
    updated = client.put(f"/api/expenses/{exp['id']}", json={"amount": 45}, headers=headers)
    assert updated.status_code == 200
    assert updated.json()["amount"] == 45
    client.delete(f"/api/expenses/{exp['id']}", headers=headers)
    detail = client.get(f"/api/trips/{trip['id']}", headers=headers).json()
    assert detail["spent"] == 0

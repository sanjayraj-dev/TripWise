from tests.conftest import auth_header


def test_create_trip_and_dashboard(client, traveler):
    headers = auth_header(traveler)
    res = client.post(
        "/api/trips",
        json={"title": "Lisbon Light", "start_date": "2026-11-01", "end_date": "2026-11-06", "estimated_budget": 90000},
        headers=headers,
    )
    assert res.status_code == 201, res.text
    trip = res.json()
    assert trip["title"] == "Lisbon Light"
    dash = client.get("/api/trips/dashboard", headers=headers)
    assert dash.status_code == 200
    assert any(t["id"] == trip["id"] for t in dash.json()["upcoming"])


def test_invalid_dates(client, traveler):
    res = client.post(
        "/api/trips",
        json={"title": "Backwards", "start_date": "2026-11-10", "end_date": "2026-11-01", "estimated_budget": 10},
        headers=auth_header(traveler),
    )
    assert res.status_code == 400


def test_ownership_isolation(client, traveler, other):
    created = client.post(
        "/api/trips",
        json={"title": "Private", "start_date": "2026-12-01", "end_date": "2026-12-04", "estimated_budget": 1000},
        headers=auth_header(traveler),
    )
    trip_id = created.json()["id"]
    peek = client.get(f"/api/trips/{trip_id}", headers=auth_header(other))
    assert peek.status_code == 403


def test_destination_and_budget(client, traveler):
    headers = auth_header(traveler)
    trip = client.post(
        "/api/trips",
        json={"title": "Osaka", "start_date": "2026-10-01", "end_date": "2026-10-08", "estimated_budget": 50000},
        headers=headers,
    ).json()
    dest = client.post(
        f"/api/trips/{trip['id']}/destinations",
        json={"city": "Osaka", "country": "Japan", "arrival_date": "2026-10-01", "departure_date": "2026-10-08"},
        headers=headers,
    )
    assert dest.status_code == 201, dest.text
    dest_id = dest.json()["id"]
    exp = client.post(
        f"/api/destinations/{dest_id}/expenses",
        json={"amount": 12000, "category": "Food", "expense_date": "2026-10-02", "description": "Okonomiyaki"},
        headers=headers,
    )
    assert exp.status_code == 201, exp.text
    detail = client.get(f"/api/trips/{trip['id']}", headers=headers).json()
    assert detail["spent"] == 12000
    assert detail["remaining"] == 38000


def test_admin_stats_and_traveler_detail(client, traveler, admin_user):
    headers = auth_header(traveler)
    client.post(
        "/api/trips",
        json={"title": "Admin View", "start_date": "2026-09-01", "end_date": "2026-09-03", "estimated_budget": 10},
        headers=headers,
    )
    stats = client.get("/api/admin/stats", headers=auth_header(admin_user))
    assert stats.status_code == 200
    body = stats.json()
    assert "upcoming_trips" in body
    assert body["trips"] >= 1
    users = client.get("/api/admin/users", headers=auth_header(admin_user)).json()
    tid = next(u["id"] for u in users if u["email"] == "test@tripwise.dev")
    detail = client.get(f"/api/admin/users/{tid}", headers=auth_header(admin_user))
    assert detail.status_code == 200
    assert detail.json()["trips"]


def test_admin_deactivate_blocks_login(client, traveler, admin_user):
    users = client.get("/api/admin/users", headers=auth_header(admin_user))
    assert users.status_code == 200
    tid = next(u["id"] for u in users.json() if u["email"] == "test@tripwise.dev")
    patch = client.patch(f"/api/admin/users/{tid}", json={"status": "deactivated"}, headers=auth_header(admin_user))
    assert patch.status_code == 200
    login = client.post("/api/auth/login", json={"email": "test@tripwise.dev", "password": "TripWise@123"})
    assert login.status_code == 403

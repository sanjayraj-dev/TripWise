from tests.conftest import auth_header


def test_join_public_group_requires_owner_approval(client, traveler, other):
    headers = auth_header(traveler)
    trip = client.post(
        "/api/trips",
        json={
            "title": "Public Alps",
            "start_date": "2026-11-01",
            "end_date": "2026-11-05",
            "estimated_budget": 50000,
            "visibility": "public",
            "join_mode": "open",
            "seats": 3,
        },
        headers=headers,
    ).json()
    assert trip["visibility"] == "public"
    assert trip["join_mode"] == "request"
    found = client.get("/api/discover", headers=auth_header(other))
    assert found.status_code == 200
    card = next(t for t in found.json() if t["id"] == trip["id"])
    assert "share_token" not in card or card.get("share_token") in (None, "")

    joined = client.post(f"/api/trips/{trip['id']}/join", headers=auth_header(other))
    assert joined.status_code == 200
    assert joined.json()["status"] == "pending"

    again = client.post(f"/api/trips/{trip['id']}/join", headers=auth_header(other))
    assert again.status_code == 200
    assert again.json()["status"] == "pending"

    blocked = client.get(f"/api/trips/{trip['id']}", headers=auth_header(other))
    assert blocked.status_code == 403
    chat = client.post(
        f"/api/trips/{trip['id']}/messages",
        json={"body": "I'll take the early train."},
        headers=auth_header(other),
    )
    assert chat.status_code == 403

    notes = client.get("/api/notifications", headers=headers)
    assert notes.status_code == 200
    inbox = notes.json()
    assert any(n["kind"] == "join_request" and n["trip_id"] == trip["id"] and not n["read"] for n in inbox)

    listed_pending = client.get("/api/carpool", headers=auth_header(other))
    assert listed_pending.status_code == 200
    assert any(t["id"] == trip["id"] for t in listed_pending.json())

    other_id = other["user"]["id"]
    hijack = client.put(
        f"/api/trips/{trip['id']}",
        json={"title": "Hijacked Alps"},
        headers=auth_header(other),
    )
    assert hijack.status_code == 403

    approved = client.post(
        f"/api/trips/{trip['id']}/members/{other_id}/approve",
        headers=headers,
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "active"

    detail = client.get(f"/api/trips/{trip['id']}", headers=auth_header(other))
    assert detail.status_code == 200
    chat_ok = client.post(
        f"/api/trips/{trip['id']}/messages",
        json={"body": "I'll take the early train."},
        headers=auth_header(other),
    )
    assert chat_ok.status_code == 201

    other_notes = client.get("/api/notifications", headers=auth_header(other))
    assert any(n["kind"] == "join_approved" and n["trip_id"] == trip["id"] for n in other_notes.json())

    owner_inbox = client.get("/api/notifications", headers=headers).json()
    req = next(n for n in owner_inbox if n["kind"] == "join_request" and n["trip_id"] == trip["id"])
    assert req["read"] is True

    listed = client.get("/api/carpool", headers=auth_header(other))
    assert listed.status_code == 200
    assert all(t["id"] != trip["id"] for t in listed.json())


def test_join_decline_notifies_requester(client, traveler, other):
    headers = auth_header(traveler)
    trip = client.post(
        "/api/trips",
        json={
            "title": "Quiet Cabin",
            "start_date": "2026-12-01",
            "end_date": "2026-12-04",
            "estimated_budget": 20000,
            "visibility": "public",
        },
        headers=headers,
    ).json()
    joined = client.post(f"/api/trips/{trip['id']}/join", headers=auth_header(other))
    assert joined.json()["status"] == "pending"
    other_id = other["user"]["id"]
    declined = client.post(
        f"/api/trips/{trip['id']}/members/{other_id}/decline",
        headers=headers,
    )
    assert declined.status_code == 200
    assert declined.json()["status"] == "declined"
    still_blocked = client.get(f"/api/trips/{trip['id']}", headers=auth_header(other))
    assert still_blocked.status_code == 403
    other_notes = client.get("/api/notifications", headers=auth_header(other)).json()
    assert any(n["kind"] == "join_declined" and n["trip_id"] == trip["id"] for n in other_notes)

    retry = client.post(f"/api/trips/{trip['id']}/join", headers=auth_header(other))
    assert retry.status_code == 200
    assert retry.json()["status"] == "pending"


def test_delete_trip_clears_join_notifications(client, traveler, other):
    headers = auth_header(traveler)
    trip = client.post(
        "/api/trips",
        json={
            "title": "Gone Tomorrow",
            "start_date": "2026-12-01",
            "end_date": "2026-12-03",
            "estimated_budget": 1000,
            "visibility": "public",
        },
        headers=headers,
    ).json()
    assert client.post(f"/api/trips/{trip['id']}/join", headers=auth_header(other)).json()["status"] == "pending"
    inbox = client.get("/api/notifications", headers=headers).json()
    assert any(n["trip_id"] == trip["id"] and n["kind"] == "join_request" for n in inbox)
    assert client.delete(f"/api/trips/{trip['id']}", headers=headers).status_code == 200
    after = client.get("/api/notifications", headers=headers).json()
    assert all(n.get("trip_id") != trip["id"] for n in after)


def test_share_location_roundtrip(client, traveler):
    headers = auth_header(traveler)
    trip = client.post(
        "/api/trips",
        json={"title": "Ping", "start_date": "2026-11-01", "end_date": "2026-11-03", "estimated_budget": 1},
        headers=headers,
    ).json()
    bad = client.post(f"/api/trips/{trip['id']}/location", json={}, headers=headers)
    assert bad.status_code == 400
    ok = client.post(
        f"/api/trips/{trip['id']}/location",
        json={"lat": 12.97, "lng": 77.59},
        headers=headers,
    )
    assert ok.status_code == 200
    listed = client.get(f"/api/trips/{trip['id']}/locations", headers=headers)
    assert listed.status_code == 200
    assert listed.json()[0]["lat"] == 12.97
    assert listed.json()[0]["user_id"] == traveler["user"]["id"]


def test_discover_bangalore_finds_nearby_coorg(client, traveler, other):
    headers = auth_header(traveler)
    trip = client.post(
        "/api/trips",
        json={
            "title": "Coorg Trek",
            "start_date": "2026-08-15",
            "end_date": "2026-08-18",
            "estimated_budget": 25000,
            "visibility": "public",
            "join_mode": "open",
        },
        headers=headers,
    ).json()
    dest = client.post(
        f"/api/trips/{trip['id']}/destinations",
        json={"city": "Madikeri", "country": "India", "arrival_date": "2026-08-15", "departure_date": "2026-08-18"},
        headers=headers,
    )
    assert dest.status_code == 201, dest.text
    found = client.get("/api/discover?city=Bangalore", headers=auth_header(other))
    assert found.status_code == 200
    assert any(t["id"] == trip["id"] for t in found.json())
    ranked = client.post(
        "/api/match/design",
        json={
            "destination": "Bangalore",
            "startDate": "2026-10-10",
            "endDate": "2026-10-16",
            "interests": [],
            "seatsNeeded": 1,
        },
        headers=auth_header(other),
    )
    assert ranked.status_code == 200
    hit = next(m for m in ranked.json()["matches"] if m["tripId"] == trip["id"])
    assert hit["isMember"] is False
    assert hit["isOwner"] is False
    assert hit["isPending"] is False

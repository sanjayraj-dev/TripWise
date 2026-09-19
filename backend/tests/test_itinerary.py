from tests.conftest import auth_header


def _trip_with_stop(client, traveler):
    headers = auth_header(traveler)
    trip = client.post(
        "/api/trips",
        json={"title": "Kyoto Draft", "start_date": "2026-11-01", "end_date": "2026-11-03", "estimated_budget": 40000},
        headers=headers,
    ).json()
    dest = client.post(
        f"/api/trips/{trip['id']}/destinations",
        json={"city": "Kyoto", "country": "Japan", "arrival_date": "2026-11-01", "departure_date": "2026-11-03"},
        headers=headers,
    ).json()
    return headers, trip, dest


def test_draft_is_preview_only(client, traveler, monkeypatch):
    monkeypatch.setattr("app.routers.itinerary.geocode", lambda *_a, **_k: (35.01, 135.76))
    monkeypatch.setattr("app.routers.itinerary.forecast", lambda *_a, **_k: [])
    monkeypatch.setattr("app.routers.itinerary.nearby_places", lambda *_a, **_k: [{"name": "Kiyomizu-dera"}])
    headers, trip, dest = _trip_with_stop(client, traveler)
    draft = client.post(
        f"/api/destinations/{dest['id']}/itinerary-draft",
        json={"style": "culture"},
        headers=headers,
    )
    assert draft.status_code == 200, draft.text
    body = draft.json()
    assert body["source"] in ("ai", "template")
    assert body["activities"]
    assert all("title" in a and "activity_date" in a and "category" in a for a in body["activities"])
    detail = client.get(f"/api/trips/{trip['id']}", headers=headers).json()
    assert detail["activities"] == []


def test_accept_selected_then_replace(client, traveler, monkeypatch):
    monkeypatch.setattr("app.routers.itinerary.geocode", lambda *_a, **_k: (35.01, 135.76))
    monkeypatch.setattr("app.routers.itinerary.forecast", lambda *_a, **_k: [])
    monkeypatch.setattr("app.routers.itinerary.nearby_places", lambda *_a, **_k: [])
    headers, trip, dest = _trip_with_stop(client, traveler)
    draft = client.post(
        f"/api/destinations/{dest['id']}/itinerary-draft",
        json={"style": "balanced"},
        headers=headers,
    ).json()
    first = draft["activities"][:2]
    accepted = client.post(
        f"/api/destinations/{dest['id']}/itinerary-draft/accept",
        json={"items": first, "replace": False},
        headers=headers,
    )
    assert accepted.status_code == 201, accepted.text
    assert len(accepted.json()["created"]) == 2
    again = client.post(
        f"/api/destinations/{dest['id']}/itinerary-draft/accept",
        json={"items": draft["activities"][:1], "replace": True},
        headers=headers,
    )
    assert again.status_code == 201
    detail = client.get(f"/api/trips/{trip['id']}", headers=headers).json()
    assert len(detail["activities"]) == 1


def test_manual_activity_crud(client, traveler):
    headers, trip, dest = _trip_with_stop(client, traveler)
    created = client.post(
        f"/api/destinations/{dest['id']}/activities",
        json={
            "title": "Fushimi Inari",
            "description": "Gates at dawn",
            "activity_date": "2026-11-01",
            "start_time": "07:00",
            "end_time": "09:30",
            "location": "Fushimi",
            "category": "Sightseeing",
        },
        headers=headers,
    )
    assert created.status_code == 201, created.text
    act_id = created.json()["id"]
    updated = client.put(
        f"/api/activities/{act_id}",
        json={"title": "Fushimi Inari early"},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Fushimi Inari early"
    deleted = client.delete(f"/api/activities/{act_id}", headers=headers)
    assert deleted.status_code == 200
    detail = client.get(f"/api/trips/{trip['id']}", headers=headers).json()
    assert detail["activities"] == []

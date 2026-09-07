from tests.conftest import auth_header


def test_join_public_group(client, traveler, other):
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
        },
        headers=headers,
    ).json()
    assert trip["visibility"] == "public"
    found = client.get("/api/discover", headers=auth_header(other))
    assert found.status_code == 200
    assert any(t["id"] == trip["id"] for t in found.json())
    joined = client.post(f"/api/trips/{trip['id']}/join", headers=auth_header(other))
    assert joined.status_code == 200
    assert joined.json()["status"] == "active"
    detail = client.get(f"/api/trips/{trip['id']}", headers=auth_header(other))
    assert detail.status_code == 200
    chat = client.post(
        f"/api/trips/{trip['id']}/messages",
        json={"body": "I'll take the early train."},
        headers=auth_header(other),
    )
    assert chat.status_code == 201

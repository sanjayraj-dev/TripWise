from app.models.user import User
from tests.conftest import auth_header


def test_route_map_json_after_join(client, traveler, other, monkeypatch):
    def geo(city, country=""):
        table = {"Tokyo": (35.68, 139.76), "Kyoto": (35.01, 135.77)}
        return table.get(city, (35.0, 135.0))

    def fake_drive(points):
        line = []
        (lat0, lng0), (lat1, lng1) = points[0], points[-1]
        for i in range(9):
            t = i / 8
            line.append([lat0 + (lat1 - lat0) * t, lng0 + (lng1 - lng0) * t])
        return {
            "geometry": line,
            "distanceKm": 360.0,
            "durationMin": 240,
            "legs": [{"fromIndex": 0, "toIndex": 1, "distanceKm": 360.0, "durationMin": 240}],
        }

    monkeypatch.setattr("app.routers.destinations.geocode", geo)
    monkeypatch.setattr("app.core.routing.osrm_drive", fake_drive)
    monkeypatch.setattr("app.core.routing.reverse_place", lambda lat, lng: "Nagoya")

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
    client.post(
        f"/api/trips/{trip['id']}/destinations",
        json={"city": "Tokyo", "country": "Japan", "arrival_date": "2026-10-10", "departure_date": "2026-10-12"},
        headers=headers,
    )
    client.post(
        f"/api/trips/{trip['id']}/destinations",
        json={"city": "Kyoto", "country": "Japan", "arrival_date": "2026-10-12", "departure_date": "2026-10-16"},
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

    res = client.get(f"/api/trips/{trip['id']}/route-map", headers=auth_header(other))
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["mode"] == "driving"
    assert body["source"] == "osrm"
    assert body["origin"]["city"] == "Tokyo"
    assert body["destination"]["city"] == "Kyoto"
    assert len(body["stops"]) == 2
    assert body["geometryPointCount"] >= 2
    assert body["distanceKm"] == 360.0
    labels = [c["label"] for c in body["corridor"]]
    assert labels[0] == "Tokyo"
    assert labels[-1] == "Kyoto"
    assert "Nagoya" in labels


def test_route_from_home_city_for_single_stop(client, traveler, other, db, monkeypatch):
    def geo(city, country=""):
        table = {
            "Osaka": (34.6937, 135.5023),
            "Bengaluru": (12.9716, 77.5946),
            "Bangalore": (12.9716, 77.5946),
        }
        return table.get(city, (None, None))

    monkeypatch.setattr("app.routers.destinations.geocode", geo)
    monkeypatch.setattr("app.core.routing.osrm_drive", lambda _points: None)

    other_user = db.query(User).filter(User.email == "other@tripwise.dev").first()
    other_user.home_city = "Bengaluru"
    db.commit()

    headers = auth_header(traveler)
    trip = client.post(
        "/api/trips",
        json={
            "title": "Osaka Food Crawl",
            "start_date": "2026-10-08",
            "end_date": "2026-10-12",
            "estimated_budget": 40000,
            "visibility": "public",
            "join_mode": "open",
        },
        headers=headers,
    ).json()
    dest = client.post(
        f"/api/trips/{trip['id']}/destinations",
        json={"city": "Osaka", "country": "Japan", "arrival_date": "2026-10-08", "departure_date": "2026-10-12"},
        headers=headers,
    )
    assert dest.status_code == 201, dest.text

    joined = client.post(f"/api/trips/{trip['id']}/join", headers=auth_header(other))
    assert joined.status_code == 200
    assert joined.json()["status"] == "pending"
    approved = client.post(
        f"/api/trips/{trip['id']}/members/{other['user']['id']}/approve",
        headers=headers,
    )
    assert approved.status_code == 200
    res = client.get(f"/api/trips/{trip['id']}/route-map", headers=auth_header(other))
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["origin"]["label"] == "Bengaluru"
    assert body["origin"]["kind"] == "home"
    assert body["destination"]["city"] == "Osaka"
    assert body["mode"] in ("flight", "mixed")
    assert body["flightGeometry"]
    assert len(body["vias"]) >= 1
    labels = [c["label"] for c in body["corridor"]]
    assert labels[0] == "Bengaluru"
    assert labels[-1] == "Osaka"


def test_gps_overrides_home_city(client, traveler, db, monkeypatch):
    def geo(city, country=""):
        if city == "Osaka":
            return (34.6937, 135.5023)
        if city in ("Bengaluru", "Bangalore"):
            return (12.9716, 77.5946)
        return (None, None)

    monkeypatch.setattr("app.routers.destinations.geocode", geo)
    monkeypatch.setattr("app.core.routing.osrm_drive", lambda _points: None)

    owner = db.query(User).filter(User.email == "test@tripwise.dev").first()
    owner.home_city = "Bengaluru"
    db.commit()

    headers = auth_header(traveler)
    trip = client.post(
        "/api/trips",
        json={"title": "Osaka", "start_date": "2026-10-01", "end_date": "2026-10-04", "estimated_budget": 10},
        headers=headers,
    ).json()
    client.post(
        f"/api/trips/{trip['id']}/destinations",
        json={"city": "Osaka", "country": "Japan", "arrival_date": "2026-10-01", "departure_date": "2026-10-04"},
        headers=headers,
    )
    res = client.get(
        f"/api/trips/{trip['id']}/route-map",
        params={"fromLat": 19.076, "fromLng": 72.877, "fromLabel": "You"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["origin"]["kind"] == "here"
    assert body["origin"]["label"] == "You"
    assert abs(body["origin"]["lat"] - 19.076) < 0.01

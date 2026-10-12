from app.ml.features import dest_sim
from tests.conftest import auth_header


def test_dest_sim_bangalore_near_coorg_not_kyoto():
    assert dest_sim("Bangalore", ["Madikeri"]) >= 0.75
    assert dest_sim("Bengaluru", ["Madikeri"]) >= 0.75
    assert dest_sim("Coorg", ["Madikeri"]) == 1.0
    assert dest_sim("Bangalore", ["Kyoto"]) <= 0.25
    assert dest_sim("Kyoto", ["Kyoto"]) == 1.0
    assert dest_sim("Kyoto", ["Osaka"]) >= 0.65
    assert dest_sim("Bangalore", ["Madikeri"]) > dest_sim("Bangalore", ["Kyoto"])


def _public_trip(client, headers, title, city, country, start, end, trip_type="culture", seats=2):
    trip = client.post(
        "/api/trips",
        json={
            "title": title,
            "start_date": start,
            "end_date": end,
            "estimated_budget": 50000,
            "trip_type": trip_type,
            "visibility": "public",
            "join_mode": "open",
            "seats": seats,
        },
        headers=headers,
    )
    assert trip.status_code == 201, trip.text
    body = trip.json()
    dest = client.post(
        f"/api/trips/{body['id']}/destinations",
        json={"city": city, "country": country, "arrival_date": start, "departure_date": end},
        headers=headers,
    )
    assert dest.status_code == 201, dest.text
    return body


def test_model_card(client, traveler):
    res = client.get("/api/match/model", headers=auth_header(traveler))
    assert res.status_code == 200, res.text
    card = res.json()
    assert card["algorithm"] == "RandomForestClassifier"
    assert card["nTrain"] > 1000
    assert card["metrics"]["forest"]["roc_auc"] >= card["metrics"]["linear"]["roc_auc"]
    names = [f["id"] for f in card["features"]]
    assert names == ["dest_sim", "overlap_frac", "tag_sim", "seats_ratio", "month_prox", "duration_sim"]


def test_design_ranks_overlap_above_far_trip(client, traveler, other):
    headers = auth_header(traveler)
    kyoto = _public_trip(client, headers, "Kyoto Autumn", "Kyoto", "Japan", "2026-10-10", "2026-10-16", "culture", 2)
    _public_trip(client, headers, "Osaka Food Crawl", "Osaka", "Japan", "2026-10-08", "2026-10-12", "leisure", 3)
    _public_trip(client, headers, "Lisbon Light", "Lisbon", "Portugal", "2026-12-12", "2026-12-18", "leisure", 3)

    ranked = client.post(
        "/api/match/design",
        json={
            "destination": "Kyoto",
            "startDate": "2026-10-10",
            "endDate": "2026-10-16",
            "interests": ["culture"],
            "seatsNeeded": 1,
        },
        headers=auth_header(other),
    )
    assert ranked.status_code == 200, ranked.text
    matches = ranked.json()["matches"]
    titles = [m["title"] for m in matches]
    assert titles[0] == "Kyoto Autumn"
    assert titles.index("Osaka Food Crawl") < titles.index("Lisbon Light")
    kyoto_hit = next(m for m in matches if m["tripId"] == kyoto["id"])
    assert kyoto_hit["bucket"] == "overlap"
    assert kyoto_hit["score"] >= 70
    assert kyoto_hit["signals"]
    assert {s["id"] for s in kyoto_hit["signals"]} >= {"dest_sim", "overlap_frac"}

    later = client.post(
        "/api/match/design",
        json={
            "destination": "Kyoto",
            "startDate": "2026-11-20",
            "endDate": "2026-11-25",
            "interests": ["culture"],
            "seatsNeeded": 1,
        },
        headers=auth_header(other),
    )
    assert later.status_code == 200
    later_hit = next(m for m in later.json()["matches"] if m["tripId"] == kyoto["id"])
    assert later_hit["overlapDays"] == 0
    assert later_hit["score"] < kyoto_hit["score"]


def test_design_ranks_bangalore_coorg_above_kyoto(client, traveler, other):
    headers = auth_header(traveler)
    coorg = _public_trip(client, headers, "Coorg Trek", "Madikeri", "India", "2026-08-15", "2026-08-18", "adventure", 4)
    kyoto = _public_trip(client, headers, "Kyoto Autumn", "Kyoto", "Japan", "2026-10-10", "2026-10-16", "culture", 2)

    ranked = client.post(
        "/api/match/design",
        json={
            "destination": "Bangalore",
            "startDate": "2026-10-10",
            "endDate": "2026-10-16",
            "interests": ["culture"],
            "seatsNeeded": 1,
        },
        headers=auth_header(other),
    )
    assert ranked.status_code == 200, ranked.text
    matches = ranked.json()["matches"]
    titles = [m["title"] for m in matches]
    assert titles.index("Coorg Trek") < titles.index("Kyoto Autumn")
    coorg_hit = next(m for m in matches if m["tripId"] == coorg["id"])
    kyoto_hit = next(m for m in matches if m["tripId"] == kyoto["id"])
    assert coorg_hit["destSim"] > kyoto_hit["destSim"]
    assert coorg_hit["score"] > kyoto_hit["score"]
    assert coorg_hit["bucket"] == "nearby"


def test_raw_score_aligned_beats_mismatch(client, traveler):
    aligned = client.post(
        "/api/match",
        json={"destSim": 1, "overlapFrac": 1, "tagSim": 1, "seatsRatio": 1, "monthProx": 1, "durationSim": 1},
        headers=auth_header(traveler),
    )
    clash = client.post(
        "/api/match",
        json={"destSim": 1, "overlapFrac": 1, "tagSim": 0, "seatsRatio": 1, "monthProx": 1, "durationSim": 1},
        headers=auth_header(traveler),
    )
    far = client.post(
        "/api/match",
        json={"destSim": 0.15, "overlapFrac": 0, "tagSim": 0.4, "seatsRatio": 0.5, "monthProx": 0.5, "durationSim": 0.5},
        headers=auth_header(traveler),
    )
    assert aligned.status_code == 200
    assert aligned.json()["score"] > clash.json()["score"]
    assert clash.json()["score"] > far.json()["score"]

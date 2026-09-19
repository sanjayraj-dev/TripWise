from tests.conftest import auth_header


def test_register_and_me(client, traveler):
    me = client.get("/api/auth/me", headers=auth_header(traveler))
    assert me.status_code == 200
    body = me.json()
    assert body["email"] == "test@tripwise.dev"
    assert body["role"] == "traveler"


def test_duplicate_email(client, traveler):
    res = client.post(
        "/api/auth/register",
        json={"full_name": "Copy", "email": "test@tripwise.dev", "password": "TripWise@123"},
    )
    assert res.status_code == 409


def test_weak_password(client):
    res = client.post(
        "/api/auth/register",
        json={"full_name": "Weak", "email": "weak@tripwise.dev", "password": "password"},
    )
    assert res.status_code == 400


def test_bad_login(client, traveler):
    res = client.post("/api/auth/login", json={"email": "test@tripwise.dev", "password": "Nope@1234"})
    assert res.status_code == 401
    assert "Invalid" in res.json()["detail"]


def test_logout_invalidates_token(client, traveler):
    headers = auth_header(traveler)
    assert client.get("/api/auth/me", headers=headers).status_code == 200
    out = client.post("/api/auth/logout", headers=headers)
    assert out.status_code == 200
    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 401


def test_session_policy(client):
    res = client.get("/api/auth/session")
    assert res.status_code == 200
    assert res.json()["inactivity_timeout_minutes"] >= 1


def test_change_password(client, traveler):
    headers = auth_header(traveler)
    res = client.post(
        "/api/profile/password",
        json={"current_password": "TripWise@123", "new_password": "NewPass@123"},
        headers=headers,
    )
    assert res.status_code == 200
    bad = client.post("/api/auth/login", json={"email": "test@tripwise.dev", "password": "TripWise@123"})
    assert bad.status_code == 401
    good = client.post("/api/auth/login", json={"email": "test@tripwise.dev", "password": "NewPass@123"})
    assert good.status_code == 200

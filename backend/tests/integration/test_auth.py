"""X-API-Key enforcement on /tasks* (see ARCHITECTURE.md section 10)."""
from fastapi.testclient import TestClient


def test_missing_key_returns_401(app):
    resp = TestClient(app).get("/tasks")
    assert resp.status_code == 401


def test_invalid_key_returns_401(app):
    resp = TestClient(app, headers={"X-API-Key": "wrong"}).get("/tasks")
    assert resp.status_code == 401


def test_non_ascii_key_returns_401_not_500(app):
    # Header value is sent as latin-1 bytes, matching how a real ASGI
    # server decodes raw header bytes into a (possibly non-ASCII) str.
    resp = TestClient(app, headers={"X-API-Key": "kéy".encode("latin-1")}).get("/tasks")
    assert resp.status_code == 401


def test_valid_key_returns_200(client):
    resp = client.get("/tasks")
    assert resp.status_code == 200

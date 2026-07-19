"""GET /health must stay public even though the shared `client` fixture
always attaches an API key -- build a bare client to prove that."""
from fastapi.testclient import TestClient


def test_health_is_public(app):
    resp = TestClient(app).get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

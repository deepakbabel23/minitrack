"""Verification test for DELETE /tasks/{id} (see spec.md).

Uses the shared `client` fixture from tests/conftest.py, which
authenticates with X-API-Key and points at an isolated temp DB. This
replaced a local tmp_path + monkeypatch fixture once /tasks became
key-protected (see ARCHITECTURE.md section 13, step 8).
"""


def test_delete_task_removes_it(client):
    created = client.post("/tasks", json={"title": "temp", "priority": "low"})
    task_id = created.json()["id"]

    # delete succeeds with 204 and no body
    resp = client.delete(f"/tasks/{task_id}")
    assert resp.status_code == 204
    assert resp.content == b""

    # the task is really gone
    assert client.get(f"/tasks/{task_id}").status_code == 404


def test_delete_missing_task_returns_404(client):
    assert client.delete("/tasks/9999").status_code == 404

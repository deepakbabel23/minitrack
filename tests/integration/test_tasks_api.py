"""Integration tests for the /tasks CRUD surface, driven end-to-end
through TestClient (see ARCHITECTURE.md sections 7 and 12)."""


def test_create_and_get_task(client):
    created = client.post("/tasks", json={"title": "write spec", "priority": "high"})
    assert created.status_code == 201
    task = created.json()
    assert task["title"] == "write spec"
    assert task["priority"] == "high"
    assert task["completed"] is False

    fetched = client.get(f"/tasks/{task['id']}")
    assert fetched.status_code == 200
    assert fetched.json() == task


def test_get_missing_task_returns_404(client):
    resp = client.get("/tasks/9999")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Task not found"


def test_blank_title_returns_422(client):
    resp = client.post("/tasks", json={"title": "   "})
    assert resp.status_code == 422


def test_invalid_priority_returns_422(client):
    resp = client.post("/tasks", json={"title": "valid", "priority": "urgent"})
    assert resp.status_code == 422


def test_update_task(client):
    created = client.post("/tasks", json={"title": "old", "priority": "low"}).json()
    updated = client.patch(f"/tasks/{created['id']}", json={"title": "new", "priority": "high"})
    assert updated.status_code == 200
    assert updated.json()["title"] == "new"
    assert updated.json()["priority"] == "high"


def test_update_missing_task_returns_404(client):
    resp = client.patch("/tasks/9999", json={"title": "x"})
    assert resp.status_code == 404


def test_complete_task(client):
    created = client.post("/tasks", json={"title": "finish me"}).json()
    completed = client.post(f"/tasks/{created['id']}/complete")
    assert completed.status_code == 200
    assert completed.json()["completed"] is True


def test_complete_missing_task_returns_404(client):
    resp = client.post("/tasks/9999/complete")
    assert resp.status_code == 404


def test_delete_task(client):
    created = client.post("/tasks", json={"title": "temp", "priority": "low"}).json()
    resp = client.delete(f"/tasks/{created['id']}")
    assert resp.status_code == 204
    assert resp.content == b""
    assert client.get(f"/tasks/{created['id']}").status_code == 404


def test_delete_missing_task_returns_404(client):
    resp = client.delete("/tasks/9999")
    assert resp.status_code == 404


def test_completed_filter(client):
    a = client.post("/tasks", json={"title": "a"}).json()
    client.post("/tasks", json={"title": "b"})
    client.post(f"/tasks/{a['id']}/complete")

    done = client.get("/tasks", params={"completed": "true"}).json()
    pending = client.get("/tasks", params={"completed": "false"}).json()

    assert [t["title"] for t in done] == ["a"]
    assert [t["title"] for t in pending] == ["b"]


def test_list_tasks_without_filter_returns_all(client):
    client.post("/tasks", json={"title": "a"})
    client.post("/tasks", json={"title": "b"})
    resp = client.get("/tasks")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_pagination_limit(client):
    for i in range(5):
        client.post("/tasks", json={"title": f"task {i}"})
    resp = client.get("/tasks", params={"limit": 2})
    assert len(resp.json()) == 2


def test_limit_out_of_range_returns_422(client):
    resp = client.get("/tasks", params={"limit": 500})
    assert resp.status_code == 422


def test_negative_offset_returns_422(client):
    resp = client.get("/tasks", params={"offset": -1})
    assert resp.status_code == 422

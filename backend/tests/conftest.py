"""Shared fixtures for the MiniTrack test suite (see ARCHITECTURE.md section 12).

Every test gets an isolated temp DB and a known API key via the autouse
`_env` fixture, which points app.core.config.get_settings at that
environment. tests/test_seed_data.py predates this and isolates itself
via `monkeypatch.setattr(db, "DB_PATH", ...)` instead -- both mechanisms
can coexist because that test never builds the FastAPI app.
"""
import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app

API_KEY = "test-api-key"


@pytest.fixture(autouse=True)
def _env(tmp_path, monkeypatch):
    monkeypatch.setenv("MINITRACK_API_KEYS", API_KEY)
    monkeypatch.setenv("MINITRACK_DB_PATH", str(tmp_path / "test_minitrack.db"))
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def api_key() -> str:
    return API_KEY


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
def client(app, api_key):
    return TestClient(app, headers={"X-API-Key": api_key})


class FakeTaskRepository:
    """In-memory stand-in for TaskRepository, for pure service unit tests."""

    def __init__(self):
        self._tasks: dict[int, dict] = {}
        self._next_id = 1

    def list_tasks(self, completed=None, limit=None, offset=0):
        rows = [
            t for t in self._tasks.values() if completed is None or t["completed"] == completed
        ]
        rows.sort(key=lambda t: t["id"])
        if limit is not None:
            rows = rows[offset : offset + limit]
        return [dict(r) for r in rows]

    def get_task(self, task_id):
        task = self._tasks.get(task_id)
        return dict(task) if task else None

    def create_task(self, title, description, priority):
        task_id = self._next_id
        self._next_id += 1
        task = {
            "id": task_id,
            "title": title,
            "description": description,
            "priority": priority,
            "completed": False,
        }
        self._tasks[task_id] = task
        return dict(task)

    def update_task(self, task_id, title, description, priority):
        if task_id not in self._tasks:
            return None
        self._tasks[task_id].update(title=title, description=description, priority=priority)
        return dict(self._tasks[task_id])

    def set_completed(self, task_id, completed):
        if task_id not in self._tasks:
            return None
        self._tasks[task_id]["completed"] = completed
        return dict(self._tasks[task_id])

    def delete_task(self, task_id):
        return self._tasks.pop(task_id, None) is not None


@pytest.fixture
def fake_repo():
    return FakeTaskRepository()

"""Deprecated compatibility facade over app.data.

Kept so existing callers (seed_data.py, tests/test_seed_data.py) that
import `app.db` and monkeypatch `db.DB_PATH` keep working unchanged.
`DB_PATH` is read at call time via the closure below, which is exactly
what makes `monkeypatch.setattr(db, "DB_PATH", ...)` still work.

New code should go through app.api.deps / app.services.task_service
instead -- see ARCHITECTURE.md section 6.
"""
from pathlib import Path
from typing import Optional

from app.data.database import get_connection, init_schema
from app.data.task_repository import TaskRepository

DB_PATH = Path(__file__).resolve().parent.parent / "minitrack.db"


def _repo() -> TaskRepository:
    return TaskRepository(lambda: get_connection(DB_PATH))


def init_db() -> None:
    init_schema(DB_PATH)


def get_all_tasks() -> list[dict]:
    return _repo().list_tasks()


def get_task(task_id: int) -> Optional[dict]:
    return _repo().get_task(task_id)


def create_task(title: str, description: Optional[str], priority: str) -> dict:
    return _repo().create_task(title, description, priority)


def update_task(
    task_id: int, title: str, description: Optional[str], priority: str
) -> Optional[dict]:
    return _repo().update_task(task_id, title, description, priority)


def set_completed(task_id: int, completed: bool) -> Optional[dict]:
    return _repo().set_completed(task_id, completed)


def delete_task(task_id: int) -> bool:
    return _repo().delete_task(task_id)

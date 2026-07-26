"""Deprecated compatibility facade over app.data.

Kept so the two callers that predate the layered refactor -- seed_data.py and
tests/test_seed_data.py -- keep working unchanged. Both import `app.db` and the
test monkeypatches `db.DB_PATH`; that works because every function below reads
the module global at call time, the ordinary way Python resolves globals.

This facade is on no HTTP request path. New code goes through app.api.deps /
app.services.task_service instead -- see ARCHITECTURE.md section 6.

Deliberately narrow: only the three functions those two callers actually use are
exposed. `get_task`, `update_task`, `set_completed` and `delete_task` were also
forwarded here once, with no callers anywhere; use TaskRepository directly if you
need them.
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


def create_task(title: str, description: Optional[str], priority: str) -> dict:
    return _repo().create_task(title, description, priority)

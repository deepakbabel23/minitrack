"""
Tiny SQLite data layer for MiniTrack.

Plain sqlite3 from the standard library — no ORM, no server, no Docker,
no API keys. The database file (minitrack.db) is created on first run in
the project root and is gitignored.
"""
import sqlite3
from pathlib import Path
from typing import Optional

DB_PATH = Path(__file__).resolve().parent.parent / "minitrack.db"


_SCHEMA = """
    CREATE TABLE IF NOT EXISTS tasks (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        title       TEXT    NOT NULL,
        description TEXT,
        priority    TEXT    NOT NULL DEFAULT 'medium',
        completed   INTEGER NOT NULL DEFAULT 0
    )
"""


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # Ensure the schema exists. Cheap (IF NOT EXISTS) and makes the app work
    # whether started via uvicorn or driven directly by a test client.
    conn.execute(_SCHEMA)
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.execute(_SCHEMA)


def _row_to_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"],
        "priority": row["priority"],
        "completed": bool(row["completed"]),
    }


def get_all_tasks() -> list[dict]:
    with _connect() as conn:
        rows = conn.execute("SELECT * FROM tasks ORDER BY id").fetchall()
        return [_row_to_dict(r) for r in rows]


def get_task(task_id: int) -> Optional[dict]:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        return _row_to_dict(row) if row else None


def create_task(title: str, description: Optional[str], priority: str) -> dict:
    with _connect() as conn:
        cur = conn.execute(
            "INSERT INTO tasks (title, description, priority) VALUES (?, ?, ?)",
            (title, description, priority),
        )
        conn.commit()
        new_id = cur.lastrowid
    return get_task(new_id)  # type: ignore[return-value]


def update_task(
    task_id: int, title: str, description: Optional[str], priority: str
) -> Optional[dict]:
    if get_task(task_id) is None:
        return None
    with _connect() as conn:
        conn.execute(
            "UPDATE tasks SET title = ?, description = ?, priority = ? WHERE id = ?",
            (title, description, priority, task_id),
        )
        conn.commit()
    return get_task(task_id)


def set_completed(task_id: int, completed: bool) -> Optional[dict]:
    if get_task(task_id) is None:
        return None
    with _connect() as conn:
        conn.execute(
            "UPDATE tasks SET completed = ? WHERE id = ?",
            (1 if completed else 0, task_id),
        )
        conn.commit()
    return get_task(task_id)


# GAP #1 (Lab 3.1): no delete_task() helper exists yet. Claude will add one
# alongside the DELETE /tasks/{task_id} endpoint.

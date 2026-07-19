"""The only module that issues SQL for tasks.

Returns plain dict/None/bool -- it never raises HTTP errors. That
translation is the service layer's job (see ARCHITECTURE.md section 5).
Method names are 1:1 with the original app/db.py functions so the
migration mapping is obvious.
"""
import sqlite3
from typing import Callable, ContextManager, Optional

ConnectionFactory = Callable[[], ContextManager[sqlite3.Connection]]


class TaskRepository:
    def __init__(self, connection_factory: ConnectionFactory):
        self._connect = connection_factory

    def list_tasks(
        self,
        completed: Optional[bool] = None,
        limit: Optional[int] = None,
        offset: int = 0,
    ) -> list[dict]:
        query = "SELECT * FROM tasks"
        params: list = []
        if completed is not None:
            query += " WHERE completed = ?"
            params.append(1 if completed else 0)
        query += " ORDER BY id"
        if limit is not None:
            query += " LIMIT ? OFFSET ?"
            params.extend([limit, offset])
        with self._connect() as conn:
            rows = conn.execute(query, params).fetchall()
        return [_row_to_dict(row) for row in rows]

    def get_task(self, task_id: int) -> Optional[dict]:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        return _row_to_dict(row) if row else None

    def create_task(self, title: str, description: Optional[str], priority: str) -> dict:
        with self._connect() as conn:
            cur = conn.execute(
                "INSERT INTO tasks (title, description, priority) VALUES (?, ?, ?)",
                (title, description, priority),
            )
            new_id = cur.lastrowid
        return self.get_task(new_id)

    def update_task(
        self, task_id: int, title: str, description: Optional[str], priority: str
    ) -> Optional[dict]:
        if self.get_task(task_id) is None:
            return None
        with self._connect() as conn:
            conn.execute(
                "UPDATE tasks SET title = ?, description = ?, priority = ? WHERE id = ?",
                (title, description, priority, task_id),
            )
        return self.get_task(task_id)

    def set_completed(self, task_id: int, completed: bool) -> Optional[dict]:
        if self.get_task(task_id) is None:
            return None
        with self._connect() as conn:
            conn.execute(
                "UPDATE tasks SET completed = ? WHERE id = ?",
                (1 if completed else 0, task_id),
            )
        return self.get_task(task_id)

    def delete_task(self, task_id: int) -> bool:
        if self.get_task(task_id) is None:
            return False
        with self._connect() as conn:
            conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        return True


def _row_to_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"],
        "priority": row["priority"],
        "completed": bool(row["completed"]),
    }

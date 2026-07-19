"""SQLite connection management + schema.

The only module that opens a `sqlite3.Connection`. Kept deliberately
simple: one short-lived connection per operation (see ARCHITECTURE.md
section 6 for why -- FastAPI runs sync endpoints in a threadpool, and a
shared long-lived connection would need extra locking).
"""
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

_SCHEMA = """
    CREATE TABLE IF NOT EXISTS tasks (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        title       TEXT    NOT NULL,
        description TEXT,
        priority    TEXT    NOT NULL DEFAULT 'medium',
        completed   INTEGER NOT NULL DEFAULT 0
    )
"""


def connect(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    # Cheap (IF NOT EXISTS) and self-healing: works whether the app was
    # started via uvicorn's lifespan or driven directly by a test client.
    conn.execute(_SCHEMA)
    return conn


@contextmanager
def get_connection(db_path: Path) -> Iterator[sqlite3.Connection]:
    conn = connect(db_path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_schema(db_path: Path) -> None:
    with get_connection(db_path) as conn:
        conn.execute(_SCHEMA)

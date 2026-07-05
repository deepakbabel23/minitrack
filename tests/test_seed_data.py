"""Verification test for the seed data (see spec.md).

Confirms that after seeding, every demo task defined in seed_data.DEMO is
present in the database. Runs against an isolated temporary DB so it never
touches the real minitrack.db.
"""
import pytest

from app import db
from seed_data import DEMO


@pytest.fixture
def temp_db(tmp_path, monkeypatch):
    """Point the data layer at a throwaway DB for the duration of the test."""
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "test_minitrack.db")
    db.init_db()
    return db.DB_PATH


def _seed():
    """Run the same insert the seeder does."""
    db.init_db()
    for title, desc, prio in DEMO:
        db.create_task(title=title, description=desc, priority=prio)


def test_seed_data_present_in_db(temp_db):
    _seed()
    tasks = db.get_all_tasks()

    for title, _desc, priority in DEMO:
        match = any(
            t["title"] == title
            and t["priority"] == priority
            and t["completed"] is False
            for t in tasks
        )
        assert match, f"seed task not found in DB: {title!r} ({priority})"

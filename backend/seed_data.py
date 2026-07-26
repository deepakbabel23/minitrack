"""Optional: load a handful of demo tasks so /tasks isn't empty in the demo.

    python seed_data.py
"""
from app import db

DEMO = [
    ("Set up project board", "Create columns: Todo / Doing / Done", "high"),
    ("Write onboarding doc", "Short README for new teammates", "medium"),
    ("Fix flaky login test", None, "high"),
    ("Tidy up old branches", "Delete merged feature branches", "low"),
]

if __name__ == "__main__":
    db.init_db()
    for title, desc, prio in DEMO:
        db.create_task(title=title, description=desc, priority=prio)
    print(f"Seeded {len(DEMO)} tasks into {db.DB_PATH}")

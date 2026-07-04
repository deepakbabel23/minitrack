# MiniTrack — Claude Code project context

MiniTrack is a minimalist team task tracker (FastAPI + SQLite). It is the Day 3
practice repo for K21 Academy Course 2606. Keep it small and readable.

## Stack & layout
- Python 3.11+, FastAPI, plain `sqlite3` (no ORM, no Docker, **no API keys**).
- `app/main.py` — routes + Pydantic schemas.
- `app/db.py` — the only place that talks to SQLite.
- `tests/` — pytest suite (created during the lab; may not exist yet).
- The DB file `minitrack.db` is created on first run and is gitignored.

## Commands
- Install:  `pip install -r requirements.txt`
- Run:      `uvicorn app.main:app --reload`  → docs at http://127.0.0.1:8000/docs
- Seed:     `python seed_data.py`
- Test:     `pytest -q`

## Conventions
- All database access goes through `app/db.py`. Routes never open SQLite directly.
- Endpoints return the affected task as JSON; missing IDs raise `HTTPException(404)`.
- Prefer FastAPI/Pydantic idioms (typed request models, `response_model`).
- Keep functions small; match the existing style in `main.py` and `db.py`.

## Definition of done (for any change)
YOU MUST give every change a way to be verified:
- A new endpoint ships with at least one pytest test.
- `pytest -q` passes before a change is considered complete.
- Run the app and hit `/docs` to confirm new routes appear.

## Known gaps (intentional — these are the lab targets)
1. No `DELETE /tasks/{id}` endpoint (and no `db.delete_task`).
2. `POST /tasks` does not validate input (blank title, free-form priority).
3. No tests yet.
4. The `completed` query param on `GET /tasks` is accepted but ignored.

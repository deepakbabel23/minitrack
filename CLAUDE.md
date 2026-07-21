# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

MiniTrack is a FastAPI + SQLite task tracker built as the Day 3 practice repo for K21 Academy *Course 2606: Claude AI*, Module 3. It shipped as a deliberately tiny, deliberately incomplete two-file app and has since been refactored into a layered backend (routing / schemas / services / data / core) via the **Plan → Implement → Review → Verify (PIRV)** loop the labs teach. See [ARCHITECTURE.md](ARCHITECTURE.md) for the full design and migration history, and [spec.md](spec.md) for the behavioral contracts the `code-reviewer` subagent checks against.

If you're extending MiniTrack further, keep following PIRV rather than making the smallest possible edit: plan the change, implement it in the right layer, review it, and verify it with a test.

## Commands

This machine defaults to Python 3.14, but the project venv must be **3.12** (`/opt/homebrew/bin/python3.12`). Use the existing `.venv`:

```bash
source .venv/bin/activate
pip install -r requirements.txt                 # first-time setup
cp .env.example .env                            # set MINITRACK_API_KEYS or /tasks* returns 401
uvicorn app.main:app --reload --env-file .env   # run; docs at http://127.0.0.1:8000/docs
python seed_data.py                             # optional: load demo tasks
pytest -q                                       # run the full suite (unit + integration)
pytest -q tests/test_x.py::test_name            # run a single test
```

## Architecture

Layered backend — routing, business logic, and persistence live in separate modules so each has one reason to change. Full design in [ARCHITECTURE.md](ARCHITECTURE.md); the short version:

- `app/api/routes/` — FastAPI routers (`health.py`, `tasks.py`). HTTP concerns only: no SQL, no manual `if x is None: raise`.
- `app/schemas/` — Pydantic request/response models (`TaskIn`, `Task`, `Priority`, `TaskListQuery`) and all input validation.
- `app/services/task_service.py` — business logic. Framework-agnostic (no FastAPI import); raises domain exceptions (`TaskNotFound`) instead of touching HTTP.
- `app/data/` — the *only* code that touches SQLite (`TaskRepository`, `database.py`). Returns plain `dict`/`None`/`bool`, never raises HTTP errors.
- `app/core/` — cross-cutting concerns: `config.py` (`Settings`/`get_settings`), `logging.py`, `security.py` (`X-API-Key` auth), `errors.py` (the single place domain exceptions map to HTTP status codes), `middleware.py` (request-id + access log).
- `app/db.py` — deprecated compatibility facade. Kept only so `seed_data.py` and the legacy `tests/test_seed_data.py` (which monkeypatch `db.DB_PATH`) keep working unchanged.

Keep that boundary when adding features: persistence logic goes in `app/data/` and returns `dict`/`None`/`bool`; business rules go in `app/services/`; HTTP wiring goes in `app/api/`. The repository's "check existence, mutate, re-fetch, return the fresh dict" pattern (see `TaskRepository`) is the convention to mirror.

The SQLite file `minitrack.db` is created in the project root on first run and is gitignored — safe to delete to reset state.

## Stack constraints

Standard-library `sqlite3` only — **no ORM, no Docker, no external services**. Keep new code within FastAPI + Pydantic + stdlib + pytest. The app's own `X-API-Key` auth (configured via `MINITRACK_API_KEYS`/`.env`) is unrelated to this constraint — the labs still run on a Claude Pro subscription, not the Anthropic API, and no Anthropic API key is ever needed.

## History

This repo originally shipped with four intentional gaps as Lab 3.1/stretch-goal exercises: no `DELETE /tasks/{id}` endpoint, no input validation on create, no tests, and an ignored `completed` filter on `GET /tasks`. All four have been closed — see [ARCHITECTURE.md](ARCHITECTURE.md) section 13 for the migration sequence that closed them and [spec.md](spec.md) for the resulting behavioral contracts (seed data, delete, validation, the `completed` filter, and API-key auth).

## Subagents

- [.claude/agents/frontend-reviewer.md](.claude/agents/frontend-reviewer.md) is the one subagent checked into this repo: a read-only reviewer used in the *Review* step for `frontend/`. It encodes the backend contract as a checklist — invented features, endpoint usage, the full-replacement PATCH, API-key safety, error/loading/empty states, accessibility, Load-more semantics, tests — and reports `file:line` findings without editing code.
- The `code-reviewer` and `scaffold-router` agents referenced elsewhere in the docs are **lab exercises, not files in this repo** — you build them yourself during Module 3. `code-reviewer` is the read-only Python reviewer used in the *Review* step (correctness vs. the goal, missing 404s/edge cases, validation gaps, whether a test exists and `pytest -q` passes; it ignores style nits). `scaffold-router` is the *Implement*-step agent that scaffolds a new REST resource across every layer in dependency order, mirroring the existing `tasks` resource.

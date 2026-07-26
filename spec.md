# SPEC

Source-of-truth specification for MiniTrack tasks — the behavioral contracts a
*Review*-step pass checks changes against. (The `code-reviewer` agent used for
that pass is built during the Module 3 lab; it is not checked into this repo.
The one agent that is, `frontend-reviewer`, covers `frontend/`.)

## Seed data

**Goal:** Load demo tasks into `minitrack.db` so `GET /tasks` is non-empty for
demos and labs.

**Source of truth:** the `DEMO` list in [seed_data.py](backend/seed_data.py) — 4 tasks:

| Title | Priority |
|---|---|
| Set up project board | high |
| Write onboarding doc | medium |
| Fix flaky login test | high |
| Tidy up old branches | low |

**How to seed:**
```bash
cd backend && source .venv/bin/activate
python seed_data.py
```
Seeding **appends** (no dedup); re-running adds another copy of the 4 tasks.

**Evaluation criteria:** After seeding, for every `(title, priority)` pair in
`DEMO`, at least one matching task exists in the DB (via `TaskRepository.list_tasks`)
with `completed == False`. The criterion is presence-based, not an exact row
count, so it holds even when the DB already contained other rows.

Verified by `tests/test_seed_data.py`.

## Delete task

**Goal:** Allow removing a task by id (closes intentional gap #1).

**Contract:** `DELETE /tasks/{id}`
- Success → **204 No Content** with an empty body; the row is removed, so a
  follow-up `GET /tasks/{id}` returns **404**.
- Unknown id → **404** (`{"detail": "Task not found"}`).

**Data layer:** `TaskRepository.delete_task(task_id)` returns `True` if a row was deleted,
`False` if the id didn't exist — no HTTP concerns in the DB layer.

Verified by `tests/test_delete_task.py`.

## Input validation

**Goal:** Reject blank titles and unconstrained priority values on task
creation/update (closes intentional gap #2).

**Contract:** `POST /tasks` and `PATCH /tasks/{id}` validate the JSON body via
`TaskIn`:
- `title` is stripped of surrounding whitespace and must be non-empty after
  stripping.
- `priority` must be one of `low`, `medium`, `high`; any other value is
  rejected.
- Invalid input → **422** with `{"detail": "<field path>: <message>",
  "request_id": "..."}`.

**Data layer:** validation lives entirely in `app/schemas/task.py` (`TaskIn`,
`Priority`) — the repository never sees an invalid value.

Verified by `tests/unit/test_schemas.py` and `tests/integration/test_tasks_api.py`.

## Completed filter

**Goal:** `GET /tasks?completed=` actually filters instead of being ignored
(closes the stretch-goal gap).

**Contract:** `GET /tasks`
- `completed` (optional bool) — when present, only tasks with a matching
  `completed` value are returned; when absent, all tasks are returned
  (unchanged from before).
- `limit` (default 50, range 1–200) and `offset` (default 0) — pagination,
  added alongside the filter.

**Data layer:** `TaskRepository.list_tasks(completed, limit, offset)` builds
the `WHERE`/`LIMIT`/`OFFSET` clause with parameterized SQL — no HTTP concerns.

Verified by `tests/integration/test_tasks_api.py` (`test_completed_filter`,
`test_list_tasks_without_filter_returns_all`, `test_pagination_limit`) and
`tests/unit/test_task_service.py` (`test_list_tasks_honors_completed_filter`).

## API key authentication

**Goal:** Protect the task endpoints behind a header API key.

**Contract:** every `/tasks*` route requires header `X-API-Key: <key>`
matching one of the comma-separated values in `MINITRACK_API_KEYS`.
- Missing or invalid key → **401** `{"detail": "Invalid or missing API
  key"}`.
- `GET /health` and the OpenAPI docs (`/docs`, `/redoc`, `/openapi.json`)
  remain public.

**Data layer:** no involvement — enforced entirely in `app/core/security.py`
via a router-level FastAPI dependency; the repository and service layers are
unaware of auth.

Verified by `tests/integration/test_auth.py`.

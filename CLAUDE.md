# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

MiniTrack is a FastAPI + SQLite task tracker built as the Day 3 practice repo for K21 Academy *Course 2606: Claude AI*, Module 3. It shipped as a deliberately tiny, deliberately incomplete two-file app and has since been refactored into a layered backend (routing / schemas / services / data / core) via the **Plan → Implement → Review → Verify (PIRV)** loop the labs teach. See [ARCHITECTURE.md](ARCHITECTURE.md) for the full design and migration history, and [spec.md](spec.md) for the behavioral contracts.

The repo is three peer modules, each with its own dependencies and its own test suite:

| Module | Stack | Suite |
|---|---|---|
| [backend/](backend/) | Python · FastAPI · stdlib `sqlite3` | `cd backend && pytest -q` — 54 tests |
| [frontend/](frontend/) | React · Vite · TypeScript | `cd frontend && npm test` — 86 tests |
| [e2e/](e2e/) | Playwright | `cd e2e && npx playwright test` — 16 tests |

**This file covers `backend/`, the database, and repo-wide tooling.** When working
under `frontend/`, read [frontend/CLAUDE.md](frontend/CLAUDE.md) as well; for the
end-to-end suite and the Playwright agents, read [e2e/README.md](e2e/README.md).

If you're extending MiniTrack further, keep following PIRV rather than making the smallest possible edit: plan the change, implement it in the right layer, review it, and verify it with a test.

## Tech stack — exact versions

> **The lockfiles are authoritative, not this table.** [backend/requirements.txt](backend/requirements.txt),
> [frontend/package-lock.json](frontend/package-lock.json) and
> [e2e/package-lock.json](e2e/package-lock.json) win any disagreement — re-read them and
> correct this table. **Never state a version you have not read from a lockfile,
> `pip freeze`, or `npm ls`.**

### Runtime / toolchain

| | Version | Pinned where |
|---|---|---|
| Python | **3.12.12** (Homebrew `python@3.12`) | [.python-version](backend/.python-version) = `3.12` |
| SQLite library | **3.53.3** (`sqlite3.sqlite_version`) | stdlib — follows the interpreter |
| `sqlite3` DB-API adapter | 2.6.0 (deprecated attribute; removed in Python 3.14) | stdlib |
| Node | v24.12.0 | **unpinned** — no `engines`, no `.nvmrc` (`e2e/` declares `>=20`) |
| npm | 11.6.2 | unpinned |

### Backend (Python)

`backend/requirements.txt` pins five packages; everything else is transitive. Versions below are from `backend/.venv/bin/pip freeze`.

| Package | Version | Direct? |
|---|---|---|
| fastapi | **0.115.6** | pinned |
| uvicorn[standard] | **0.34.0** | pinned |
| pydantic | **2.10.4** | pinned |
| httpx | **0.28.1** | pinned — required by `fastapi.testclient` |
| pytest | **8.3.4** | pinned |
| starlette | 0.41.3 | transitive (via fastapi) |
| pydantic_core | 2.27.2 | transitive (via pydantic) |
| anyio | 4.14.1 | transitive |
| python-dotenv | 1.2.2 | transitive, via `uvicorn[standard]` |

Also installed via `uvicorn[standard]`: `uvloop` 0.22.1, `watchfiles` 1.2.0, `websockets` 16.0, `httptools` 0.8.0, `PyYAML` 6.0.3, `click` 8.4.2. Total environment is 24 packages — there is no `requirements-dev.txt`.

### Frontend (npm)

Declared range → what the lockfile actually resolved. Seven have drifted above their declared floor; quote the **resolved** column.

| Package | Declared | Resolved |
|---|---|---|
| react / react-dom | `^19.2.7` | **19.2.8** ← drifted |
| react-router-dom | `^7.18.1` | **7.18.1** |
| vite | `^8.1.1` | **8.1.5** ← drifted |
| @vitejs/plugin-react | `^6.0.3` | **6.0.4** ← drifted |
| typescript | `~6.0.2` | **6.0.3** ← drifted |
| vitest | `^4.1.10` | **4.1.10** |
| jsdom | `^29.1.1` | **29.1.1** |
| oxlint | `^1.71.0` | **1.75.0** ← drifted |
| @testing-library/react | `^16.3.2` | **16.3.2** |
| @testing-library/jest-dom | `^6.9.1` | **6.9.1** |
| @testing-library/user-event | `^14.6.1` | **14.6.1** |
| @types/node | `^24.13.2` | **24.13.3** ← drifted |
| @types/react / @types/react-dom | `^19.2.17` / `^19.2.3` | **19.2.17** / **19.2.3** |

That is the complete list: 3 runtime dependencies, 12 devDependencies, nothing else.

### End-to-end / automation testing

| | Version | Where |
|---|---|---|
| @playwright/test | **1.62.0** (`playwright` and `playwright-core` also 1.62.0) | [e2e/](e2e/) |
| @playwright/mcp | 0.0.78 (bundles a 1.62.0-alpha build) | global, `~/.claude.json` → npx cache |

## Commands

**Everything below runs from `backend/`**, the same way frontend commands run from
`frontend/`. The venv lives at `backend/.venv` — this machine defaults to Python
3.14, but the project venv must be **3.12** (`/opt/homebrew/bin/python3.12`).

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt                 # first-time setup
cp .env.example .env                            # set MINITRACK_API_KEYS or /tasks* returns 401
uvicorn app.main:app --reload --env-file .env   # run; docs at http://127.0.0.1:8000/docs
python seed_data.py                             # optional: load demo tasks
pytest -q                                       # run the full suite (unit + integration)
pytest -q tests/test_x.py::test_name            # run a single test
pytest --collect-only -q | tail -1              # authoritative test count (currently 54)
```

`pyproject.toml` sets `testpaths = ["tests"]`, which is rootdir-relative — running
`pytest` from the repo root instead would collect nothing useful and walk
`frontend/node_modules`. There is deliberately no second, root-level pytest config.

Frontend commands live in [frontend/CLAUDE.md](frontend/CLAUDE.md). The only thing
that runs both halves together is the e2e suite, which boots them itself — see
[e2e/README.md](e2e/README.md).

## Architecture

Layered backend — routing, business logic, and persistence live in separate modules so each has one reason to change. Full design in [ARCHITECTURE.md](ARCHITECTURE.md); the short version:

- `app/api/routes/` — FastAPI routers (`health.py`, `tasks.py`). HTTP concerns only: no SQL, no manual `if x is None: raise`.
- `app/schemas/` — Pydantic request/response models (`TaskIn`, `Task`, `Priority`, `TaskListQuery`) and all input validation.
- `app/services/task_service.py` — business logic. Framework-agnostic (no FastAPI import); raises domain exceptions (`TaskNotFound`) instead of touching HTTP.
- `app/data/` — the *only* code that touches SQLite (`TaskRepository`, `database.py`). Returns plain `dict`/`None`/`bool`, never raises HTTP errors.
- `app/core/` — cross-cutting concerns: `config.py` (`Settings`/`get_settings`), `logging.py`, `security.py` (`X-API-Key` auth), `errors.py` (the single place domain exceptions map to HTTP status codes), `exceptions.py` (framework-free `DomainError`/`TaskNotFound`), `middleware.py` (request-id + access log).
- `app/db.py` — deprecated compatibility facade. Kept only so `seed_data.py` and the legacy `tests/test_seed_data.py` (which monkeypatch `db.DB_PATH`) keep working unchanged.

Keep that boundary when adding features: persistence logic goes in `app/data/` and returns `dict`/`None`/`bool`; business rules go in `app/services/`; HTTP wiring goes in `app/api/`. The repository's "check existence, mutate, re-fetch, return the fresh dict" pattern (see `TaskRepository`) is the convention to mirror.

## Database

Standard-library `sqlite3`. The file `backend/minitrack.db` is created on first run and is gitignored — safe to delete to reset state. Path comes from `MINITRACK_DB_PATH`, defaulting to `<backend>/minitrack.db` ([app/core/config.py:14](backend/app/core/config.py#L14)).

One table, five columns, defined once in [app/data/database.py:13-21](backend/app/data/database.py#L13-L21):

```sql
CREATE TABLE IF NOT EXISTS tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    description TEXT,
    priority    TEXT    NOT NULL DEFAULT 'medium',
    completed   INTEGER NOT NULL DEFAULT 0
)
```

Facts that are easy to assume wrongly — all verified against the live database:

- **There are zero indexes.** `PRAGMA index_list(tasks)` is empty. The only implicit index is the `INTEGER PRIMARY KEY` rowid alias.
- **There is no migration system.** No Alembic, no `migrations/`, no version table; `PRAGMA user_version` is `0` and nothing reads it. The schema is `CREATE TABLE IF NOT EXISTS`, re-executed on **every** `connect()` ([database.py:29](backend/app/data/database.py#L29)) and once more by `init_schema()` ([database.py:46-48](backend/app/data/database.py#L46-L48)) — deliberately self-healing.
- **`priority` has no DB-level CHECK constraint.** The `low|medium|high` restriction exists only in the Pydantic `Priority` enum ([app/schemas/task.py](backend/app/schemas/task.py)). Raw SQL can write anything.
- **`completed` is INTEGER 0/1**, converted to `bool` in `_row_to_dict` ([app/data/task_repository.py](backend/app/data/task_repository.py)) — not a native boolean.
- **Connection convention:** `row_factory = sqlite3.Row`; one short-lived connection per operation through the `get_connection` context manager (commit on success, rollback on exception, always close). `check_same_thread` is left at its `True` default — safe *only* because connections never outlive a single call. No WAL, no `foreign_keys` pragma, no `busy_timeout`, no pool.
- Check-then-mutate spans separate connections, so `create_task`/`update_task`/`set_completed` are not atomic end-to-end. Accepted for a single-user lab (ARCHITECTURE.md §6).

## API surface

| Method | Path | Auth | Success | Notes |
|---|---|---|---|---|
| GET | `/health` | public | 200 | `{"status": "ok"}` |
| GET | `/tasks` | 🔑 | 200 | `?completed=`, `?limit=` (1–200, default 50), `?offset=` (default 0); returns a bare array with no total |
| POST | `/tasks` | 🔑 | **201** | blank title / bad priority → 422 |
| GET | `/tasks/{id}` | 🔑 | 200 | 404 if missing |
| PATCH | `/tasks/{id}` | 🔑 | 200 | **full-body replace** — binds the same `TaskIn` as POST |
| POST | `/tasks/{id}/complete` | 🔑 | 200 | one-way; there is no reopen endpoint |
| DELETE | `/tasks/{id}` | 🔑 | **204** | empty body |

🔑 = requires `X-API-Key`, else 401. `/health`, `/docs`, `/redoc` and `/openapi.json` are public.

**Auth** is `APIKeyHeader("X-API-Key", auto_error=False)` compared with `hmac.compare_digest` over UTF-8 **bytes** (str comparison 500s on non-ASCII headers). It is applied **at the router level** ([app/api/routes/tasks.py:16-20](backend/app/api/routes/tasks.py#L16-L20)), so any new route added to that router inherits it automatically — do not add a per-route `Depends(require_api_key)`.

**Error bodies** are `{"detail": str, "request_id": str | None}` ([app/schemas/errors.py](backend/app/schemas/errors.py)). A 422 `detail` is a **joined string** (`"; "`, [app/core/errors.py](backend/app/core/errors.py)), *not* FastAPI's `{loc, msg, type}` array. A 401 body has **no** `request_id`. Every response carries an `X-Request-ID` header.

## Configuration

Every environment variable is read in one place, [app/core/config.py:30-39](backend/app/core/config.py#L30-L39):

| Variable | Default | Effect |
|---|---|---|
| `MINITRACK_API_KEYS` | *(empty)* | Comma-separated valid keys. **Empty fails closed** — every `/tasks*` request 401s. It does not disable auth. |
| `MINITRACK_DB_PATH` | `<repo root>/minitrack.db` | SQLite file location |
| `MINITRACK_LOG_LEVEL` | `INFO` | logging dictConfig level |
| `MINITRACK_API_PREFIX` | `""` | mounts routers under a prefix |
| `MINITRACK_CORS_ORIGINS` | *(empty)* | Comma-separated origins. **Empty means CORSMiddleware is not installed at all** ([app/main.py](backend/app/main.py)) — the frontend then fails every preflight. |
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000` | frontend only, see `frontend/.env.example` |

`app_name` is a `Settings` field but is **not** environment-configurable. `.env` is loaded only by uvicorn's `--env-file` flag; no code calls `load_dotenv()`.

## Guardrails and anti-patterns

Verified constraints. Each one is something that has been or could easily be invented.

**Dependencies**
- `pydantic-settings` is **not installed**. Config is a plain `BaseModel` + `os.environ` — never import `BaseSettings`.
- No ORM, no Alembic, no Docker, no Redis, no `slowapi`, no `ruff`/`black`/`mypy`, no `pytest-asyncio`, no `pytest-cov`. Keep new code within FastAPI + Pydantic + stdlib + pytest.
- Adding any runtime dependency is a decision to raise with the user, not to make silently. (`frontend/` has its own npm stack and its own constraints — see [frontend/CLAUDE.md](frontend/CLAUDE.md).)
- The app's `X-API-Key` auth is unrelated to this constraint — the labs run on a Claude Pro subscription, and **no Anthropic API key is ever needed**.

**Database**
- Never claim or imply an index exists — there are none.
- Never scaffold a `migrations/` directory or reference a schema version.
- Never assume the database rejects a bad `priority`; only Pydantic does.
- Never hold a module-level or global connection. The per-operation pattern is what makes the unset `check_same_thread` safe.

**Configuration**
- `get_settings()` is `@lru_cache`'d: changing an env var needs a process restart or `get_settings.cache_clear()` — which is exactly what the autouse `_env` fixture in [tests/conftest.py](backend/tests/conftest.py) does before and after each test.

**Layering**
- No SQL outside `app/data/`. No `fastapi` import in `app/services/`. No manual `if x is None: raise HTTPException` in routes — that is `app/core/errors.py`'s job.
- `app/db.py` is a deprecated facade kept only for `seed_data.py` and `tests/test_seed_data.py`. Never build a new feature on it.

**Contract**
- A task has exactly **five** fields: `id`, `title`, `description`, `priority`, `completed`. No due dates, assignees, tags, comments or subtasks — don't add them to schemas hoping the rest follows.
- Completion is one-way. PATCH cannot set `completed`, and there is no reopen endpoint.
- Known gap — do **not** "fix" it by asserting otherwise in docs: only `DELETE` declares `404` in its OpenAPI `responses`, though GET, PATCH and `/complete` all return 404 at runtime via the `TaskNotFound` handler.

**Facts to verify rather than quote**
- The suite collects **54** tests. Confirm with `pytest --collect-only -q`; do not copy a count out of a doc.
- `code-reviewer` and `scaffold-router` are **lab exercises you build during Module 3**, not files in this repo. Never cite them as existing.

## Testing

pytest config is two lines in [pyproject.toml](backend/pyproject.toml) (`testpaths = ["tests"]`) — no markers, no `addopts`, no asyncio mode. **54 tests**: `tests/unit/` (schemas, service against an in-memory `FakeTaskRepository`), `tests/integration/` (auth, health, full `/tasks` CRUD via `TestClient`), `tests/test_architecture.py` (the layering invariants below), plus `tests/test_delete_task.py` and `tests/test_seed_data.py`.

**The guardrails above are enforced, not just documented.** [tests/test_architecture.py](backend/tests/test_architecture.py) fails the build if a layer imports upward or sideways, if `app/services/` transitively reaches FastAPI, if `sqlite3` or `.execute(` appears outside `app/data/`, if `app/core/exceptions.py` grows an import, or if building the app pulls in the deprecated `app/db.py`. Adding a rule to this file is cheaper than re-litigating it in review.

`tests/conftest.py` gives every test an isolated database and a pre-authenticated client via the autouse `_env` fixture (`MINITRACK_DB_PATH` → `tmp_path`, `MINITRACK_API_KEYS` → `test-api-key`).

### End-to-end (Playwright)

[e2e/](e2e/) is the third module: `@playwright/test` **1.62.0**, **16 tests** — `seed.spec.ts` (1, environment bootstrap), `task-detail.spec.ts` (8), `task-edit.spec.ts` (7) — plus `fixtures.ts`, which creates and tears down tasks over the real API so parallel runs don't collide on the single SQLite file.

- `playwright.config.ts` boots **both halves** itself: `.venv/bin/uvicorn` with `cwd: '../backend'` on :8000 (health-gated) and Vite on :5173 with `--strictPort`. The port is pinned because `MINITRACK_CORS_ORIGINS` only allows `:5173`. It reads the first `MINITRACK_API_KEYS` entry out of `backend/.env`, so that file must exist.
- Run with `npx playwright test` from `e2e/`. It is the only suite that proves the two halves work together — run it after any change that crosses the API boundary.
- Two different MCP servers, routinely confused: **`playwright-test`** (declared in the repo-root [.mcp.json](.mcp.json), backs the `mcp__playwright-test__*` tools the three agents use) versus the global **`@playwright/mcp`** browser server in `~/.claude.json`. Installing one does not give you the other.
- **Never run the agents in CI.** The Healer has write tools and a mandate to make tests pass without asking; it cannot tell "this selector moved" from "this requirement changed on purpose". [.github/workflows/verify.yml](.github/workflows/verify.yml) runs `playwright test` only. Commit before healing locally, and `git diff` after.

## Diagrams

[docs/diagrams/](docs/diagrams/) holds the full-stack diagram set — read it before
reasoning about a flow you haven't touched:

- [architecture.md](docs/diagrams/architecture.md) — system architecture, backend
  components, frontend components, and the composed ASGI request pipeline.
- [sequences.md](docs/diagrams/sequences.md) — eight end-to-end flows: connect,
  list + Load more, create, the full-replacement PATCH, complete, delete,
  mid-session 401, and the 422 path.
- [flows.md](docs/diagrams/flows.md) — route/guard map, the `useTaskList` state
  machine, error→response mapping, and the data model.

Draw.io diagrams are **generated**, never hand-drawn: each is declared in
`docs/diagrams/specs.py` and rendered to both `.drawio` (editable) and `.svg`
(embeddable) by `build_diagrams.py`. Edit the spec and rebuild — never hand-edit
a file under `docs/diagrams/drawio/` or `docs/diagrams/svg/`.

```bash
python docs/diagrams/build_diagrams.py --check   # fail if output is stale
python docs/diagrams/check_names.py              # fail on invented symbols
```

`check_names.py` resolves every file path, function, class and env var used in a
diagram against the real tree, so a diagram naming something that doesn't exist
fails. If you add a diagram, keep it that way.

## History

This repo originally shipped with four intentional gaps as Lab 3.1/stretch-goal exercises: no `DELETE /tasks/{id}` endpoint, no input validation on create, no tests, and an ignored `completed` filter on `GET /tasks`. All four have been closed — see [ARCHITECTURE.md](ARCHITECTURE.md) section 13 for the migration sequence that closed them and [spec.md](spec.md) for the resulting behavioral contracts (seed data, delete, validation, the `completed` filter, and API-key auth).

## Subagents

- [.claude/agents/frontend-reviewer.md](.claude/agents/frontend-reviewer.md) is the one subagent checked into this repo: a read-only reviewer used in the *Review* step for `frontend/`. It encodes the backend contract as a checklist — invented features, endpoint usage, the full-replacement PATCH, API-key safety, error/loading/empty states, accessibility, Load-more semantics, tests — and reports `file:line` findings without editing code.
- The `code-reviewer` and `scaffold-router` agents referenced elsewhere in the docs are **lab exercises, not files in this repo** — you build them yourself during Module 3. `code-reviewer` is the read-only Python reviewer used in the *Review* step (correctness vs. the goal, missing 404s/edge cases, validation gaps, whether a test exists and `pytest -q` passes; it ignores style nits). `scaffold-router` is the *Implement*-step agent that scaffolds a new REST resource across every layer in dependency order, mirroring the existing `tasks` resource.
- `.claude/agents/playwright-test-{planner,generator,healer}.md` are three agents generated by `npx playwright init-agents --loop=claude`: the planner explores and saves a plan, the generator drives a live browser and writes the spec, and the healer (**the only one with write tools**) repairs failing tests. They bind to the `playwright-test` MCP server declared in the repo-root [.mcp.json](.mcp.json), so they work from a normal session started at the repo root. Regenerate them after a Playwright upgrade — see [e2e/README.md](e2e/README.md).

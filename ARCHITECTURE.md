# MiniTrack — Backend Engineering Spec

*Structural blueprint for refactoring MiniTrack from a two-file app into a layered,
production-shaped backend by applying the Single Responsibility Principle (SRP).*

> **Status:** ✅ implemented. This document started as a design spec — the target the team
> executed incrementally via the **Plan → Implement → Review → Verify (PIRV)** loop (§13) — and
> now doubles as the structural reference for how the layers are supposed to work. See
> [CODE_REVIEW.md](CODE_REVIEW.md) for the post-migration audit.
>
> **Companion doc:** [spec.md](spec.md) is the *behavioral* source-of-truth that the
> `code-reviewer` subagent checks (per-feature contracts + which test verifies them). This
> document is the *structural* blueprint (layers, module contracts, dependency rules,
> migration order). As new behavior lands (validation, the `completed` filter, auth), its
> contract is appended to `spec.md`; this file stays the architecture map.

---

## 1. Context & Goals

MiniTrack is a minimalist FastAPI + SQLite task tracker and the K21 Academy Day-3 practice
repo (Course 2606, Module 3). It **started** as **two files doing everything**:

- `app/main.py` — FastAPI app construction, routing, Pydantic schemas
  (`TaskIn`, `Task`), **and** HTTP error mapping (`raise HTTPException(404, ...)` inline in
  every route).
- `app/db.py` — every line of SQLite access.

That two-file split was a fine starting point, but everything that a real backend keeps
*separate* was originally either **fused** or **missing**:

| Concern | Before the refactor |
|---|---|
| Configuration | Hard-coded module global (`DB_PATH`), no settings object |
| Logging | None — a stray `print("before reaching the DB layer!!")` in the POST route |
| Authentication | None — every endpoint is open |
| Business logic | Smeared across route handlers and `db.py` |
| Error mapping | Duplicated `if x is None: raise HTTPException(404)` in five routes |
| Input validation | Absent — a blank title is accepted; `priority` is a free string |
| Request filtering | `GET /tasks?completed=` is accepted but ignored |
| App lifecycle | Deprecated `@app.on_event("startup")` |

All of this has since been addressed by the migration in §13 — `app/main.py` is now a thin
`create_app()` factory, `app/db.py` is a deprecated compatibility facade (kept only for
`seed_data.py` and legacy tests), and the layered tree in §3/§4 reflects the current codebase.

**Goal.** Define the module boundaries that give each concern one home and one reason to
change — an **API router layer**, a **schemas layer**, a **core** layer for cross-cutting
concerns (config, logging, auth, errors), a **services layer** for business logic, and a
**data-access layer** — plus the security and testing approach that makes the result
production-*shaped*. This is a teaching artifact first: the *why* of each seam matters as much
as the *where*.

---

## 2. Non-Goals & Constraints

These are hard boundaries. Every recommendation in this document lives inside them.

- **Lab-compatible stack only.** Standard-library `sqlite3` — **no ORM, no Docker, no external
  services, no new runtime dependencies.** The allowed set is exactly what
  [requirements.txt](requirements.txt) already pins: `fastapi==0.115.6`,
  `uvicorn[standard]==0.34.0`, `pydantic==2.10.4`, `httpx==0.28.1`, `pytest==8.3.4`. Python
  **3.12**.
- **Auth is a header API key only.** `X-API-Key`, checked by a FastAPI dependency against a
  configured value. No user accounts, no password hashing, no JWT, no OAuth, no login flow.
- **Documentation-only deliverable.** This spec changes no application code. It is the
  blueprint; the refactor happens later, step by step.
- **Preserve observable behavior.** The refactor must keep [spec.md](spec.md)'s contracts and
  the existing tests green (§12). Same status codes, same `{"detail": "Task not found"}`.
- **Heavier "production" machinery is out of scope** and appears only in §15 (Postgres,
  Alembic, Redis, JWT, containers, CI, rate-limiting, `/api/v1`, packaging).

---

## 3. Target Architecture Overview

Five layers. **Imports point downward only** — an upper layer may import a lower one, never
the reverse. Persistence sits at the bottom and depends on nothing above it. This acyclic
rule is what actually enforces SRP; the folder names are just where it's written down.

```
        ┌──────────────────────────────────────────────┐
 HTTP   │  app/api/routes/*   (routers — thin           │  ← knows FastAPI, HTTP status,
 edge   │  app/api/deps.py     controllers, wiring)     │    request/response. No SQL.
        └───────────────┬──────────────────────────────┘
                        │ calls
        ┌───────────────▼──────────────────────────────┐
Business│  app/services/task_service.py                 │  ← pure logic. Raises DOMAIN
 logic  │  (framework-agnostic; raises domain errors)   │    errors. No FastAPI, no SQL.
        └───────────────┬──────────────────────────────┘
                        │ calls
        ┌───────────────▼──────────────────────────────┐
 Data   │  app/data/task_repository.py                  │  ← the ONLY SQL. Returns
 access │  app/data/database.py                         │    dict/None/bool. Never raises HTTP.
        └──────────────────────────────────────────────┘

  cross-cutting (used by the edge, injected downward):
        app/core/{config, logging, security, errors, middleware}
        app/schemas/{task, errors}      (plain data contracts — importable by any layer)
```

**Reading the diagram.** A request enters at the HTTP edge, is authenticated and validated
there, then flows *down* through the service to the repository and back *up* as plain data
that FastAPI serializes. Domain errors flow *up* as exceptions and are translated to HTTP
exactly once, at the edge. `schemas/` and `core/` are the shared vocabulary every layer is
allowed to speak.

---

## 4. Module Table

The target layout (each new directory gets an empty `__init__.py`):

```
app/
├─ main.py                 # create_app() factory + lifespan + wiring (thin); module-level `app`
├─ db.py                   # DEPRECATED compat facade → app.data (keeps DB_PATH + init_db seam)
├─ api/
│  ├─ deps.py              # DI providers: get_settings / get_repository / get_task_service
│  └─ routes/
│     ├─ health.py         # GET /health (public)
│     └─ tasks.py          # /tasks APIRouter (protected; thin controllers)
├─ schemas/
│  ├─ task.py              # Priority(Enum), TaskIn (validated), Task, TaskListQuery
│  └─ errors.py            # ErrorResponse
├─ services/
│  └─ task_service.py      # TaskService — all business logic; raises domain exceptions
├─ data/
│  ├─ database.py          # connect()/get_connection(), _SCHEMA, init_schema()
│  └─ task_repository.py   # TaskRepository — the ONLY SQL; returns dict/None/bool
└─ core/
   ├─ config.py            # Settings(BaseModel) + get_settings()
   ├─ logging.py           # configure_logging() dictConfig + request-id filter
   ├─ security.py          # APIKeyHeader dependency require_api_key()
   ├─ exceptions.py        # DomainError, TaskNotFound (framework-free)
   ├─ errors.py            # exception handlers + register_* (maps core/exceptions → HTTP)
   └─ middleware.py        # RequestContextMiddleware (request-id + access log)
```

| Module | Responsibility | Key symbols | Imports from → imported by |
|---|---|---|---|
| `schemas/task.py` | Request/response contracts **and the validation now missing**. | `Priority(str, Enum)`, `TaskIn`, `Task`, `TaskListQuery` | stdlib + pydantic → routes, service (types) |
| `schemas/errors.py` | Uniform error body. | `ErrorResponse(detail, request_id)` | pydantic → core/errors, routes (`responses=`) |
| `data/database.py` | Connection + self-healing schema. | `_SCHEMA`, `connect()`, `get_connection()`, `init_schema()` | `sqlite3` → task_repository, db facade, lifespan |
| `data/task_repository.py` | **Only** module issuing task SQL; dict/None/bool boundary. | `TaskRepository` (methods 1:1 with today's `db.*`), `_row_to_dict` | data/database → api/deps, db facade, service tests |
| `services/task_service.py` | All business logic; framework-agnostic (imports core/exceptions, not core/errors, so no FastAPI leaks in). Turns repo sentinels into domain errors; owns filter + pagination pass-through. | `TaskService` | data, core/exceptions, schemas → api/deps, routes |
| `core/config.py` | Typed settings from `os.environ`. | `Settings`, `get_settings()` | stdlib + pydantic → almost everything (via DI) |
| `core/logging.py` | Structured logging setup; replaces the `print`. | `configure_logging()`, `RequestIdFilter` | stdlib `logging` → main |
| `core/security.py` | `X-API-Key` verification. | `api_key_header`, `require_api_key()` | fastapi, core/config, `hmac` → routes/tasks |
| `core/exceptions.py` | Domain exceptions. Framework-free by design. | `DomainError`, `TaskNotFound` | stdlib only → service, core/errors |
| `core/errors.py` | The single HTTP mapping for domain + validation errors. | `register_exception_handlers(app)` | fastapi, schemas/errors, core/exceptions → main |
| `core/middleware.py` | Request-id + access logging. | `RequestContextMiddleware` | starlette, `contextvars`, `uuid` → main |
| `api/deps.py` | DI seam wiring settings → repo → service. | `get_repository()`, `get_task_service()` | core/config, services, data → routes |
| `api/routes/health.py` | Liveness endpoint (public). | `router`, `health()` | fastapi → main |
| `api/routes/tasks.py` | The six task endpoints; thin controllers. | `router` (with `dependencies=[Depends(require_api_key)]`) | fastapi, schemas, api/deps, core/security → main |
| `main.py` | Composition root. | `create_app()`, `app`, `lifespan` | everything | (entrypoint) |
| `db.py` | Deprecated facade preserving the test seam. | `DB_PATH`, `init_db()`, `get_all_tasks()`, `get_task()`, `create_task()`, `update_task()`, `set_completed()`, `delete_task()` | data → seed_data.py, legacy tests |

---

## 5. Layer Contracts & Control Flow

**The one rule that makes this work:** each layer speaks only to the layer directly below it,
in that layer's vocabulary.

- Routers speak **HTTP** (status codes, headers, response models). They never see SQL and
  never contain `if result is None: raise`.
- Services speak the **domain** (tasks, "not found", "already done"). They never import
  FastAPI and never build SQL.
- The repository speaks **SQL/rows** and returns `dict` / `None` / `bool`. It never raises an
  HTTP error — that boundary is inherited verbatim from today's `db.py` and from
  [CLAUDE.md](CLAUDE.md).

### Trace A — `POST /tasks` (happy path)

```
client ──▶ RequestContextMiddleware   assigns request-id, starts timer, binds contextvar
        ──▶ Depends(require_api_key)   reads X-API-Key; hmac.compare_digest vs settings.api_keys
        ──▶ TaskIn validation          blank/whitespace title or bad priority → 422 (handler)
        ──▶ Depends(get_task_service)  builds TaskService(TaskRepository(factory(settings.db_path)))
        ──▶ service.create_task(data)  business rules → repo.create_task(...)
        ──▶ repo.create_task           INSERT + commit + re-fetch → fresh dict
        ◀── returns dict               router serializes via response_model=Task → 201
        ◀── middleware                 logs "POST /tasks 201 3ms", sets X-Request-ID header
```

### Trace B — `GET /tasks?completed=true`

Middleware + auth as above → `TaskListQuery(completed=True, limit, offset)` is parsed and
bounds-checked by Pydantic → `service.list_tasks(query)` → `repo.list_tasks(completed=True)`
emits `SELECT * FROM tasks WHERE completed = ? ORDER BY id LIMIT ? OFFSET ?` with `1` →
`list[dict]` → `response_model=list[Task]` → `200`.

**Where the two open gaps are fixed:**
- **Validation (gap #2)** lives in `schemas/task.py` — a blank title never reaches the
  service.
- **The `completed` filter (gap #4)** lives in `repo.list_tasks` SQL (parameterized,
  efficient), with the service passing the value through as the business seam.

### Trace C — `GET /tasks/{id}` (missing id)

`service.get_task(id)` sees the repo return `None` → `raise TaskNotFound(id)` → the handler
in `core/errors.py` maps it to `404 {"detail": "Task not found"}`. The router contains **zero**
error logic.

### Error-handling convention (recommended)

**Repository returns sentinels → service raises domain exceptions → one central handler maps
to HTTP.**

Why not keep today's inline `if task is None: raise HTTPException(404)` in every route? Because
once a service layer exists, that pattern (a) duplicates the HTTP mapping across five handlers,
and (b) couples controllers to persistence sentinels (`None`, `False`). Centralizing the
mapping gives each layer exactly one reason to change: add a new failure mode (e.g. a future
"task already completed" conflict) and you touch the service + one handler, not every route.

The cost is one small module (`core/errors.py`) and a registration call. Crucially, the mapping
**preserves the exact `404` status and `"Task not found"` string**, so [spec.md](spec.md)'s
delete contract and both existing tests keep passing.

```python
# app/core/exceptions.py  (illustrative — framework-free, no fastapi import)
class DomainError(Exception): ...
class TaskNotFound(DomainError):
    def __init__(self, task_id: int):
        self.task_id = task_id
        super().__init__(f"Task {task_id} not found")

# app/core/errors.py  (illustrative — imports core/exceptions, not vice versa)
def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(TaskNotFound)
    async def _not_found(request, exc):
        return JSONResponse(
            status_code=404,
            content=ErrorResponse(detail="Task not found",
                                  request_id=current_request_id()).model_dump(),
        )
```

---

## 6. Data Model & Persistence

**Schema (unchanged from today — carried verbatim into `data/database.py`):**

```sql
CREATE TABLE IF NOT EXISTS tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    description TEXT,
    priority    TEXT    NOT NULL DEFAULT 'medium',
    completed   INTEGER NOT NULL DEFAULT 0
);
```

**`TaskRepository` interface** — method names are 1:1 with today's `db.*` functions so the
migration is mechanical and the diff is reviewable:

```python
class TaskRepository:
    def __init__(self, connection_factory: Callable[[], ContextManager[sqlite3.Connection]]):
        self._connect = connection_factory

    def list_tasks(self, completed: Optional[bool] = None,
                   limit: Optional[int] = None, offset: int = 0) -> list[dict]: ...
    def get_task(self, task_id: int) -> Optional[dict]: ...
    def create_task(self, title: str, description: Optional[str], priority: str) -> dict: ...
    def update_task(self, task_id: int, title: str,
                    description: Optional[str], priority: str) -> Optional[dict]: ...
    def set_completed(self, task_id: int, completed: bool) -> Optional[dict]: ...
    def delete_task(self, task_id: int) -> bool: ...
```

**Decisions:**

- **Connection-per-operation** (matches today's `_connect()` per call). FastAPI runs sync
  endpoints in a threadpool, so a single long-lived connection would need
  `check_same_thread=False` plus locking. Per-op short-lived connections are the simplest
  *correct* choice for the lab. (Pooling / WAL / `check_same_thread` tuning → §15.)
- **Self-healing schema stays** (`CREATE TABLE IF NOT EXISTS` inside `connect()`) so a
  `TestClient`-driven request works without explicit setup — **plus** an explicit
  `init_schema()` called from the app **lifespan** for clarity. The DDL is idempotent, so
  doing both is free and replaces the deprecated `@app.on_event("startup")`.
- **The dict/None/bool boundary is preserved verbatim.** The repository never raises HTTP
  errors — that translation is the service's and edge's job.

**The `app/db.py` compatibility facade.** `db.py` is kept as a thin delegating shim so the
existing tests and `seed_data.py` keep working unchanged. It preserves the `DB_PATH` module
global and reads it **at call time**, which is exactly what keeps the
`monkeypatch.setattr(db, "DB_PATH", ...)` test seam alive:

```python
# app/db.py  (deprecated facade — new code should use the repository/service directly)
from pathlib import Path
from app.data.database import init_schema, get_connection
from app.data.task_repository import TaskRepository

DB_PATH = Path(__file__).resolve().parent.parent / "minitrack.db"   # test seam preserved

def _repo() -> TaskRepository:
    return TaskRepository(lambda: get_connection(DB_PATH))   # DB_PATH read at call time

def init_db() -> None:            init_schema(DB_PATH)
def get_all_tasks() -> list[dict]: return _repo().list_tasks()
def get_task(task_id):            return _repo().get_task(task_id)
def create_task(title, description, priority): return _repo().create_task(title, description, priority)
def update_task(task_id, title, description, priority): return _repo().update_task(task_id, title, description, priority)
def set_completed(task_id, completed):         return _repo().set_completed(task_id, completed)
def delete_task(task_id) -> bool:              return _repo().delete_task(task_id)
```

New production code and new tests use the cleaner seam (override `get_settings` /
`get_repository`, or set `MINITRACK_DB_PATH`); legacy tests keep using `db.DB_PATH`.

---

## 7. API Contract

Paths stay at the root (no `/api/v1` yet — see §14) so `spec.md` and the tests are unaffected.

| Method | Path | Auth | Body | Success | Errors | Response model |
|---|---|---|---|---|---|---|
| GET | `/health` | public | — | 200 `{"status":"ok"}` | — | — |
| GET | `/tasks` | 🔑 | — | 200 | 401 | `list[Task]` |
| GET | `/tasks/{id}` | 🔑 | — | 200 | 401, 404 | `Task` |
| POST | `/tasks` | 🔑 | `TaskIn` | 201 | 401, 422 | `Task` |
| PATCH | `/tasks/{id}` | 🔑 | `TaskIn` (full replace) | 200 | 401, 404, 422 | `Task` |
| POST | `/tasks/{id}/complete` | 🔑 | — | 200 | 401, 404 | `Task` |
| DELETE | `/tasks/{id}` | 🔑 | — | 204 (empty) | 401, 404 | — |

**New query params on `GET /tasks`** (all optional, backward-compatible):
`completed: bool | None` (the filter, gap #4), `limit: int = 50` (1–200), `offset: int = 0`.

**Schemas (Pydantic v2):**

```python
class Priority(str, Enum):
    low = "low"; medium = "medium"; high = "high"

class TaskIn(BaseModel):
    # gap #2 closed here: whitespace-stripped, non-empty title; constrained priority
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    description: Optional[str] = None
    priority: Priority = Priority.medium

class Task(TaskIn):
    id: int
    completed: bool = False

class TaskListQuery(BaseModel):
    completed: Optional[bool] = None
    limit: int = Field(50, ge=1, le=200)
    offset: int = Field(0, ge=0)
```

The `TaskIn` → `Task` inheritance shape is preserved exactly. PATCH stays a **full-body
replace** via `TaskIn` (faithful to today); a partial `TaskUpdate` is noted as future (§14/§15).

---

## 8. Configuration

**Approach: a plain Pydantic `BaseModel` populated from `os.environ`, cached with
`functools.lru_cache`.** We do **not** use `pydantic-settings` (`BaseSettings`) — it is *not*
installed and adding it violates the no-new-deps constraint. A `BaseModel` still gives typed
coercion and validation (Pydantic is already a core dep), and `os.environ` + `lru_cache` is
stdlib.

```python
# app/core/config.py
class Settings(BaseModel):
    app_name: str = "MiniTrack"
    api_keys: frozenset[str] = frozenset()
    db_path: Path = Path(__file__).resolve().parent.parent.parent / "minitrack.db"
    log_level: str = "INFO"
    api_prefix: str = ""
    cors_origins: list[str] = []

@lru_cache
def get_settings() -> Settings:
    env = os.environ
    csv = lambda k: [s.strip() for s in env.get(k, "").split(",") if s.strip()]
    return Settings(
        api_keys=frozenset(csv("MINITRACK_API_KEYS")),
        db_path=Path(env["MINITRACK_DB_PATH"]) if "MINITRACK_DB_PATH" in env else Settings().db_path,
        log_level=env.get("MINITRACK_LOG_LEVEL", "INFO"),
        api_prefix=env.get("MINITRACK_API_PREFIX", ""),
        cors_origins=csv("MINITRACK_CORS_ORIGINS"),
    )
```

| Env var | Meaning | Default |
|---|---|---|
| `MINITRACK_API_KEYS` | Comma-separated valid API keys | *(empty — see §14 fork on enforcement)* |
| `MINITRACK_DB_PATH` | SQLite file location | `<repo>/minitrack.db` |
| `MINITRACK_LOG_LEVEL` | Root log level | `INFO` |
| `MINITRACK_API_PREFIX` | Router mount prefix | `""` (root) |
| `MINITRACK_CORS_ORIGINS` | Comma-separated allowed origins | `[]` (CORS effectively off) |

**`.env` support comes for free with zero code and zero new pinned deps:**
`uvicorn app.main:app --env-file .env` — `uvicorn[standard]` already bundles `python-dotenv`.
Ship a committed `.env.example` documenting the vars; never commit real keys. `get_settings`
is a FastAPI dependency, so tests override it cleanly (and call `get_settings.cache_clear()`
between cases).

---

## 9. Logging & Observability

- **`logging.config.dictConfig`** in `core/logging.py`, invoked once from `create_app()`. One
  console handler + a formatter like `%(asctime)s %(levelname)s %(name)s [%(request_id)s] %(message)s`.
- **Request correlation.** `core/middleware.py` generates a `uuid4` per request, stores it in a
  `contextvars.ContextVar`, and echoes it as the `X-Request-ID` response header. A
  `RequestIdFilter` injects it into every log record so a request's logs are greppable.
- **Access log.** The middleware logs `method path status duration_ms` on the way out (uvicorn's
  own access log stays too).
- **The stray `print`.** `print("before reaching the DB layer!!")`, formerly in the POST route,
  has been removed; a breadcrumb there now would be `logger.debug(...)`. `print()` in
  request-handling code is unstructured, unfilterable, and goes to stdout regardless of level —
  this is precisely the smell the logging layer exists to remove.

---

## 10. Security

**Mechanism: `X-API-Key` header, verified by a FastAPI dependency.**

```python
# app/core/security.py
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)  # part of FastAPI, no new dep

def require_api_key(key: Optional[str] = Depends(api_key_header),
                    settings: Settings = Depends(get_settings)) -> None:
    # Compare bytes, not str: hmac.compare_digest raises TypeError on a
    # non-ASCII str, which would otherwise turn into an unhandled 500.
    key_bytes = key.encode("utf-8") if key else None
    if key_bytes is None or not any(
        hmac.compare_digest(key_bytes, k.encode("utf-8")) for k in settings.api_keys
    ):
        raise HTTPException(status_code=401, detail="Invalid or missing API key",
                            headers={"WWW-Authenticate": "X-API-Key"})
```

- **Constant-time comparison** via stdlib `hmac.compare_digest` to avoid timing side-channels,
  on UTF-8-encoded bytes so a non-ASCII header value can't raise `TypeError`.
- **Attached at the router level** — `APIRouter(prefix="/tasks", dependencies=[Depends(require_api_key)])`
  — so every task endpoint is covered uniformly and controllers stay thin.
- **Public surface:** `/health`, plus `/docs`, `/redoc`, `/openapi.json` (so the lab's
  interactive docs still load). The `APIKeyHeader` scheme makes an **Authorize** button appear
  in `/docs` automatically. **Protected:** everything under `/tasks`.
- **Uniform 401** for *both* missing and invalid keys — returning 403 only for a present-but-wrong
  key would leak whether a key exists (an oracle). We set `auto_error=False` precisely to
  override FastAPI's default 403 and control this.
- **Keys live only in configuration/env**, never in source. This is transport-level app auth,
  not user identity — richer auth (JWT/OAuth2, users, scopes) is §15.

---

## 11. Error Model

One shape for every error body, one place that decides HTTP status for domain errors.

```python
class ErrorResponse(BaseModel):
    detail: str
    request_id: Optional[str] = None
```

| Condition | Source | Status | Body |
|---|---|---|---|
| Unknown task id | `TaskNotFound` (service) → handler | 404 | `{"detail": "Task not found", "request_id": "…"}` |
| Invalid/missing API key | `require_api_key` | 401 | `{"detail": "Invalid or missing API key"}` |
| Schema validation failure | FastAPI `RequestValidationError` handler | 422 | `{"detail": "…", "request_id": "…"}` |

The `detail` field is retained (not renamed) so `{"detail": "Task not found"}` — asserted by
[spec.md](spec.md) and the delete test — stays byte-compatible. `request_id` is additive.

---

## 12. Testing Strategy

A layered pyramid replaces the two ad-hoc tests, with a shared fixture module.

**`tests/conftest.py`** (removes the duplicated `tmp_path + monkeypatch` blocks):
- `api_key` — a session-constant test key.
- autouse `_env` — sets `MINITRACK_API_KEYS` and `MINITRACK_DB_PATH` (a tmp file), then calls
  `get_settings.cache_clear()`.
- `temp_db_path` — a **tmp file**, deliberately *not* `:memory:`: with connection-per-operation
  each call opens a fresh handle, and a `:memory:` DB is private per connection, so state
  wouldn't be shared; a tmp file gives shared-but-isolated state and mirrors production.
- `client` — `TestClient(create_app())` with a default `X-API-Key` header so integration calls
  are authenticated by default.
- `fake_repo` — an in-memory `dict`-backed object implementing the `TaskRepository` interface,
  for pure service unit tests (no SQLite).

**Unit — schemas** (`tests/unit/test_schemas.py`): blank title → error; whitespace-only title →
error; unknown priority → error; valid input passes; `priority` defaults to `medium`.

**Unit — service** (`tests/unit/test_task_service.py`, uses `fake_repo`): `get`/`replace`/
`complete`/`delete` on a missing id each raise `TaskNotFound`; `list_tasks` honors the
`completed` filter; `create` returns a full dict. No SQLite touched.

**Integration** (`TestClient`): `test_health.py` (public, no key → 200); `test_auth.py`
(missing key → 401, wrong key → 401, valid key → 200); `test_tasks_api.py` (CRUD happy paths;
404s carry `{"detail":"Task not found"}`; `?completed=` filter; blank title → 422; delete → 204
with empty body).

**The two existing tests:**
- [tests/test_seed_data.py](tests/test_seed_data.py) — **unchanged.** It drives `db.*` directly
  (facade preserved: `DB_PATH`, `init_db`, `create_task`, `get_all_tasks`) and never touches
  HTTP or auth.
- [tests/test_delete_task.py](tests/test_delete_task.py) — **one-fixture swap.** Because `/tasks`
  is now key-protected, its `client` fixture must send `X-API-Key`; the request/assertion bodies
  are otherwise identical. This is the honest, production-shaped consequence of adding auth —
  the spec calls it out explicitly rather than hiding it behind a fail-open default.

Every migration step in §13 keeps `pytest -q` green.

---

## 13. Migration / Refactor Sequence

Each step is a PIRV-sized change that leaves the app runnable and the tests green. Do them in
order; do not batch.

| # | Step | Keeps green because |
|---|---|---|
| 0 | Write this document. | No code change. |
| 1 | Core scaffolding: add `core/config.py` + `core/logging.py`; replace `on_event` with a `lifespan` calling `db.init_db()`; **delete the stray `print`.** | Behavior identical; tests untouched. |
| 2 | Extract schemas: move `TaskIn`/`Task` verbatim to `schemas/task.py`; add `Priority`, `ErrorResponse`. | Same classes, new home. |
| 3 | **Close gap #2** — tighten `TaskIn` (non-blank title, `Priority`). Add `test_schemas.py`; append validation contract to `spec.md`. | Existing tests POST valid data (`title="temp"`, priorities `low/medium/high`). |
| 4 | Extract data layer: `data/database.py` + `data/task_repository.py`; convert `app/db.py` to the delegating facade. | `DB_PATH`/`init_db`/function names preserved → seam intact. |
| 5 | Add service + central errors: `services/task_service.py` (raises `TaskNotFound`) + `core/errors.py`; routes call the service instead of inline `if None: raise`. Add `test_task_service.py`. | Same 404 + `"Task not found"`. |
| 6 | **Close gap #4** — `repo.list_tasks(completed=...)` + service pass-through + `GET /tasks` query param. Add filter tests; append filter contract to `spec.md`. | Default (no param) returns all tasks as before. |
| 7 | Router split + factory: `api/routes/health.py` + `api/routes/tasks.py`; `main.py` becomes `create_app()` with `include_router` + `register_exception_handlers` + middleware; keep module-level `app`. | `from app.main import app` and `uvicorn app.main:app` unchanged. |
| 8 | Security: `core/security.py` + router-level dependency; add `tests/conftest.py`; **migrate `test_delete_task.py`** to the authenticated `client`; add `test_auth.py`. Append auth contract to `spec.md`. | Seed test never uses HTTP; delete test gets the header. |
| 9 | Cross-cutting niceties (each its own PIRV): request-id middleware + `ErrorResponse` polish; pagination; CORS (off by default); OpenAPI tags/metadata; `.env.example`; optional `/health/ready`; optional `pyproject.toml` pytest config. | Additive; defaults preserve current behavior. |
| 10 | Security/conventions hardening pass (full-codebase review, see [CODE_REVIEW.md](CODE_REVIEW.md)): gitignore `.env` + rotate the key that leaked into `.env.example`; fix `hmac.compare_digest` raising on a non-ASCII `X-API-Key`; split `DomainError`/`TaskNotFound` into framework-free `core/exceptions.py` so `services/task_service.py`'s "no FastAPI import" claim actually holds; consolidate `GET /tasks` pagination validation into `TaskListQuery` as a single FastAPI query-param model instead of duplicating bounds in the route. | Same routes/behavior/status codes; only the internal module boundary and secret values changed. |

**Old → new symbol map:** `TaskIn`/`Task` → `schemas/task.py`; the six `db.*` functions →
`TaskRepository` methods (same names) + `app/db.py` facade; per-route `HTTPException(404)` →
`TaskService` raising `TaskNotFound` + `core/errors.py` handler; `@app.on_event("startup")` →
`lifespan` + `init_schema`; `print(...)` → `logger`.

---

## 14. Open Questions (resolved defaults recorded)

Each fork below is settled with a recommended default; the alternative is kept for the record.

1. **Auth vs. the legacy HTTP test.** ✅ *Enforce the key and update `test_delete_task.py`* (a
   one-fixture swap). Alternative: fail open when `MINITRACK_API_KEYS` is unset (keeps the test
   untouched but weakens posture and hides the change).
2. **API versioning now or later.** ✅ *Keep root paths;* structure routers so `/api/v1` is a
   one-line prefix flip later. Adopting it now breaks `spec.md` + the delete test.
3. **401 vs. 403 for a present-but-wrong key.** ✅ *Uniform 401* (no key-existence oracle).
4. **PATCH semantics.** ✅ *Keep full-replace via `TaskIn`* (faithful). A partial `TaskUpdate`
   is future work.
5. **Repository class vs. loose module functions.** ✅ *`TaskRepository` class + facade* (cleaner
   DI, trivially fakeable). Alternative: split files but keep module functions (lower churn).
6. **Fate of `app/db.py`.** ✅ *Keep the facade for the lab.* Eventually both legacy tests could
   migrate to the settings seam and the facade retire.
7. **`spec.md` ownership.** ✅ *`spec.md` stays behavioral/reviewer-facing;* this doc stays
   structural. New feature contracts append to `spec.md` as they land.

---

## 15. Future / Beyond-Lab

Explicitly **out of scope** for the course repo (they require new dependencies, services, or
infrastructure), but this is where the architecture is designed to grow:

- **Persistence:** Postgres + SQLAlchemy + Alembic migrations; connection pooling; SQLite WAL
  mode + `check_same_thread` tuning if staying on SQLite.
- **Identity & auth:** user accounts, password hashing (`passlib`/`argon2`), JWT/OAuth2 bearer
  tokens, scopes/roles — the `core/security.py` dependency is the seam they slot into.
- **Rate limiting:** `slowapi`/Redis token bucket (a real limiter needs shared state).
- **API versioning:** flip `MINITRACK_API_PREFIX=/api/v1`; the router split already supports it.
- **Packaging:** a `pyproject.toml` with a `src/` layout to make the project pip-installable
  (today's imports are root-relative; this is a deliberate later migration).
- **Delivery:** Dockerfile + compose; GitHub Actions CI running `pytest` + a linter/formatter
  (`ruff`/`black`); pre-commit hooks.
- **Observability:** structured JSON logs shipped to a collector; OpenTelemetry tracing using
  the request-id already threaded through `core/middleware.py`; a `/health/ready` readiness
  probe that checks the DB.
- **API richness:** partial-update `TaskUpdate`, an un-complete endpoint, a paginated response
  envelope (total count + next/prev) instead of a bare list.

---

*End of spec. To execute: follow §13 in order, one PIRV cycle per row, verifying `pytest -q`
stays green and appending each new behavioral contract to [spec.md](spec.md) as it lands.*

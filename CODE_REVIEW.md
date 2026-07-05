# Code Review — 2026-07-05

Full-codebase audit of MiniTrack (correctness vs. [spec.md](spec.md), security, and
FastAPI/Python conventions), run via the `code-reviewer` subagent plus a dedicated
security-focused pass. Scope: every file under `app/`, `tests/`, `seed_data.py`,
`requirements.txt`, `.env.example`, and the two design docs.

**Result:** `pytest -q` passes (31/31). No critical bugs. Two real security gaps in
secret handling, one auth robustness bug, and two layering/convention violations.
Findings below are grouped by area; `Status` is updated as fixes land.

## Correctness

Every `spec.md` contract (seed, delete, validation, completed filter, auth) is
implemented in the right layer and covered by a test. No blocking issues.

| # | Note | Status |
|---|---|---|
| C1 | `TaskRepository.create_task` is annotated `-> dict` but its return path (`get_task`) is typed `Optional[dict]`. Harmless at runtime — a just-inserted row always exists — but the annotation is inaccurate. | Open (low priority, not part of this fix batch) |
| C2 | `TaskRepository`'s check-then-mutate is non-atomic across separate connections (a concurrent delete between the existence check and the mutation could race). Explicitly accepted by [ARCHITECTURE.md](ARCHITECTURE.md) §6 (connection-per-op) for a single-user lab. | Accepted, no action |

## Security

| # | Severity | Finding | Status |
|---|---|---|---|
| S1 | High | `.gitignore` does not exclude `.env`. The moment this directory becomes a git repo, a real `MINITRACK_API_KEYS` value becomes committable/pushable. | **Fixed** — `.env` / `.env.*` added, `.env.example` kept tracked |
| S2 | Medium | `.env.example` shipped a *working* key (`dev-local-key`), and the local `.env` was a byte-identical copy — the "secret" was public. | **Fixed** — placeholder in `.env.example`; local `.env` rotated to a random key |
| S3 | Medium | No rate limiting / lockout on the `X-API-Key` check (`app/core/security.py`) — unlimited online guessing. | Deferred — requires a new dependency (`slowapi`) or proxy-level config, which conflicts with the repo's stdlib/FastAPI/Pydantic-only constraint ([CLAUDE.md](CLAUDE.md)). Recommended at the reverse-proxy layer if this ever leaves localhost. |
| S4 | Low | `hmac.compare_digest(key, valid)` raises `TypeError` on a non-ASCII `X-API-Key` header (Starlette decodes headers as latin-1), producing an unhandled **500** instead of the intended **401**. | **Fixed** — compare UTF-8-encoded bytes instead of `str` |
| S5 | Info | CORS wildcard (`*`) is possible via `MINITRACK_CORS_ORIGINS` config; low risk since `allow_credentials` is unset and the custom header forces a preflight. | Open — documentation-only fix, not code |
| S6 | Info | Shared-key model has no per-object authorization — any valid key can touch every task. By design per ARCHITECTURE.md §10 for this lab. | Accepted, no action |

**Verified clean (both passes agreed):** SQL injection (100% parameterized queries),
no XSS/CSS-injection surface (pure JSON API), no CSRF exposure (bearer header, no
cookies), no dangerous sinks (`eval`/`exec`/`pickle`/`yaml.load`/`subprocess` —
none found), no mass assignment, no PII/secret leakage in logs or error bodies,
no prompt-injection surface (no LLM in the app), dependencies current with no
known reachable CVEs.

## Code smells & FastAPI/Python conventions

| # | Finding | Status |
|---|---|---|
| V1 | `app/services/task_service.py` is documented as framework-agnostic ("no FastAPI import") but transitively imports FastAPI via `from app.core.errors import TaskNotFound` (`core/errors.py` imports `fastapi`). | **Fixed** — `DomainError`/`TaskNotFound` moved to a new framework-free `app/core/exceptions.py`; `core/errors.py` now imports from there for the HTTP handlers. |
| V2 | `GET /tasks` validated `limit`/`offset` twice: once via `Query(50, ge=1, le=200)` in the route, again via `TaskListQuery`'s `Field(...)` bounds, which could never actually fire. Latent trap: removing the route-level `Query()` constraint in favor of `TaskListQuery` alone would raise `pydantic.ValidationError`, uncaught by the app's `RequestValidationError` handler → **500 instead of 422**. | **Fixed** — `TaskListQuery` is now used as a FastAPI query-param model (`Annotated[TaskListQuery, Query()]`), the single source of validation; the duplicate `Query()` bounds in the route were removed. |
| V3 | `app/data/database.py`'s `init_schema` re-runs the same DDL that `connect()` already executes. Idempotent and harmless, but redundant. | Open (low priority, not part of this fix batch) |

---
*Superseded findings will be removed in a future pass once S3/S5 have owners; C1/C2/V3
are tracked here so they aren't lost, not because they block anything.*

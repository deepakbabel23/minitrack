# MiniTrack

A minimalist team task tracker — the **Day 3 practice repository** for
K21 Academy *Course 2606: Claude AI*, Module 3 ("Designing Agents for the SDLC").

It started as a deliberately tiny **and deliberately incomplete** two-file app.
You close gaps like these during the labs using Claude Code and the
**Plan → Implement → Review → Verify (PIRV)** loop — no Anthropic API key
required, just your Claude Pro subscription. This copy has since gone through
that loop and been refactored into a layered backend; see
[ARCHITECTURE.md](ARCHITECTURE.md) for the full design and
[Design history](#design-history) below for what changed.

> MiniTrack is the same theme as the course capstone, so the muscle memory you
> build here pays off again on Day 14.

## Stack
**Backend:** Python 3.12 · FastAPI 0.115.6 · Pydantic 2.10.4 · Uvicorn 0.34.0 ·
plain `sqlite3` (standard library) · pytest 8.3.4. No ORM, no Docker, no
external services, no Anthropic API key. (The app does have its own optional
`X-API-Key` header auth — see [Run it](#run-it) — which is unrelated.)

**Frontend:** React 19.2 · Vite 8.1 · TypeScript 6.0 · Vitest 4.1 (see
[frontend/](frontend)). **End-to-end:** Playwright 1.62 (see [e2e/](e2e)).

Exact pinned versions and the guardrails that go with them live in
[CLAUDE.md](CLAUDE.md); the lockfiles are the source of truth.

Want the picture rather than the prose? [docs/diagrams/](docs/diagrams/) has the
system architecture, per-layer component diagrams, eight end-to-end sequence
diagrams, and the data model.

## Layout

Three peer modules, each with its own dependencies and its own test suite.

```
minitrack/
├─ backend/           # FastAPI + sqlite3          pytest      54 tests
│  ├─ app/
│  │  ├─ main.py       # create_app() factory + lifespan (composition root)
│  │  ├─ db.py         # deprecated facade — kept for seed_data.py + legacy tests
│  │  ├─ api/          # routers (health, tasks) + dependency wiring
│  │  ├─ schemas/      # Pydantic request/response models + validation
│  │  ├─ services/     # business logic (framework-agnostic)
│  │  ├─ data/         # the only code that touches SQLite
│  │  └─ core/         # config, logging, X-API-Key auth, error handling
│  ├─ tests/           # unit/ + integration/ + test_architecture.py (layer rules)
│  ├─ pyproject.toml   # pytest config — run pytest from here, not the repo root
│  ├─ requirements.txt
│  ├─ .env.example     # MINITRACK_API_KEYS and other config
│  └─ seed_data.py     # optional demo data
├─ frontend/          # React + Vite + TypeScript   vitest      86 tests
├─ e2e/               # Playwright over both halves playwright  16 tests
├─ docs/diagrams/     # architecture, component and sequence diagrams
├─ .github/workflows/ # verify.yml — runs all three suites on every push
├─ .claude/agents/    # frontend-reviewer + the three Playwright agents
├─ ARCHITECTURE.md    # layered design spec — the structural source of truth
├─ spec.md            # behavioral contracts a review pass checks against
├─ CLAUDE.md          # project context Claude Code reads every session
├─ DESIGN.md          # the "MiniTrack Precision" design system (the spec)
└─ CODE_REVIEW.md     # findings from the full-codebase audit
```

## Run it

The venv must be **Python 3.12** (see [.python-version](backend/.python-version)) —
name the interpreter explicitly, because `python3` on many machines is now 3.14
and the pinned dependencies don't build there.

```bash
cd backend
python3.12 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                    # set MINITRACK_API_KEYS
uvicorn app.main:app --reload --env-file .env
```
Open the interactive docs at **http://127.0.0.1:8000/docs**. Without
`MINITRACK_API_KEYS` set, every `/tasks*` request returns 401 — `/health` and
the docs stay public either way.

Optional — load a few demo tasks:
```bash
python seed_data.py
```

## Endpoints
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | public | liveness check |
| GET | `/tasks` | 🔑 | `?completed=`, `?limit=`, `?offset=` all work |
| GET | `/tasks/{id}` | 🔑 | 404 if missing |
| POST | `/tasks` | 🔑 | 201; blank title / bad priority → 422 |
| PATCH | `/tasks/{id}` | 🔑 | full-body replace |
| POST | `/tasks/{id}/complete` | 🔑 | marks complete |
| DELETE | `/tasks/{id}` | 🔑 | 204, empty body |

🔑 = requires header `X-API-Key: <one of MINITRACK_API_KEYS>`, else 401.

## Frontend
A React + Vite + TypeScript SPA lives in [`frontend/`](frontend) and consumes
this API. There are no accounts — you connect with an API key rather than
signing in. Start the backend first with `MINITRACK_CORS_ORIGINS` set (it is in
[backend/.env.example](backend/.env.example) already) — leave it empty and
CORSMiddleware is never installed, so every request fails its preflight.

```bash
cd frontend
npm ci                                         # npm install if you're changing deps
npm run dev                                    # http://localhost:5173
npm run typecheck && npm run lint && npm test
```
See [frontend/README.md](frontend/README.md) for the layout and the backend
contracts it was built against, and
[frontend/MANUAL_TESTING.md](frontend/MANUAL_TESTING.md) for the keyboard and
screen-reader passes the suite can't automate.

## Design history
This repo originally shipped with four intentional gaps as Lab 3.1 exercises.
They've since been closed via a layered refactor — see
[ARCHITECTURE.md](ARCHITECTURE.md) for the design and the PIRV migration
sequence that closed them, and [spec.md](spec.md) for the resulting behavioral
contracts:
1. ~~No DELETE endpoint~~ → `DELETE /tasks/{id}`, backed by `TaskRepository.delete_task`.
2. ~~No input validation~~ → non-blank title + `low|medium|high` priority, enforced in `backend/app/schemas/task.py`.
3. ~~No tests~~ → unit + integration suite in `backend/tests/`.
4. ~~`completed` filter ignored~~ → now filters, plus `limit`/`offset` pagination.

## Tests

One suite per module. CI runs all three —
[.github/workflows/verify.yml](.github/workflows/verify.yml).

```bash
cd backend  && pytest -q                                     # 54
cd frontend && npm run typecheck && npm run lint && npm test # 86
cd e2e      && npx playwright test                           # 16
```

The backend suite splits into `tests/unit/` (11 — schema validation, service
logic against a fake repository), `tests/integration/` (20 — auth, health, full
`/tasks` CRUD via `TestClient`), `tests/test_architecture.py` (20 — see below),
plus the original `tests/test_delete_task.py` and `tests/test_seed_data.py` (3).

**The architecture rules are enforced, not just documented.**
[backend/tests/test_architecture.py](backend/tests/test_architecture.py) and
[frontend/src/test/architecture.test.ts](frontend/src/test/architecture.test.ts)
fail the build if a layer imports upward, if the service layer transitively
reaches FastAPI, if SQL escapes `app/data/`, if the deprecated `app/db.py` ends
up on the request path, or if `fetch` escapes `src/api/client.ts`. Breaking one
of those is otherwise invisible until something unrelated goes wrong.

The e2e suite boots both halves itself, so it is the one that proves they work
together — run it after any change crossing the API boundary. See
[e2e/README.md](e2e/README.md).

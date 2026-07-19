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
FastAPI · plain `sqlite3` (standard library) · pytest. No ORM, no Docker, no
external services, no Anthropic API key. (The app does have its own optional
`X-API-Key` header auth — see [Run it](#run-it) — which is unrelated.)

```
minitrack/
├─ app/
│  ├─ main.py         # create_app() factory + lifespan (composition root)
│  ├─ db.py           # deprecated facade — kept for seed_data.py + legacy tests
│  ├─ api/             # routers (health, tasks) + dependency wiring
│  ├─ schemas/         # Pydantic request/response models + validation
│  ├─ services/        # business logic (framework-agnostic)
│  ├─ data/            # the only code that touches SQLite
│  └─ core/            # config, logging, X-API-Key auth, error handling
├─ tests/
│  ├─ conftest.py      # shared fixtures (auth-aware client, fake repo)
│  ├─ unit/            # schema + service tests, no SQLite
│  └─ integration/     # TestClient-driven HTTP tests
├─ ARCHITECTURE.md    # layered design spec — the structural source of truth
├─ spec.md            # behavioral contracts the code-reviewer subagent checks
├─ CLAUDE.md          # project context Claude Code reads every session
├─ .claude/agents/    # a starter code-reviewer subagent
├─ requirements.txt
├─ .env.example       # MINITRACK_API_KEYS and other config
└─ seed_data.py       # optional demo data
```

## Run it
```bash
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                   # set MINITRACK_API_KEYS
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

## Design history
This repo originally shipped with four intentional gaps as Lab 3.1 exercises.
They've since been closed via a layered refactor — see
[ARCHITECTURE.md](ARCHITECTURE.md) for the design and the PIRV migration
sequence that closed them, and [spec.md](spec.md) for the resulting behavioral
contracts:
1. ~~No DELETE endpoint~~ → `DELETE /tasks/{id}`, backed by `TaskRepository.delete_task`.
2. ~~No input validation~~ → non-blank title + `low|medium|high` priority, enforced in `app/schemas/task.py`.
3. ~~No tests~~ → unit + integration suite in `tests/`.
4. ~~`completed` filter ignored~~ → now filters, plus `limit`/`offset` pagination.

## Tests
```bash
pytest -q
```
31 tests across `tests/unit/` (schema validation, service logic against a fake
repository) and `tests/integration/` (auth, health, full `/tasks` CRUD via
`TestClient`), plus the original `tests/test_delete_task.py` and
`tests/test_seed_data.py`.

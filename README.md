# MiniTrack

A minimalist team task tracker — the **Day 3 practice repository** for
K21 Academy *Course 2606: Claude AI*, Module 3 ("Designing Agents for the SDLC").

It is deliberately tiny **and deliberately incomplete**. You will close the gaps
during the labs using Claude Code and the **Plan → Implement → Review → Verify
(PIRV)** loop — no Anthropic API key required, just your Claude Pro subscription.

> MiniTrack is the same theme as the course capstone, so the muscle memory you
> build here pays off again on Day 14.

## Stack
FastAPI · plain `sqlite3` (standard library) · pytest. No ORM, no Docker, no
external services, no API keys.

```
minitrack/
├─ app/
│  ├─ main.py        # routes + Pydantic schemas
│  └─ db.py          # the only module that touches SQLite
├─ tests/            # created during Lab 3.1 (may be empty to start)
├─ CLAUDE.md         # project context Claude Code reads every session
├─ .claude/agents/   # a starter code-reviewer subagent
├─ requirements.txt
└─ seed_data.py      # optional demo data
```

## Run it
```bash
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Open the interactive docs at **http://127.0.0.1:8000/docs**.

Optional — load a few demo tasks:
```bash
python seed_data.py
```

## Endpoints (as shipped)
| Method | Path | Notes |
|---|---|---|
| GET | `/health` | liveness check |
| GET | `/tasks` | list tasks (`?completed=` is accepted but **ignored** — gap #4) |
| GET | `/tasks/{id}` | one task, 404 if missing |
| POST | `/tasks` | create — **no validation yet** (gap #2) |
| PATCH | `/tasks/{id}` | update fields |
| POST | `/tasks/{id}/complete` | mark complete |
| DELETE | `/tasks/{id}` | **does not exist yet** (gap #1) |

## Intentional gaps (your lab targets — don't pre-fix by hand)
1. **No DELETE endpoint** (and no `db.delete_task`). → Lab 3.1, *Implement*
2. **No input validation** on create (blank title, any priority string). → Lab 3.1, *Implement*
3. **No tests.** → Lab 3.1, *Verify*
4. **`completed` filter ignored** on `GET /tasks`. → stretch goal

## Tests
```bash
pytest -q
```
There are no tests until you add them in Lab 3.1 — that's the point: the test
suite is the **verification target** the PIRV loop is built around.

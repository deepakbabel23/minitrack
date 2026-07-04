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

**Requires Python 3.11, 3.12, or 3.13.** Newer versions (3.14+) don't yet have
prebuilt wheels for the pinned `pydantic`, so `pip install` would try to compile it
from source and fail; older versions lack features the app relies on. The included
`.python-version` file pins **3.12** for pyenv/uv/asdf users, so those tools pick a
supported interpreter automatically.

Check your version first:
```bash
python3 --version    # Windows: py --list
```

Then create a virtual environment, install, and run — pick your OS:

### macOS / Linux
```bash
python3.12 -m venv .venv          # or python3.11 / python3.13
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Windows (PowerShell)
```powershell
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open the interactive docs at **http://127.0.0.1:8000/docs**.

Optional — load a few demo tasks:
```bash
python seed_data.py
```

### Troubleshooting
- **`Failed building wheel for pydantic-core`** / `the configured Python interpreter
  version (3.14) is newer than PyO3's maximum supported version (3.13)` — your default
  Python is 3.14+. Create the venv with a supported interpreter explicitly
  (`python3.12 -m venv .venv`, or `py -3.12 -m venv .venv` on Windows) and reinstall.
  After switching interpreters, delete the old environment first (`rm -rf .venv`, or
  `Remove-Item -Recurse -Force .venv` on Windows) so it's rebuilt against the new Python.

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

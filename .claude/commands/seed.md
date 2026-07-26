---
description: Reset and reseed the local MiniTrack database with demo tasks.
---

Reseed the local database so `/tasks` has demo data:

1. Run `.venv/bin/python seed_data.py` from `backend/` — it writes to
   `backend/minitrack.db`.
2. Report how many tasks were inserted and the DB path it printed.
3. If it errors because dependencies are missing, remind me to run
   `pip install -r requirements.txt` from `backend/` first.

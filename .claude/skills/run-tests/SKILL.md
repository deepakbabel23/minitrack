---
name: run-tests
description: Run the MiniTrack pytest suite and summarize any failures. Use when the user wants to run tests, check if tests pass, or verify a change.
---

# Run tests

Run the project's test suite and give a clear pass/fail summary.

## Steps

1. Run `pytest -q` from `backend/` (the venv is `backend/.venv`). Running it from
   the repo root collects nothing useful — `testpaths` is rootdir-relative.
2. If everything passes, report the number of tests that passed.
3. If anything fails:
   - List each failing test by name.
   - For each, give a one-line explanation of why it failed (from the traceback).
   - Point to the relevant file and line.
4. If pytest isn't installed or imports fail, remind the user to run
   `pip install -r requirements.txt`.

## Notes

- Per `CLAUDE.md`, `pytest -q` must pass before any change is considered done.
- `tests/` currently holds **34** tests (`tests/unit/`, `tests/integration/`,
  plus `tests/test_delete_task.py` and `tests/test_seed_data.py`). If the count
  comes back lower, collection failed somewhere — investigate rather than
  reporting a pass. Confirm with `pytest --collect-only -q`.
- This skill covers the Python suite only. The frontend has its own
  (`cd frontend && npm test`, 82 tests) and there is a Playwright end-to-end
  suite in `e2e/` — neither runs under pytest.

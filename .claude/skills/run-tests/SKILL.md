---
name: run-tests
description: Run the MiniTrack pytest suite and summarize any failures. Use when the user wants to run tests, check if tests pass, or verify a change.
---

# Run tests

Run the project's test suite and give a clear pass/fail summary.

## Steps

1. Run `pytest -q` from the project root.
2. If everything passes, report the number of tests that passed.
3. If anything fails:
   - List each failing test by name.
   - For each, give a one-line explanation of why it failed (from the traceback).
   - Point to the relevant file and line.
4. If pytest isn't installed or imports fail, remind the user to run
   `pip install -r requirements.txt`.

## Notes

- Per `CLAUDE.md`, `pytest -q` must pass before any change is considered done.
- The `tests/` directory may not exist yet — if there are no tests, say so
  rather than reporting a false pass.

# MiniTrack Commit Hygiene

The standard commits in this repo are expected to follow. This is the source
of truth the `code-commit-msg` skill applies — read it in full before drafting
a commit message, don't rely on a cached summary of it.

## 1. Atomic commits

One logical change per commit. A commit should be revertable on its own
without dragging in an unrelated change.

Split into separate commits when staged changes:
- Touch unrelated layers for unrelated reasons (e.g. an `app/data/` bug fix
  bundled with an unrelated `app/api/routes/` feature) — see the layer
  boundaries in `CLAUDE.md`.
- Mix formatting-only diffs with logic changes.
- Bundle a refactor with a behavior change — land the refactor first, then
  the behavior change, so each is easy to review and bisect.

It's fine for one commit to span layers when the change genuinely requires
it (e.g. a new resource's schema + service + route + test, scaffolded
together) — atomicity means "one reason to change," not "one file."

## 2. Subject line

- Imperative, present tense: "Add", "Fix", "Refactor", "Remove" — not
  "Added"/"Fixes"/"Refactoring".
- Describes the effect of the change, not the mechanism ("Add DELETE
  /tasks/{id} endpoint", not "Edit tasks.py").
- ≤ 72 characters, no trailing period.
- No conventional-commit type prefixes (`feat:`, `fix:`, etc.) — this repo's
  history doesn't use them; run `git log --oneline` if unsure and match what's
  there.

## 3. Body

- Blank line after the subject.
- Explain *why*, not *what* — the diff already shows what changed. Capture
  the constraint, bug, or motivation that drove the change.
- Wrap prose around 72-80 columns.
- A bullet list is fine for a multi-part change (see `59642db` in this
  repo's history for an example: one paragraph of "why," then bullets for
  the distinct sub-changes).
- Call out breaking changes or required migration/setup steps explicitly.

## 4. Verification before committing

This repo follows the **Plan → Implement → Review → Verify (PIRV)** loop
(see `CLAUDE.md`). A commit is the Verify step made permanent:

- Any behavior change ships with a test in the same commit.
- `pytest -q` passes before the commit is made.
- If the change touches a documented contract, `spec.md` is updated in the
  same commit, not a follow-up.

## 5. What NOT to commit

- `.env`, API keys, or any credentials.
- `minitrack.db` (already gitignored — if it shows up in `git status`,
  something is misconfigured, don't force-add it).
- Editor/OS junk files, commented-out code, debug prints.
- Don't stage with `git add -A` / `git add .` on autopilot — review
  `git status` first so nothing unintended rides along.

## 6. Trailers

Add a `Co-Authored-By` trailer when Claude authored or substantially
assisted the commit:

```
Co-Authored-By: Claude <model name> <noreply@anthropic.com>
```

## 7. Staging discipline

- Stage specific files by name once their contents have been reviewed
  (`git diff`), rather than blanket-adding everything.
- Never amend a commit that's already been pushed/shared; create a new
  commit instead.
- Never use `--no-verify` to skip hooks unless the user explicitly asks —
  fix the underlying issue instead.

See `../templates/commit-message.txt` for the message skeleton this skill
fills in.

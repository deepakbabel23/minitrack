---
name: code-commit-msg
description: Use when the user asks to commit changes, draft or write a commit message, or wants staged changes reviewed before committing. Applies MiniTrack's commit hygiene (atomic commits, imperative subject, why-focused body) from references/commit-hygiene.md.
---

# Code commit message

Help the user land clean, atomic, reviewable commits that follow MiniTrack's
commit hygiene standard.

## Before drafting a message

1. Read `references/commit-hygiene.md` in full — it's the source of truth,
   don't rely on a remembered summary of it.
2. Run `git status` and `git diff --staged` (plus `git diff` for anything
   unstaged) to see exactly what would be committed.
3. Check the staged changes are atomic per the hygiene doc:
   - Unrelated layers changed for unrelated reasons? Flag it and offer to
     split into separate commits.
   - Formatting-only noise mixed with logic changes? Flag it.
   - Anything that shouldn't be committed (`.env`, `minitrack.db`,
     credentials, editor junk)? Flag it before staging/committing anything.

## Drafting the message

Fill in `templates/commit-message.txt`:
- Imperative, present-tense subject, ≤72 chars, no trailing period, no
  `feat:`/`fix:` prefix (check `git log --oneline` if unsure — this repo
  doesn't use conventional-commit prefixes).
- Blank line, then a body explaining *why*, not what.
- Bullets for a multi-part change.
- `Co-Authored-By: Claude <model name> <noreply@anthropic.com>` when Claude
  authored or substantially assisted the change.

## Committing

- Only commit when the user explicitly asks — never commit proactively.
- Stage specific files by name rather than `git add -A`/`git add .`, unless
  the user has already reviewed the full `git status` with you.
- Pass the message via a heredoc so line breaks survive.
- After committing, run `git status` to confirm a clean tree and report the
  commit hash back to the user.

## Notes

- This mirrors the PIRV loop in `CLAUDE.md`: verify (tests pass, `spec.md`
  updated if a contract changed) before drafting the message, not after.
- Full rules: `references/commit-hygiene.md`. Message skeleton:
  `templates/commit-message.txt`.

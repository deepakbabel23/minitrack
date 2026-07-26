# `.claude/` — project configuration for Claude Code

How each subdirectory works, and what MiniTrack currently has in it.

> This file lives at `.claude/` rather than inside `commands/`, `skills/` or
> `agents/` **on purpose**: Claude Code turns every `.md` under `commands/` into a
> slash command, so a `commands/README.md` registers as a stray `/README`. Keep
> documentation out of those directories.

## What's here today

| Path | Contents |
|---|---|
| `agents/` | `frontend-reviewer` + the three Playwright agents (planner, generator, healer) |
| `commands/` | `seed.md` → `/seed` |
| `skills/` | `run-tests/`, `code-commit-msg/` |
| `hooks/` | empty — no hooks are wired |
| `settings.local.json` | machine-local permissions; gitignored |

The Playwright agents bind to the `playwright-test` MCP server declared in the
repo-root [`.mcp.json`](../.mcp.json). See [e2e/README.md](../e2e/README.md) — in
particular the warning about the healer's write access.

---

## Slash commands — `commands/`

Each Markdown file's name becomes the command: `deploy.md` → `/deploy`.

- The file body is the prompt Claude runs when you invoke the command.
- Use `$ARGUMENTS` (or `$1`, `$2`, …) to pass in arguments.
- Optional YAML frontmatter can set `description` and `allowed-tools`.

```markdown
---
description: Reset and reseed the local database.
---

Run `python seed_data.py` from `backend/` and confirm the tasks were inserted.
```

## Skills — `skills/`

Reusable capabilities Claude can invoke by name.

- One directory per skill: `my-skill/SKILL.md`
- `SKILL.md` has YAML frontmatter (`name`, `description`) plus instructions.
- Supporting files (scripts, references) live alongside `SKILL.md`.

```markdown
---
name: run-tests
description: Run the pytest suite and summarize failures.
---

Run `pytest -q` from `backend/`, then report which tests failed and why…
```

## Subagents — `agents/`

One Markdown file per agent, with YAML frontmatter defining name, description,
tools and model.

- Invoke via the Agent tool (`subagent_type: my-agent`), or let Claude pick one
  based on its `description`.

```markdown
---
name: reviewer
description: Reviews Python changes for bugs and style.
tools: Read, Grep, Glob, Bash
model: sonnet
---

You are a code reviewer. Focus on correctness and readability…
```

## Hooks — `hooks/`

Scripts that run automatically on Claude Code events (`PreToolUse`,
`PostToolUse`, `Stop`, …). Put executable scripts here and wire them up in
`.claude/settings.json`.

**There is no `settings.json` in this repo** — nothing is wired, and `hooks/` is
empty. Create the file if you want hooks; it is tracked (only
`settings.local.json` is gitignored).

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": ".claude/hooks/format.sh" }
        ]
      }
    ]
  }
}
```

Keep hook scripts small and fast — they run on every matching event, and must be
executable (`chmod +x`).

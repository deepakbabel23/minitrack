# Slash commands

Custom slash commands for this project. Each command is a Markdown file whose
name becomes the command: `deploy.md` → `/deploy`.

- The file body is the prompt Claude runs when you invoke the command.
- Use `$ARGUMENTS` (or `$1`, `$2`, ...) to pass in arguments.
- Optional YAML frontmatter can set `description` and `allowed-tools`.

Example `seed.md` (invoked as `/seed`):

```markdown
---
description: Reset and reseed the local database.
---

Run `python seed_data.py` and confirm the tasks were inserted.
```

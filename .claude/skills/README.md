# Skills

Project skills — reusable capabilities Claude can invoke by name.

- One directory per skill: `my-skill/SKILL.md`
- The `SKILL.md` has YAML frontmatter (`name`, `description`) plus instructions.
- Supporting files (scripts, references) live alongside `SKILL.md`.

Example `run-tests/SKILL.md`:

```markdown
---
name: run-tests
description: Run the pytest suite and summarize failures.
---

Run `pytest -q`, then report which tests failed and why...
```

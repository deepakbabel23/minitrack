# Subagents

Custom subagents for this project. Each agent is a Markdown file with YAML
frontmatter defining its name, description, tools, and model.

- One file per agent: `my-agent.md`
- Invoke via the Agent tool (`subagent_type: my-agent`) or let Claude pick it
  automatically based on the `description`.

Example `reviewer.md`:

```markdown
---
name: reviewer
description: Reviews Python changes for bugs and style.
tools: Read, Grep, Glob, Bash
model: sonnet
---

You are a code reviewer. Focus on correctness and readability...
```

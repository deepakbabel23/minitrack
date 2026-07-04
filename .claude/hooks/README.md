# Hooks

Scripts that run automatically on Claude Code events (e.g. `PreToolUse`,
`PostToolUse`, `Stop`). Put the executable scripts here and wire them up in
`.claude/settings.json`.

Example `.claude/settings.json`:

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

Keep hook scripts small and fast — they run on every matching event. Make them
executable (`chmod +x`).

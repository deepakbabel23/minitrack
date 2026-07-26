# e2e — Playwright end-to-end tests

The third verification surface, alongside `backend/` (pytest) and `frontend/`
(vitest). **16 tests** driving the real SPA against the real API — the only thing
in this repo that proves both halves work together.

It also carries the Playwright **Planner / Generator / Healer** agents, which were
produced by actually running `npx playwright init-agents --loop=claude` against
Playwright **1.62.0** — not a hand-written approximation. Those three now live in
the repo-root [`.claude/agents/`](../.claude/agents/) so they work from a normal
session, and [`.mcp.json`](../.mcp.json) is at the root for the same reason.

Regenerate the agent definitions after every Playwright upgrade with
`npx playwright init-agents --loop=claude`, then move the three files back to
`.claude/agents/`.

## Run it

```bash
cd e2e
npm ci
npx playwright install chromium   # first time only
npx playwright test               # 16 tests
npx playwright show-report
```

`playwright.config.ts` boots **both halves itself** — uvicorn on `:8000` from
`../backend`, Vite on `:5173` from `../frontend` — so there is nothing to start
first. It does need `backend/.env` to exist (`cd backend && cp .env.example .env`).

Verify the wiring before anything else:

```bash
npx playwright test tests/seed.spec.ts
```

If that lands on `/connect`, the API key is wrong — fix it first, or the Planner
will write you a detailed test plan about the connect screen.

## Layout

| Path | What |
|---|---|
| `tests/seed.spec.ts` | environment bootstrap — asserts the key is set, injects it, confirms `/tasks` doesn't bounce to `/connect` |
| `tests/fixtures.ts` | auto-connected `page`, plus an `api` fixture that creates and tears down tasks over HTTP |
| `tests/task-detail.spec.ts` | 8 tests — `/tasks/:taskId` |
| `tests/task-edit.spec.ts` | 7 tests — `/tasks/:taskId/edit` |
| `specs/*.md` | the test plans those two spec files were written from |

## Wiring to MiniTrack

Three things this suite knows about the app:

- **The API key** comes from `backend/.env` (`MINITRACK_API_KEYS`, first entry),
  read as text by `playwright.config.ts`. `MINITRACK_API_KEY` in the environment
  overrides it. No secret is hardcoded anywhere.
- **The key is seeded into `sessionStorage`, not typed into the form.**
  `main.tsx` calls `hydrateFromSession()` *before* React mounts, so a key already
  in storage means the app boots connected. `addInitScript`, not a one-off
  `evaluate` — it re-runs before page scripts on every navigation.
- **Ports are pinned with `--strictPort`.** The backend's
  `MINITRACK_CORS_ORIGINS` only allows `:5173`, so a Vite fallback to `:5174`
  turns every request into a CORS failure that looks nothing like a CORS failure.

Two conventions worth keeping: build fixtures through the **API, not the UI** (one
broken create form otherwise fails ten unrelated tests), and delete every task a
test creates — the suite runs `fullyParallel` against a single SQLite file.

### The badge locator exception

`.badge--status-active` / `.badge--status-completed` are the only
implementation-detail selectors in the suite, and they are deliberate. The badges
are spans containing an `aria-hidden` icon, so their text is `○Active` rather than
`Active` — no exact text match reaches them, and there is no role to target. They
must also be scoped to `getByRole('article')`, because the header's "Connected"
chip **reuses `.badge--status-completed`**.

## The agent loop

Plan → generate → run → heal. The Planner explores in a live browser and writes a
plan; the Generator turns one plan scenario into one spec by executing the steps
for real; the Healer debugs failures.

Prune the plan before generating — the Planner over-generates, and every extra
scenario costs a live browser session downstream.

### The one thing to actually watch for

**The Healer has `Edit`, `MultiEdit` and `Write`, plus an instruction to "do the
most reasonable thing possible to pass the test" without asking.** It is good at
"this selector moved" and *cannot distinguish that from* "this requirement changed
on purpose." A test failing because your business logic intentionally changed will
get healed into asserting the new wrong thing — quietly and plausibly.

Commit before healing. `git diff` after. Not optional.

This is also why CI runs `playwright test` but never the agents: healing is a
local, reviewed activity, and you do not want an LLM rewriting assertions inside
your pipeline. See [`.github/workflows/verify.yml`](../.github/workflows/verify.yml).

### Two different MCP servers

| Server | From | For |
|---|---|---|
| `playwright-test` | `init-agents`, declared in the root `.mcp.json` | authoring tests — the `mcp__playwright-test__*` tools the three agents use |
| `@playwright/mcp` | installed separately, global | ad-hoc browsing |

Installing `@playwright/mcp` does not give you the agents. Running `init-agents`
does not give you a general browsing tool.

## Provenance

The three agent definitions, `.mcp.json`, `tests/seed.spec.ts` and the `specs/`
scaffold are all genuine `init-agents` output.

`specs/task-detail.md`, `specs/task-edit.md` and their two spec files were
**written by hand**, shaped like agent output so the loop has something realistic
to extend — don't cite them as examples of what the agents emit.

One scaffold bug worth knowing: `init-agents` writes the seed file to the project
root, but `testDir` is `./tests`, so Playwright refuses to collect it
(`No tests found`). It lives in `tests/` here, which is also where the Generator's
own example expects it.

`--loop` accepts `claude | codex | copilot | opencode | vscode | vscode-legacy`.
There is no `claude-code` value.

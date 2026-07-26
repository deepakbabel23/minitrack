# CLAUDE.md — frontend

Guidance for Claude Code when working under `frontend/`. The root
[CLAUDE.md](../CLAUDE.md) covers the FastAPI backend; this file covers the SPA
that consumes it. Read both — the backend contract is what constrains this code.

## What this is

React 19 + Vite + TypeScript single-page app for MiniTrack, styled with the
**MiniTrack Precision** design system in [src/styles/](src/styles). There are no
accounts: the user pastes an API key on `/connect` and it is held in memory for
the session.

Built with the same **Plan → Implement → Review → Verify (PIRV)** loop as the
backend. The *Review* step here is the
[frontend-reviewer](../.claude/agents/frontend-reviewer.md) subagent — run it
after any change under `frontend/`.

## Exact versions

> **[package-lock.json](package-lock.json) is authoritative, not this table.**
> Re-read it (or run `npm ls --depth=0`) and correct this table on any
> disagreement. **Never state a version you haven't read from the lockfile.**

Declared range → what the lockfile actually resolved. Four have drifted above
their declared floor; quote the **resolved** column.

| Package | Declared | Resolved |
|---|---|---|
| react / react-dom | `^19.2.7` | **19.2.8** ← drifted |
| react-router-dom | `^7.18.1` | **7.18.1** |
| vite | `^8.1.1` | **8.1.5** ← drifted |
| @vitejs/plugin-react | `^6.0.3` | **6.0.4** ← drifted |
| typescript | `~6.0.2` | **6.0.3** ← drifted |
| vitest | `^4.1.10` | **4.1.10** |
| jsdom | `^29.1.1` | **29.1.1** |
| oxlint | `^1.71.0` | **1.75.0** ← drifted |
| @testing-library/react | `^16.3.2` | **16.3.2** |
| @testing-library/jest-dom | `^6.9.1` | **6.9.1** |
| @testing-library/user-event | `^14.6.1` | **14.6.1** |
| @types/node | `^24.13.2` | **24.13.3** ← drifted |
| @types/react / @types/react-dom | `^19.2.17` / `^19.2.3` | **19.2.17** / **19.2.3** |

That is the whole dependency list — 3 runtime, 12 dev, nothing else. Node is
**unpinned**: no `engines` field, no `.nvmrc` (currently running v24.12.0 /
npm 11.6.2).

## Commands

Node/npm, from this directory. The backend must be running on
`http://127.0.0.1:8000` with `MINITRACK_API_KEYS` **and**
`MINITRACK_CORS_ORIGINS` set, or every request fails its CORS preflight (the
`X-API-Key` header makes each one preflighted).

```bash
cp .env.example .env      # VITE_API_BASE_URL only — never an API key
npm install
npm run dev               # http://localhost:5173
npm run typecheck         # tsc -b
npm run lint              # oxlint
npm test                  # vitest run
npm run test:watch        # vitest
npm test -- src/api/tasks.test.ts   # a single file
```

`npm run typecheck && npm run lint && npm test` is the gate before calling a
change done. See [MANUAL_TESTING.md](MANUAL_TESTING.md) for the checks Vitest
structurally cannot make (focus management, contrast, real screen readers, the
real backend).

## Architecture

Layered the same way the backend is, so each module has one reason to change:

- `src/api/` — the only code that talks to the server. **No React imports.**
  `client.ts` is the single `fetch` wrapper (base URL, `X-API-Key`, error
  normalization, the 401 handler); `tasks.ts` wraps the six `/tasks` endpoints;
  `errors.ts` owns `ApiClientError` and status-based fallback messages.
- `src/auth/` — `apiKeyStore.ts` is a plain observable store (no React) that
  `client.ts` pulls from; `ApiKeyContext.tsx` exposes it to components via
  `useSyncExternalStore`; `ProtectedRoute.tsx` gates the `/tasks*` routes.
- `src/components/` — reusable presentational UI. No fetching.
- `src/pages/` — one per route; coordinates a whole screen and owns its data
  fetching, loading/error/empty states, and navigation.
- `src/hooks/` — packaged stateful behaviour (`useTaskList`, `useFlash`,
  `useStatusFilter`).
- `src/types/index.ts` — the wire contracts, mirroring `app/schemas/`.
- `src/styles/` — the design system. See "Styling" below.

Wiring lives in [src/main.tsx](src/main.tsx): it hydrates the stored key *before*
React mounts, registers `setApiKeyProvider` (a **pull**, not a push — React runs
child effects before parent effects, so a pushed key would lose the race and 401
on first load), and registers the mid-session 401 handler that disconnects the
session so `ProtectedRoute` redirects declaratively.

Keep that boundary when adding features: network calls go in `src/api/`;
screen-level state goes in a page or a hook; anything reused across screens
becomes a component. Never call `fetch` outside `src/api/client.ts`.

Diagrams: *Frontend components* in
[docs/diagrams/architecture.md](../docs/diagrams/architecture.md) draws this module
graph including the provider inversion above;
[docs/diagrams/sequences.md](../docs/diagrams/sequences.md) has eight end-to-end
flows; and [docs/diagrams/flows.md](../docs/diagrams/flows.md) has the route/guard
map and the `useTaskList` state machine.

## Backend contract — the load-bearing constraints

The full checklist is in
[.claude/agents/frontend-reviewer.md](../.claude/agents/frontend-reviewer.md);
the behavioral source of truth is [spec.md](../spec.md). The parts that bite:

- **A task has exactly five fields**: `id`, `title`, `description`, `priority`,
  `completed`. No due dates, assignees, tags, comments or subtasks. Don't invent
  them in `src/types/` hoping the backend follows.
- **`PATCH /tasks/{id}` is a full replacement**, not a partial update — it binds
  the same `TaskIn` model as POST. Omitting `description` writes NULL; omitting
  `priority` resets it to `"medium"`. Always send all three; that's why the
  wrapper is named `replaceTask`.
- **Completion is one-way.** There is no reopen endpoint and PATCH cannot change
  `completed`. Don't add a Reopen button. `TaskInput` types `completed` as
  `never` to make it a compile error.
- **No trailing slash on `/tasks`.** `/tasks/` triggers Starlette's 307, and a
  redirect on a cross-origin request carrying `X-API-Key` needs a second
  preflight that browsers frequently fail.
- **A 422 `detail` is a plain string**, not FastAPI's array of `{loc, msg,
  type}` — `app/core/errors.py` joins them with `"; "`. Only read `detail` when
  it's a string.
- **A 401 body has no `request_id`** (404 and 422 do), and `X-Request-ID` isn't
  in `expose_headers`, so JS can't read it cross-origin.
- **An unhandled 500 returns `text/plain`.** Error bodies are read with `.text()`
  and parsed defensively — never `.json()`.
- **`GET /tasks` returns a bare array with no total**, which is why pagination is
  "Load more" rather than numbered pages, and why `useTaskList` tracks
  `nextOffset` as a counter instead of deriving it from `tasks.length`. The page
  size is `PAGE_SIZE = 20` in [src/api/tasks.ts](src/api/tasks.ts) — well inside
  the backend's `limit` ceiling of 200.

## API key handling

The key is a credential, and this app is careful with it:

- Held in memory; persisted to `sessionStorage` **only** after the user opts in
  on `/connect`, having been shown the trade-off. The key is
  `"minitrack_api_key"` ([src/auth/apiKeyStore.ts](src/auth/apiKeyStore.ts)) —
  the Playwright suite hardcodes the same string to pre-seed a connected
  session, so renaming it breaks the e2e tests. Every storage access is
  try/caught (Safari private mode, sandboxed frames).
- Never logged, never put in a URL, never read from a `VITE_*` variable — those
  are inlined into the bundle and shipped to every visitor. There is deliberately
  no `VITE_API_KEY` in `.env.example`; don't add one.
- Sent only on `/tasks*` paths, never to `/health`.
- Connect-screen validation hits `/tasks?limit=1` with an **explicit** key
  (`options.apiKey`), not `/health` — health is public and would accept a wrong
  key — and an explicit key deliberately bypasses the global 401 handler so a
  rejected candidate can't tear down a live session.

## Styling

[src/styles/](src/styles) is the **single source** for the design system. It used
to be a byte-for-byte copy of a `src/styles/` at the repo root, kept in sync by
hand; that duplicate is gone, so edit these files directly.

`tokens.css`, `typography.css`, `components.css` and `index.css` are *derived*
from [DESIGN.md](../DESIGN.md) — the spec that names every colour, type step and
spacing value. Change a token there first and re-derive rather than hand-tuning a
hex value here. Style components by applying the global classes these files
already define (`.btn`, `.form-field`, `.badge`, `.task-card`, `.dialog`,
`.text-*`).

`preview.html` is a standalone showcase of those classes — open it directly in a
browser, no build step. It is the fastest way to see what already exists before
writing a new rule.

`app-shell.css` is the one stylesheet this app authors: the page shell plus the
few things the delivered system omits (`<select>`, the segmented filter, flash,
empty states, `<dialog>` overrides). It reads only from `tokens.css` — never
invent a colour or spacing value. It loads *before* `index.css`, so anything here
that must beat a delivered rule has to win on specificity, not source order.

## TypeScript configuration

TypeScript **6.0.3**, project references: [tsconfig.json](tsconfig.json) is a
stub that references [tsconfig.app.json](tsconfig.app.json) (`src/`) and
`tsconfig.node.json` (`vite.config.ts`). `npm run typecheck` is `tsc -b`.

The compiler settings that change what you're allowed to write:

- **`erasableSyntaxOnly`** — no `enum`, no `namespace`, no constructor parameter
  properties, no old-style decorators. Anything that emits runtime code from
  type syntax is a compile error. Use a `const` object + union type where you'd
  reach for an `enum` (see `Priority` in [src/types/index.ts](src/types/index.ts)).
- **`verbatimModuleSyntax`** — type-only imports must be written
  `import type { Task } from ...`, or the import survives into the bundle.
- **`noUnusedLocals` / `noUnusedParameters`** — an unused binding fails the
  build, not just the linter.
- **`strict` is not set in any tsconfig** — it doesn't need to be, because
  TypeScript 6 enables it by default. `noImplicitAny` etc. *are* active. Don't
  "fix" its absence by adding it, and don't assume it's off.
- `moduleResolution: "bundler"`, `jsx: "react-jsx"` (no `import React` needed),
  `target: es2023`, `noEmit` (Vite does the emitting).

## Testing conventions

Vitest **4.1.10** + Testing Library + jsdom **29.1.1**. **There is no
`vitest.config.*`** — the config is inlined under `test:` in
[vite.config.ts](vite.config.ts): `environment: "jsdom"`, `globals: true`,
`setupFiles: ["./src/test/setupTests.ts"]`, `restoreMocks: true`, `css: false`.
Tests live next to their subject as `*.test.ts(x)` — currently **12 files, 86
tests**, including [src/test/architecture.test.ts](src/test/architecture.test.ts),
which fails the build if `fetch` escapes `client.ts`, if `src/api/` imports React
or the auth store, or if the e2e suite's sessionStorage key drifts from the app's.
Verify the count with `npm test`; don't quote it from a doc.

- `fetch` is stubbed via [src/test/fetchMock.ts](src/test/fetchMock.ts) — no test
  hits a real server.
- [src/test/setupTests.ts](src/test/setupTests.ts) polyfills `<dialog>`'s
  `showModal`/`close` far enough to assert state transitions, and no further.
- Test behaviour through the DOM (roles, labels, visible text), not internals.
- Cover the contract, not the styling: error normalization, the
  full-replacement PATCH, Load-more semantics, the two-tier 401, the absence of a
  Reopen affordance.

## Stack constraints

React + react-router-dom + Vite + TypeScript + Vitest, and nothing else. **No UI
component library, no CSS framework, no state-management library, no data-fetching
library** — the design system is hand-rolled CSS and server state lives in the
hooks under `src/hooks/`. Adding a dependency is a decision to raise with the
user, not to make silently.

Absences that are routinely assumed into existence — check before you configure:

- **The linter is `oxlint`, not ESLint.** ESLint is in neither `package.json`
  nor the lockfile. Never create `.eslintrc*` or `eslint.config.js`.
- **jsdom only** — happy-dom is not installed.
- **No Prettier**, no `.prettierrc`, no format script. Match surrounding style
  by hand.
- **No coverage provider** (`@vitest/coverage-v8` is absent) — `npm test -- --coverage`
  will fail.
- **No `vitest.config.*`** — see "Testing conventions" above.
- **No Playwright here.** The e2e suite lives in the repo-root
  `e2e/` folder; `frontend/` is Vitest + jsdom only. See the
  root [CLAUDE.md](../CLAUDE.md).

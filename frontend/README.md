# MiniTrack frontend

React + Vite + TypeScript SPA for the MiniTrack task tracker. It consumes the
FastAPI backend in the parent directory and the **MiniTrack Precision** design
system in [`src/styles/`](src/styles).

## Running it

The backend must be running first, and it must allow this origin — CORS is off
by default, and the `X-API-Key` header makes every request preflighted, so
without it the very first call fails:

```bash
# from the repo root, in its own terminal
source .venv/bin/activate
cp .env.example .env          # MINITRACK_API_KEYS + MINITRACK_CORS_ORIGINS
python seed_data.py
uvicorn app.main:app --reload --env-file .env    # http://127.0.0.1:8000
```

```bash
# here
cp .env.example .env          # VITE_API_BASE_URL, optional
npm install
npm run dev                   # http://localhost:5173
```

Connect with the key from the backend's `.env` (the demo value is
`demo-key-123`). There are no accounts — you connect with an API key rather
than signing in.

```bash
npm run typecheck && npm run lint && npm test
```

## Layout

| Path | Role | Rough FastAPI analogy |
|---|---|---|
| `src/api/` | Talk to the server. No React imports, so it's testable standalone. | httpx client |
| `src/auth/` | Hold the key, gate the routes. | auth dependency |
| `src/components/` | Reusable UI. | reusable helpers |
| `src/pages/` | Coordinate a whole screen. | route handler |
| `src/hooks/` | Packaged stateful behaviour. | reusable helper |
| `src/types/` | Data shapes. | Pydantic schemas |
| `src/styles/` | The design system. | shared config |

## Styling

`tokens.css`, `typography.css`, `components.css` and `index.css` are copied
**byte-for-byte** from the repo root's `src/styles/` and are never edited here —
re-copy them if the design system changes. Components are styled by applying the
global classes those files already define (`.btn`, `.form-field`, `.badge`,
`.task-card`, `.dialog`, `.text-*`).

`app-shell.css` is the one stylesheet this app authors. The delivered system
covers components only, so it supplies the page shell — reusing the `.page` /
`.panel` / `.row` / `.stack` names from `src/styles/preview.html` — plus the few
things the system leaves out: a `<select>`, the segmented filter, flash, empty
states, and the overrides a native `<dialog>` needs. It reads only from
`tokens.css`; no colour or spacing is invented.

Note it loads *before* `index.css`, so anything here that needs to beat a
delivered rule must win on specificity rather than source order.

## Backend contract worth knowing

A task has exactly five fields: `id`, `title`, `description`, `priority`,
`completed`. Beyond that:

- **`PATCH /tasks/{id}` is a full replacement.** Omitting `description` writes
  NULL; omitting `priority` resets it to `"medium"`. Always send all three.
- **Completion is one-way.** There is no reopen endpoint, and PATCH cannot
  change `completed`. Don't add a Reopen button.
- **A 422 `detail` is a plain string**, not an array of `{loc, msg, type}`.
- **A 401 body has no `request_id`** (404 and 422 do), and `X-Request-ID` isn't
  in `expose_headers`, so JS can't read it cross-origin.
- **An unhandled 500 returns `text/plain`**, so error bodies are read as text
  and parsed defensively.
- **`GET /tasks` returns a bare array with no total**, which is why pagination
  is "Load more" rather than numbered pages.

`.claude/agents/frontend-reviewer.md` in the repo root encodes all of this as a
review checklist.

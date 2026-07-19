# MiniTrack Frontend — Core Build Runbook (short slot)

**The tighter, ~60–90 min version** of the live build for K21 Academy, Course
2606. It covers the essentials of **design-to-code**: scaffold + connect → list →
create → detail. The remaining acts (edit, mid-session 401, the reviewer pass,
tests) are listed at the end as follow-ups the room can extend into.

> For the full 8-act build, the design-generation aside, and every gotcha, use
> **`RUNBOOK.md`** in this folder. This file is the same method, trimmed.

Run this **from inside `minitrack_backend/`**. The app builds into a new
`frontend/` subfolder here; the FastAPI backend in `app/` serves the JSON API.

---

## Cheat-sheet (keep on screen)

Task shape — invent nothing else:

```
Task      { id, title, description: string|null, priority: "low"|"medium"|"high", completed }
TaskInput { title, description: string|null, priority }
```

Endpoints: `GET /tasks` (filter `?completed`, page `?limit&offset`, **no total**),
`GET /tasks/{id}`, `POST /tasks` (201), `PATCH /tasks/{id}` (**full replace**),
`POST /tasks/{id}/complete` (**no reopen**), `DELETE /tasks/{id}` (204).

The three gotchas this short path hits:
1. **422 `detail` is a string**, not an array — never `detail[0].msg`.
2. **Connect validates via `GET /tasks`**, not `/health`.
3. **Load more**, not numbered pages (no total count) — hide on a short page,
   reset on filter change.

Commands:

```bash
# backend (own terminal)
source .venv/bin/activate
cp .env.example .env        # set MINITRACK_API_KEYS=demo-key-123
python seed_data.py
uvicorn app.main:app --reload --env-file .env      # :8000

# frontend (built during the demo)
cd frontend && npm run dev                          # :5173
```

---

## Act 0 — Pre-flight (2 min, no code)

Point at the two inputs: the **design system** (`DESIGN.md` +
`src/styles/*.css`; open `src/styles/preview.html` to show it) and the **backend
contract** (`app/` + the cheat-sheet). We build a client for a real API and
invent no fields. Start the backend (commands above) and confirm
`http://127.0.0.1:8000/docs` responds.

---

## Act 1 — Scaffold + design system + Connect

**Learn.** Stand up the app, wire in the delivered CSS, build the API-key entry.

```
Build a new React frontend for MiniTrack in a `frontend/` subfolder here, with
Vite + React + TypeScript. Read DESIGN.md and src/styles/*.css first — that's our
finished design system. Copy DESIGN.md and the four files
src/styles/{tokens,typography,components,index}.css into frontend/src/styles/,
and import ./styles/index.css ONCE in main.tsx. Style everything with the design
system's GLOBAL classes (.btn, .form-field, .badge, .task-card, .dialog) — do NOT
write new CSS Modules.

Add react-router-dom with routes /connect, protected /tasks, /tasks/new,
/tasks/:taskId, /tasks/:taskId/edit, and a * NotFound, inside a Layout with a
sticky header (MiniTrack wordmark + Disconnect). Build a framework-agnostic fetch
client (src/api/client.ts): base URL from VITE_API_BASE_URL (default
http://127.0.0.1:8000), header X-API-Key on every /tasks* call, throw an
ApiClientError { status, detail:string, request_id? } on non-2xx (status:0 on
network failure), handle 204. Wrap endpoints in src/api/tasks.ts. Add an
ApiKeyContext holding the key in memory (sessionStorage only as an explicit
opt-in; never logged, never in a URL, never a VITE_* var). Build the /connect
page: password field with show/hide, "remember this session" checkbox, a
.btn--primary "Connect" button, inline error. VALIDATE the key with GET
/tasks?limit=1 (NOT /health): 200 -> go to /tasks; 401 -> "That API key was
rejected." Add frontend/.env.example (VITE_API_BASE_URL=http://127.0.0.1:8000)
and gitignore .env. Run the dev server.
```

**Gotcha.** Validate against `GET /tasks`, not `/health` (health ignores the key).

**Verify.** `/connect` renders in the Indigo design system; a wrong key is
rejected; `demo-key-123` lands on `/tasks`.

---

## Act 2 — Task list: filters, Load more, complete & delete

**Learn.** URL-driven filters and pagination with no total count.

```
Build /tasks. A "Tasks" heading + a "Create task" button (.btn--primary) to
/tasks/new. A segmented All / Active / Completed filter reflected in the URL
(?status=active -> completed=false, ?status=completed -> completed=true);
changing it RESETS pagination. Render each task as a .task-card with title, a
2-line description preview, a PriorityBadge and StatusBadge (small components
emitting .badge--priority-high|medium|low with ▲ ● ▼ and
.badge--status-active|completed with ✓ — icon + label, never color alone). Per
card: View, Edit, Complete (active only) -> POST /tasks/{id}/complete, Delete via
an accessible .dialog confirm -> DELETE (204). Pagination is "Load more", NOT
numbered pages: request a fixed limit, append, raise offset, and HIDE "Load more"
when a page returns fewer than limit items. States: loading, loaded, empty
(tailored to the filter), error+Retry. Use aria-live for action results.
```

**Gotcha.** No total → **Load more**, hidden on a short page, reset on filter change.

**Verify.** Filter chips change the URL and list; Complete moves a task; Delete
asks first.

---

## Act 3 — Create task: shared form + validation

**Learn.** A reusable form matching backend validation exactly.

```
Build /tasks/new -> POST /tasks (201). Extract a reusable <TaskForm> + <FormField>
(emitting the .form-field classes) that Create and Edit will share. Fields: title
(required), description (optional multiline), priority select (low/medium/high,
default medium). Trim the title and block a whitespace-only title client-side
before any request. Disable submit while in flight. On a backend 422, render its
`detail` STRING inline near the form — never treat detail as an array. On success,
navigate to the new task (or list) with a confirmation.
```

**Gotcha.** The **422 `detail` is a string**; `detail[0].msg` throws.

**Verify.** A blank title is blocked before any call; a forced 422 renders inline.

---

## Act 4 — Task detail: only real actions

**Learn.** Model the screen as explicit states; show only capabilities the API has.

```
Build /tasks/:taskId -> GET /tasks/{id} as a discriminated-union state
(loading | loaded | notfound | error). Show id, title, full description,
PriorityBadge + StatusBadge. Actions: Edit, Complete (ONLY when active) -> POST
/tasks/{id}/complete, Delete (with the .dialog confirm) -> DELETE, and Back to
tasks. There is NO "Reopen" action. Unknown id -> 404 -> a friendly "Task not
found" with a link back.
```

**Gotcha.** **No Reopen** — completion is one-way; the backend has no un-complete
endpoint. A 404 is a first-class "not found" state.

**Verify.** A completed task shows no Reopen; `/tasks/999999` → "Task not found."

---

## Wrap + where to go next

You built a connected, filterable, create/read task app from a delivered design
system — by prompting, with the contract front-loaded so it was right the first
time. To continue (full steps in **`RUNBOOK.md`**):

- **Act 5 — Edit:** `PATCH` is a **full replacement** — submit the whole object,
  never touch `completed`; extract a shared `useFlash` hook.
- **Act 6 — Mid-session 401:** clear the key + redirect to `/connect`.
- **Act 7 — Review:** run the read-only `frontend-reviewer` subagent against the
  build.
- **Act 8 — Verify:** add the Vitest/RTL suite + `MANUAL_TESTING.md`; run
  `npm run typecheck && npm run lint && npm test`.

# MiniTrack Frontend — Live Build Runbook

**Facilitator script for K21 Academy, Course 2606: Claude AI.** This is the
copy-paste prompt sequence for building the entire MiniTrack **React + Vite +
TypeScript** frontend, live, by prompting **Claude Code** — consuming the
**"MiniTrack Precision"** design system that already lives in this repo
(`DESIGN.md` + `src/styles/*.css`).

You run this **from inside `minitrack_backend/`** (this repo). The app gets built
into a new `frontend/` subfolder here. The FastAPI backend in `app/` stays as-is
and serves the JSON API the SPA talks to.

> This reproduces the 8-commit build a previous session did in the sibling
> `minitrack_backend_test_frontend` repo — but this time we hand Claude the
> **finished design system as CSS** and it wires the React components to it.
> The learnings from that build (the backend-contract "gotchas") are baked into
> the prompts below so the room doesn't rediscover them the hard way.

---

## How to use this runbook

- Do the **Acts in order**. Each Act = one teachable slice (and mirrors one
  commit from the original build).
- Each Act has: **Learn** (say this to the room) → **Prompt** (paste into Claude
  Code) → **Refine** (follow-ups if needed) → **Gotcha** (the callout that makes
  this Act worth teaching) → **Verify** (how you confirm it worked on screen).
- Paste each **Prompt** block verbatim. They're written to Claude Code, which can
  read/edit files and run commands in this folder.
- Keep the **backend running** the whole time (Act 0) so every screen makes real
  API calls in front of the room.

---

## Backend contract cheat-sheet (keep this on screen)

The **only** task fields — invent nothing else (no due dates, assignees, tags,
comments, subtasks):

```
Task       { id: number, title: string, description: string | null,
             priority: "low" | "medium" | "high", completed: boolean }
TaskInput  { title, description: string | null, priority }   // no id, no completed
```

Endpoints:

```
GET    /tasks              filter ?completed=true|false, page ?limit&offset (NO total count)
GET    /tasks/{id}
POST   /tasks              -> 201
PATCH  /tasks/{id}         FULL replacement (omitted fields reset; cannot change completed)
POST   /tasks/{id}/complete-> returns updated task (one-way; NO reopen endpoint)
DELETE /tasks/{id}         -> 204 (no body)
```

The four details that bit the original build — **bake these into the code**:

1. A `422` body's `detail` is a **plain joined string**, not an array of
   `{loc,msg,type}`. Never index `detail[0].msg`.
2. `PATCH /tasks/{id}` is a **full replacement** — the edit form submits the
   whole `TaskInput` and never touches `completed`.
3. A `401` body has **no** `request_id` (404/422 do). Every response carries an
   `X-Request-ID` header. So `request_id` is optional.
4. **Connect validates the key against `GET /tasks`**, not `/health` (health
   ignores the key). The key is held in memory, `sessionStorage` only as an
   explicit opt-in; **never** logged, never in a URL, never a `VITE_*` var.

Commands (run in `minitrack_backend/`):

```bash
# backend (leave running in its own terminal)
source .venv/bin/activate
cp .env.example .env               # then set MINITRACK_API_KEYS=demo-key-123
python seed_data.py                # load demo tasks
uvicorn app.main:app --reload --env-file .env    # http://127.0.0.1:8000/docs

# frontend (built during the demo, run from minitrack_backend/frontend/)
npm run dev            # http://localhost:5173
npm run typecheck && npm run lint && npm test
```

---

## Act 0 — Pre-flight (orient the room, no code yet)

**Learn.** Two inputs feed everything today:
1. **A design system** — `DESIGN.md` (the "MiniTrack Precision" spec) plus
   `src/styles/tokens.css`, `typography.css`, `components.css`, `index.css`. Open
   `src/styles/preview.html` in a browser to show the components rendered.
2. **A backend contract** — the FastAPI app in `app/` and the cheat-sheet above.

We are building a client for a real API. We invent **no** fields and add **no**
"Reopen" button — the backend has neither.

> *Optional 5-min aside on the design step:* the sibling repo's
> `frontend/figma-make-runbook.md` shows how a non-coder turns the same brief
> into a clickable prototype in Figma Make / Google Stitch. That prototype is a
> *picture to aim at*; the CSS in `src/styles/` is what the real app actually
> uses. Today we start from that CSS.

**Do (in a spare terminal):** start the backend so live calls work.

```bash
source .venv/bin/activate
cp .env.example .env                 # set MINITRACK_API_KEYS=demo-key-123
python seed_data.py
uvicorn app.main:app --reload --env-file .env
```

**Verify.** `http://127.0.0.1:8000/docs` loads; `GET /tasks` with header
`X-API-Key: demo-key-123` returns the seeded tasks.

---

## Act 0.5 — (Optional) Where the design system came from

*Skip if you're tight on time — the build doesn't need it. Run it when you want
to teach the **design-to-code idea**: how a non-coder turns a one-paragraph brief
into a design system + prototype, and how that becomes the CSS in `src/styles/`.*

**Learn.** The files in `src/styles/` didn't appear by magic. They were
**generated** from a short brief by a design tool (Google **Stitch**), and you
can prototype the *same* brief in **Figma Make**. Same words, two tools — and the
tokens they produce are exactly what `DESIGN.md` + `tokens.css` encode. The
prototype is a **picture to aim at**; the CSS is what the real app actually uses.

> Open **Google Stitch** (stitch.withgoogle.com) or **Figma Make**
> (figma.com → Make). You type a brief into a chat; it generates a design system
> and clickable screens.

**Prompt — establish the design system (paste as the first message).**

```
Design a clean, modern productivity web app called "MiniTrack" — a minimalist
task tracker. Style: Corporate Minimalism — calm, professional, lots of
whitespace. Reuse this system on every screen.

Colors: near-white background (#faf8ff), white content surfaces, slate hairline
borders (#e2e8f0). Text slate-900 (#0f172a), muted #475569. Primary action =
Indigo #4f46e5 (hover #4338ca). Green for completed/success, Red (#dc2626) for
destructive/errors. Priority badges — High: red bg #fee2e2 / text #991b1b;
Medium: amber #fef3c7 / #92400e; Low: blue #dbeafe / #1e40af. Each badge shows
an ICON and a TEXT label — never color alone.

Type: Inter. Spacing on a 4px scale, generous. Corners 8px on cards/inputs/
buttons, pill-shaped badges, 12px on modals. Three soft elevation levels.
Content centered, max width 880px. Sticky header with a "MiniTrack" wordmark
left and a Disconnect control right. Accessible: visible focus rings, real
labels, WCAG AA contrast.

Don't build screens yet — just confirm the design system.
```

**Prompt — generate the five screens (send one at a time, review after each).**
Only these five, and invent **no** fields:

```
1) A "Connect to MiniTrack" screen: centered card, wordmark, a line explaining
   MiniTrack uses an API key (not a username/password), a password-style API-key
   field with show/hide, a "remember for this session" checkbox with a small
   trade-off note, a full-width Indigo "Connect to MiniTrack" button, and an
   inline red error "That API key was rejected."
2) A Tasks screen: sticky header; a "Tasks" title with a "Create task" button;
   a segmented All / Active / Completed filter (Active selected); a list of 4
   task cards (title, 2-line description, a priority badge, a status badge, and
   View / Edit / Complete / Delete actions); a centered "Load more" button.
3) A task detail screen: "Back to tasks" link; a card with title, priority +
   status badges, full description, a small "Task #2" id; actions Edit / Complete
   / Delete. Do NOT add a "Reopen" button.
4) A "New task" form: "Back to tasks" link; Title (required, with an inline
   "Title is required." error), a multiline Description, a Priority dropdown
   (Low/Medium/High, Medium selected); a Cancel + "Save task" row. Same form is
   reused for editing, pre-filled.
5) A friendly 404: big Indigo "404", "Page not found", a short line, a
   "Back to tasks" button. Keep the sticky header.
```

**Talk through it.**
- The prototype *looks* real but has **no backend** — clicking "Connect" doesn't
  validate a key. That's the line between a design prototype and the app we build
  next in React.
- If you have both, compare **Stitch** vs **Figma Make** side by side: same
  brief, two tools, two takes.
- Open `src/styles/preview.html` — the **same tokens**, already turned into CSS.
  *That* file, not the prototype, is what Acts 1–8 consume.

**Gotcha.** These tools will happily invent **due dates / assignees / tags** if
asked — resist it; our API has none. And never paste a real API key into a design
tool: there's nothing to connect it to.

**Verify.** You have a clickable prototype (or the pre-made Stitch screens) that
visually matches `src/styles/preview.html`. Now we make it real.

*(The sibling `minitrack_backend_test_frontend/frontend/figma-make-runbook.md`
has the long-form version of this step if you want more per-screen refinement
prompts.)*

---

## Act 1 — Scaffold + design system + Connect flow
*(mirrors commit `ab8d9c6` — "Add React frontend with API-key Connect flow")*

**Learn.** Stand up the app skeleton, wire in the delivered design system, and
build the auth entry point. MiniTrack has no accounts — you *connect with an API
key*, you don't *sign in*.

**Prompt.**

```
You are building a new React frontend for the MiniTrack task tracker, inside a
new `frontend/` subfolder of this repo (minitrack_backend). Use Vite + React +
TypeScript. Read `DESIGN.md` and `src/styles/{tokens,typography,components,index}.css`
first — that is our finished design system and we will consume it as-is.

Scaffold the app:
1. Create a Vite React+TS project in `frontend/`.
2. Copy `DESIGN.md` and the four files `src/styles/{tokens,typography,components,index}.css`
   into `frontend/src/styles/`. In `main.tsx`, import `./styles/index.css` ONCE
   (it @imports tokens -> typography -> components). We will style everything by
   applying the design system's GLOBAL classes (.btn, .btn--primary, .form-field,
   .badge, .task-card, .dialog, .text-headline-* etc.) — do NOT author new CSS
   Modules; reuse the classes that already exist in components.css/typography.css.
3. Add react-router-dom. Routes: `/connect`, protected `/tasks`, `/tasks/new`,
   `/tasks/:taskId`, `/tasks/:taskId/edit`, and a `*` NotFound. `/` redirects to
   `/tasks` if connected else `/connect`. Wrap protected routes in a
   `ProtectedRoute` that redirects to `/connect` when there is no key, all inside
   a shared `Layout` with a sticky header (MiniTrack wordmark left, Connected /
   Disconnect control right).

Build the API layer (framework-agnostic — no React imports so it's unit-testable):
- `src/types/index.ts`: Task { id:number; title:string; description:string|null;
  priority:"low"|"medium"|"high"; completed:boolean }, TaskInput { title;
  description:string|null; priority }, ApiError { detail:string;
  request_id?:string|null }.
- `src/api/client.ts`: a single fetch wrapper. Base URL from
  import.meta.env.VITE_API_BASE_URL (default http://127.0.0.1:8000). Every /tasks*
  request sends header `X-API-Key: <key>`. On non-2xx, throw an ApiClientError
  carrying { status, detail (STRING), request_id? } parsed from the body when
  present, else a status-based fallback message. A network failure throws
  ApiClientError with status:0 and a "can't reach the server" message — never an
  unhandled rejection. Handle 204 (no body).
- `src/api/tasks.ts`: listTasks({completed?, limit, offset}), getTask(id),
  createTask, replaceTask(id, TaskInput), completeTask(id), deleteTask(id).

Auth + Connect screen:
- `src/auth/ApiKeyContext.tsx`: holds the key in memory; exposes
  useApiKey() { apiKey, isConnected, connect, disconnect }. Opt-in
  "remember for this session" persists to sessionStorage key `minitrack_api_key`
  only after showing the trade-off. The key is NEVER logged, NEVER put in a URL,
  NEVER read from a VITE_* variable.
- `/connect` page: password-style key field with show/hide toggle, a "remember
  for this session" checkbox with a one-line trade-off note, a full-width primary
  "Connect to MiniTrack" button (use .btn .btn--primary), and an inline error
  area. VALIDATE the key by calling GET /tasks?limit=1 (NOT /health). 200 ->
  connect + go to /tasks; 401 -> show "That API key was rejected." and stay.
  States: idle / validating (submit disabled) / error.

Add `frontend/.env.example` with VITE_API_BASE_URL=http://127.0.0.1:8000 and
gitignore `.env`. Then run the dev server and confirm the Connect screen renders
in the MiniTrack Precision styling.
```

**Refine (if needed).**

```
The Connect screen isn't picking up the design system. Confirm main.tsx imports
./styles/index.css, and that the button uses class "btn btn--primary" and the
field uses "form-field" / "form-field__input" from components.css.
```

**Gotcha.** Connect validates against **`GET /tasks`**, not `/health` — health
ignores the key, so it would "accept" a wrong key. And the key stays in memory by
default; `sessionStorage` is opt-in only.

**Verify.** `npm run dev` → `/connect` shows the Indigo primary button + Inter
type. A wrong key → "That API key was rejected."; `demo-key-123` → lands on
`/tasks` (empty shell for now).

---

## Act 2 — Task list: filters, Load more, complete & delete
*(mirrors commit `9d01446`)*

**Learn.** The primary screen. Teach URL-driven filter state and
**offset pagination without a total count**.

**Prompt.**

```
Build the `/tasks` screen using the design system's classes.

- A "Tasks" heading with a "Create task" button (.btn .btn--primary) linking to
  /tasks/new.
- A segmented filter All / Active / Completed, reflected in the URL query
  (?status=active -> completed=false, ?status=completed -> completed=true, absent
  -> all). Changing the filter RESETS pagination.
- Render each task as a .task-card: title, a 2-line description preview, a
  PriorityBadge and a StatusBadge (build these as small components that emit the
  design system's .badge classes: .badge--priority-high|medium|low with icons
  ▲ ● ▼, and .badge--status-active / .badge--status-completed with a ✓). Never
  convey priority/status by color alone — always icon + text label.
- Row actions per card: View, Edit, Complete (only when active), Delete.
- Pagination is "Load more", NOT numbered pages (the API returns no total):
  request a fixed limit (e.g. 20), append results, raise offset by the page size,
  and HIDE "Load more" when a returned page has fewer than `limit` items.
- Complete calls POST /tasks/{id}/complete and updates the row in place. Delete
  opens an accessible confirm dialog (use the .dialog / .dialog-overlay classes,
  a native <dialog>) and on confirm calls DELETE /tasks/{id} (204) then removes
  the row.
- States: loading, loaded, empty (message tailored to the filter, e.g. "No
  active tasks"), and error with a Retry button. Use aria-live to announce the
  result of complete/delete.
```

**Gotcha.** No total count → **Load more**, hidden on a short page, reset on
filter change. Don't compute "X of Y" or numbered pages from one loaded page.

**Verify.** Filter chips change the URL and the list. Complete moves a task to
"Completed"; Delete asks first, then removes. With few seeded tasks, "Load more"
is hidden.

---

## Act 3 — Create task: shared form + validation
*(mirrors commit `1eb8c15`)*

**Learn.** A reusable form and matching the backend's validation exactly.

**Prompt.**

```
Build `/tasks/new` -> POST /tasks (201). Extract a reusable <TaskForm> and a
<FormField> (label + control + optional inline error) that emit the design
system's .form-field classes, so Create and Edit share them.

- Fields: title (required), description (optional multiline), priority select
  (low / medium / high, default medium).
- Trim the title; block a whitespace-only title client-side BEFORE any request.
- Disable the submit button while the request is in flight (no double POST).
- If the backend returns 422, render its `detail` STRING inline near the form.
  Do NOT treat detail as an array — never access detail[0].msg.
- On success, navigate to the new task (or the list) and show a confirmation.
```

**Gotcha.** The **422 `detail` is a string** (`"body.title: String should have at
least 1 character"`), not `[{msg}]`. Rendering `detail[0].msg` throws.

**Verify.** Submitting a blank title is blocked before any network call. Force a
backend 422 (e.g. temporarily bypass the client trim) → the string renders inline.

---

## Act 4 — Task detail: only the actions that exist
*(mirrors commit `2aaf787`)*

**Learn.** Model a screen as explicit states, and show only real capabilities.

**Prompt.**

```
Build `/tasks/:taskId` -> GET /tasks/{id}. Model it as a discriminated-union
state: loading | loaded | notfound | error. Show id, title, full description,
PriorityBadge and StatusBadge. Actions: Edit (.btn), Complete (only when the task
is active) -> POST /tasks/{id}/complete, Delete (with the confirm dialog) ->
DELETE, and a "Back to tasks" link. There is NO "Reopen" action. An unknown id
returns 404 -> render a friendly "Task not found" with a link back.
```

**Gotcha.** **No Reopen** — the backend has no un-complete endpoint. Completion is
one-way. A `404` is a first-class "not found" state, not a crash.

**Verify.** Open a real task; Complete hides once done and no Reopen appears.
Visit `/tasks/999999` → "Task not found."

---

## Act 5 — Edit: full-replacement PATCH + shared useFlash
*(mirrors commit `7a30a7d`)*

**Learn.** The subtlest contract rule of the day, and a small refactor.

**Prompt.**

```
Build `/tasks/:taskId/edit` -> PATCH /tasks/{id}, reusing <TaskForm> in edit
mode. Load the full task first and pre-fill the fields.

CRITICAL: PATCH is a FULL REPLACEMENT on this backend — omitted fields reset
(description -> null, priority -> medium). So submit the ENTIRE TaskInput (title,
description, priority) every time, never a partial payload. The form must NEVER
send or touch `completed` (PATCH cannot change it). Same validation and 422
handling as Create; unknown id -> the 404 state.

Also extract a shared `useFlash` hook for the transient success message and reuse
it on the list and detail screens.
```

**Gotcha.** PATCH here is **not** a partial update. Sending only the changed field
silently wipes the others. Always send the whole object; never include
`completed`.

**Verify.** Edit only the title, save → description/priority are preserved (not
reset). `completed` is untouched.

---

## Act 6 — Mid-session 401: clear the session and redirect
*(mirrors commit `d313a63`)*

**Learn.** Handle a key that stops working *after* you connected (revoked/expired).

**Prompt.**

```
Handle a mid-session 401 globally. Add `setUnauthorizedHandler` to the API client;
when any /tasks* request returns 401 while a stored key is in use, clear the key
from memory and sessionStorage, record a reason, and redirect to /connect. The
Connect page shows that reason ("Your API key was rejected — please reconnect.").
Remember: a 401 body has NO request_id, so don't rely on it here.
```

**Gotcha.** A `401` mid-session must **reset the session**, not just show an error
in place — otherwise the user is stuck on a screen that can't load. And 401 has no
`request_id`.

**Verify.** Connect, then in the backend `.env` remove/replace the key and reload
uvicorn; the next action bounces you to `/connect` with the reason shown.

---

## Act 7 — Review pass with the `frontend-reviewer` subagent
*(mirrors commit `1a0bf22`)*

**Learn.** This is the **Review** step of PIRV — a read-only agent that checks the
build against the contract and accessibility, so we're not the only reviewer.

**Prompt.**

```
Create `.claude/agents/frontend-reviewer.md` in this repo: a read-only reviewer
(tools: Read, Grep, Glob, Bash) that checks the frontend against our backend
contract and accessibility, in priority order: (1) invented/unsupported features
or a Reopen action, (2) correct endpoint usage and Connect validating via GET
/tasks, (3) PATCH sends the FULL TaskInput and never `completed`, (4) API-key
safety (never logged/in-URL/in a VITE_* var; sessionStorage opt-in only),
(5) loading/empty/error states and that 422 detail is treated as a STRING and a
mid-session 401 resets the session, (6) accessibility (semantic HTML, real
labels, visible focus, keyboard-trapped dialog, aria-live, status/priority not by
color alone), (7) Load-more pagination semantics, (8) tests exist and pass. It
reports concrete file:line findings and does not edit code.

Then run that reviewer against `frontend/` and fix what it finds — expected:
move focus to the "Tasks" heading and announce (role="status") after list
complete/delete, extract a shared error->message helper (`src/api/errors.ts`
`toDisplayError`), and confirm `.env` is gitignored.
```

**Gotcha.** Teach the loop, not just the code: **Plan → Implement → Review →
Verify**. The reviewer encodes the contract so regressions get caught
automatically.

**Verify.** The reviewer runs and returns findings; after fixes, a second run is
clean.

---

## Act 8 — Verify: tests + manual guide
*(mirrors commit `13ec334`)*

**Learn.** Close the loop with automated + manual verification.

**Prompt.**

```
Add a Vitest + React Testing Library suite (jsdom) covering the load-bearing
behaviors: the API client (error normalization, 422 string, network status:0,
204), the Connect flow (validate via GET /tasks, 401 message), Load-more
(hidden on short page, reset on filter change), detail (no Reopen, 404 state),
and edit (full-object PATCH). Add a jsdom polyfill for native <dialog>
(showModal/close) in setupTests. Wire scripts: `typecheck` (tsc), `lint`, and
`test` (vitest run). Also write a `MANUAL_TESTING.md` with the keyboard/
screen-reader and confirm-and-delete cases that aren't automated.

Run `npm run typecheck && npm run lint && npm test` and make them green.
```

**Gotcha.** Native `<dialog>` needs a jsdom polyfill or dialog tests fail. Tests
here are *tests-after* — they lock the contract we already built.

**Verify.** `npm run typecheck && npm run lint && npm test` all pass. Walk
`MANUAL_TESTING.md` once on screen (tab through the list, open/confirm the delete
dialog with the keyboard).

---

## Wrap (say this to the room)

- We started from a **finished design system as CSS** and a **real API contract**,
  and built a complete, accessible React SPA — screen by screen — by prompting.
- The value wasn't typing speed; it was **front-loading the contract** (422
  string, full-replacement PATCH, no-total pagination, no Reopen, key safety) so
  the build was right the first time, then letting a **reviewer agent** and
  **tests** prove it.
- To extend: add a new field end-to-end (backend `spec.md` first, then type →
  client → form → tests) and watch the reviewer keep you honest.
```

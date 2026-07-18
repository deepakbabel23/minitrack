# FRONTEND SPEC

Source-of-truth specification for the MiniTrack React frontend. This is the
behavioral contract the `frontend-reviewer` subagent checks changes against —
the frontend twin of the backend [spec.md](../spec.md).

Every section names the test that verifies it. We build screens first and add
those tests in the Review phase (tests-after), so until then the **Verified by**
lines are contract *targets*: the test file that must exist and pass before a
section is considered done.

The verified backend API contract lives in [ARCHITECTURE.md](../ARCHITECTURE.md)
§7 and the backend [spec.md](../spec.md). Four details bit the original plan and
are load-bearing here:

1. A `422` body's `detail` is a **plain joined string**
   (`"body.title: String should have at least 1 character"`), **not** an array
   of `{loc,msg,type}`. The client types it as `string`.
2. `PATCH /tasks/{id}` is a **full replacement**: omitted fields reset
   (`description`→`null`, `priority`→`medium`) and it **cannot** change
   `completed`. The edit form always sends the whole object.
3. A `401` body has **no** `request_id`; `404`/`422` do. Every response also
   carries an `X-Request-ID` header. `request_id` is therefore optional.
4. The backend input model is named `TaskIn`; our TypeScript type is
   `TaskInput` — a local name, not a claim of backend parity.

## Data contract

**Goal:** One typed shape for tasks, shared by every screen, matching the
backend exactly — no invented fields (no due date, assignee, tags, comments…).

**Contract:** the types in `src/types/index.ts`:
```ts
type Priority = "low" | "medium" | "high";
interface Task { id: number; title: string; description: string | null; priority: Priority; completed: boolean; }
interface TaskInput { title: string; description: string | null; priority: Priority; }
interface ApiError { detail: string; request_id?: string | null; }
```

Enforced by the TypeScript compiler (`npm run typecheck`).

## API client

**Goal:** A single typed wrapper around `fetch` so no screen ever builds a URL,
sets a header, or parses an error by hand.

**Contract:** `src/api/client.ts` + `src/api/tasks.ts`
- Base URL comes from `import.meta.env.VITE_API_BASE_URL`.
- Every `/tasks*` request sends header `X-API-Key: <key>`; `GET /health` sends
  none.
- Endpoints wrapped: `getHealth()`, `listTasks({completed?, limit, offset})`,
  `getTask(id)`, `createTask(TaskInput)` → 201, `replaceTask(id, TaskInput)`,
  `completeTask(id)`, `deleteTask(id)` → 204 (no body parsed).
- On a non-2xx response it throws an `ApiClientError` carrying `status`,
  `detail` (string), and optional `request_id`, parsed from the JSON body **when
  present** and falling back to a status-based message when the body is empty or
  unparseable (covers both `{detail, request_id}` and bare `{detail}` shapes).
- A network failure (backend down / DNS / CORS) throws an `ApiClientError` with
  `status: 0` and a "cannot reach the server" message — never an unhandled
  rejection.

**Behavior:** the client is framework-agnostic (no React import) so it is unit
testable on its own.

Verified by `src/api/client.test.ts`.

## Connection & authentication

**Goal:** Let the user connect with an `X-API-Key`. MiniTrack has no user
accounts, so this is "Connect to MiniTrack," never "Sign in."

**Contract:** route `/connect`
- A password-style input with a show/hide toggle accepts the key.
- **Validate** by calling `GET /tasks` (not `/health`, which ignores the key).
  200 → connected; 401 → show "That API key was rejected." and stay.
- The key is held in memory via `ApiKeyContext` by default. An opt-in "remember
  for this browser session" uses `sessionStorage` only after the trade-off is
  shown (cleared when the tab closes; readable by any script on the origin).
- The key is **never** logged, **never** put in a URL, and **never** read from a
  `VITE_*` variable.
- A **Disconnect** action clears the key from memory and `sessionStorage` and
  returns to `/connect`.

**States:** idle · validating (submit disabled) · error (invalid key / server
unreachable, with retry).

Verified by `src/pages/ConnectPage/ConnectPage.test.tsx`.

## Route protection

**Goal:** Task screens are unreachable without a key.

**Contract:**
- `/` redirects to `/tasks` when a key is present, else `/connect`.
- `/tasks`, `/tasks/new`, `/tasks/:taskId`, `/tasks/:taskId/edit` are wrapped in
  `ProtectedRoute`: no key → redirect to `/connect`.
- `*` renders a friendly Not-Found page with a link back to `/tasks`.

Verified by `src/auth/ProtectedRoute.test.tsx`.

## Task list

**Goal:** View, filter, and page through tasks.

**Contract:** route `/tasks`
- **Filters** All / Active (`completed=false`) / Completed (`completed=true`),
  reflected in the URL query (`?status=active`).
- **Load more**, not numbered pages (the API returns no total): request a fixed
  page size (`limit`), append results, raise `offset` by the page size; **hide
  "Load more" when a returned page has fewer items than `limit`**; **reset
  paging when the filter changes**.
- Each task shows title, a description preview, a priority badge, and a status
  badge; actions: View, Edit, Complete (active only), Delete.
- No global analytics/counts derived from a single loaded page.

**States:** loading · loaded · empty (message tailored to the active filter —
e.g. "No active tasks") · error with a Retry button.

Verified by `src/pages/TaskListPage/TaskListPage.test.tsx`.

## Create task

**Goal:** Create a task, matching backend validation.

**Contract:** route `/tasks/new` → `POST /tasks` → **201**
- Fields: title (required), description (optional multiline), priority (low /
  medium / high, default **medium**).
- Title is trimmed; a whitespace-only title is blocked client-side before any
  request.
- A backend **422** is surfaced by rendering its `detail` **string** inline
  (never `detail[].msg`).
- The submit button is disabled while the request is in flight (no double POST).
- Success → navigate to the new task (or list) and show a confirmation.

Verified by `src/pages/TaskFormPage/TaskFormPage.create.test.tsx`.

## Task detail

**Goal:** Show one task and the actions that actually exist.

**Contract:** route `/tasks/:taskId` → `GET /tasks/{id}`
- Displays only real fields: id, title, description, priority, completed/active.
- Actions: Edit, Complete (**only when active**), Delete (with confirmation),
  Back to tasks.
- **No "Reopen"** action — the backend has no un-complete endpoint.
- Unknown id → **404** handled as a "task not found" state with a link back.

**States:** loading · loaded · not-found · error with retry.

Verified by `src/pages/TaskDetailPage/TaskDetailPage.test.tsx`.

## Edit task

**Goal:** Edit a task. `PATCH /tasks/{id}` is a full replacement, so the form
must submit the whole object.

**Contract:** route `/tasks/:taskId/edit` → `PATCH /tasks/{id}`
- The full task is loaded before the form renders (fields pre-filled).
- Submit sends the **entire** `TaskInput` (`title`, `description`, `priority`) —
  never a partial payload — because omitted fields reset on the backend.
- The form never sends or touches `completed` (PATCH cannot change it).
- Same validation and 422 handling as Create; unknown id → 404 state.

Verified by `src/pages/TaskFormPage/TaskFormPage.edit.test.tsx`.

## Complete & delete

**Goal:** Mark a task done, or remove it, with clear feedback.

**Contract:**
- Complete → `POST /tasks/{id}/complete` → returns the updated task; the UI
  reflects the completed state (one-way; no reopen).
- Delete → `DELETE /tasks/{id}` → **204**; requires an accessible confirmation
  dialog first; on success the task leaves the list / navigates back with a
  confirmation.

Verified by `src/pages/TaskDetailPage/TaskDetailPage.test.tsx` (action
visibility) and the manual test cases (the confirm-and-delete flow).

## Error handling

**Goal:** Every failure mode has a clear, non-technical message.

**Contract:**
- Backend unreachable / network / CORS → "Can't reach MiniTrack" with retry.
- **401** anywhere → clear the stored key, redirect to `/connect`, and explain
  "Your API key was rejected."
- **404** → resource-specific not-found state.
- **422** → render the `detail` string near the offending form.
- **5xx / unexpected** → generic "Something went wrong" with retry.
- When an error carries a `request_id`, show it as small, secondary
  troubleshooting text — never the headline (and it is absent on 401).

Verified by `src/api/client.test.ts` and `src/pages/ConnectPage/ConnectPage.test.tsx`.

## Accessibility

**Goal:** Usable by keyboard and screen reader; not reliant on color alone.

**Contract:**
- Semantic HTML (`<main>`, `<nav>`, `<button>`, real form `<label>`s).
- Visible focus indicators; full keyboard navigation; focus trapped in the
  confirm dialog and restored on close.
- Priority and status convey meaning with **text/icon**, not color alone.
- `aria-live` announces the result of async actions (saved, deleted, error).
- Sufficient color contrast on text and badges.

Verified by `src/pages/TaskListPage/TaskListPage.test.tsx` (roles/labels) and
manual keyboard/contrast review in the Verify phase.

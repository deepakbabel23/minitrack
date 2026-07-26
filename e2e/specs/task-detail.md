# Test plan — Task detail page (`/tasks/:taskId`)

**Seed:** `tests/seed.spec.ts` (API key injected into sessionStorage; the app boots connected)

Each scenario creates its own task through the API and operates only on that
task, so scenarios are independent and can run in any order.

## 1. Task detail

### 1.1 Shows the task's title, description, priority and status

**Steps:**
1. Create an active task with a description and priority `high`.
2. Navigate to `/tasks/{id}`.

**Expected:** The title renders as the page heading. The description is shown.
A `High priority` badge, an `Active` badge and `Task #{id}` are all visible.
`Edit`, `Complete` and `Delete` controls are present.

### 1.2 Shows a placeholder when the task has no description

**Steps:**
1. Create a task with `description: null`.
2. Navigate to `/tasks/{id}`.

**Expected:** `No description.` is shown in place of description text.

### 1.3 Completing an active task

**Steps:**
1. Create an active task.
2. Navigate to `/tasks/{id}` and click `Complete`.

**Expected:** A `Task marked complete.` confirmation appears. The status badge
changes from `Active` to `Completed`. The `Complete` button disappears —
completion is a one-way door, and there is deliberately no Reopen. The backend
reports the task as completed.

### 1.4 A completed task offers no Complete button

**Steps:**
1. Create a task and complete it through the API.
2. Navigate to `/tasks/{id}`.

**Expected:** The `Completed` badge is visible and no `Complete` button exists.
`Edit` and `Delete` remain available.

### 1.5 Deleting a task after confirming

**Steps:**
1. Create a task.
2. Navigate to `/tasks/{id}`, click `Delete`, and confirm in the dialog.

**Expected:** A confirmation dialog appears titled `Delete this task?` naming
the task. After confirming, the browser lands on `/tasks` showing
`Task deleted.`, and the backend no longer has the task.

### 1.6 Cancelling the delete dialog keeps the task

**Steps:**
1. Create a task.
2. Navigate to `/tasks/{id}`, click `Delete`, then click `Cancel` in the dialog.

**Expected:** The dialog closes, the page stays on the task, and the task still
exists in the backend.

### 1.7 An unknown task id reports "Task not found"

**Steps:**
1. Create a task, note its id, and delete it through the API.
2. Navigate to `/tasks/{id}`.

**Expected:** `Task not found` is shown with a `Back to tasks` link, not a
generic error. An id that never existed is a normal thing to reach via a stale
link, so this is a first-class outcome rather than a failure.

### 1.8 Back to tasks returns to the list

**Steps:**
1. Create a task and navigate to `/tasks/{id}`.
2. Click `← Back to tasks`.

**Expected:** The browser lands on `/tasks` with the `Tasks` heading visible.

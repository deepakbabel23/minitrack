# Test plan — Edit task page (`/tasks/:taskId/edit`)

**Seed:** `tests/seed.spec.ts` (API key injected into sessionStorage; the app boots connected)

Each scenario creates its own task through the API and operates only on that
task, so scenarios are independent and can run in any order.

The backend's `PATCH /tasks/{id}` is a **full replacement**, not a partial
update: it binds the same model as POST, so an omitted description is written as
NULL and an omitted priority resets to `medium`. The form therefore always
submits all three fields, and scenario 2.6 pins that behaviour.

## 2. Edit task

### 2.1 Pre-fills the form with the task's current values

**Steps:**
1. Create a task with a known title, description and priority `low`.
2. Navigate to `/tasks/{id}/edit`.

**Expected:** Heading `Edit task`. The Title, Description and Priority controls
hold the task's current values. `Save changes` and `Cancel` are present.

### 2.2 Saving changes returns to the detail page

**Steps:**
1. Create a task.
2. Navigate to `/tasks/{id}/edit`, change the title, description and priority.
3. Click `Save changes`.

**Expected:** The browser lands on `/tasks/{id}` showing `Task updated.`, the
new title as the heading, and the new priority badge. The backend holds the new
values.

### 2.3 A blank title is rejected before any request is sent

**Steps:**
1. Create a task.
2. Navigate to `/tasks/{id}/edit`, clear the Title field, click `Save changes`.

**Expected:** `Title is required.` appears against the field, the browser stays
on the edit page, and the task is unchanged in the backend. No PATCH request is
sent — the client-side gate catches it, so no round trip is spent discovering
what the backend would reject with a 422 anyway.

### 2.4 A whitespace-only title is rejected the same way

**Steps:**
1. Create a task.
2. Navigate to `/tasks/{id}/edit`, replace the Title with `   `, submit.

**Expected:** Same as 2.3 — `Title is required.`, still on the edit page.

### 2.5 Cancel abandons the edit

**Steps:**
1. Create a task.
2. Navigate to `/tasks/{id}/edit`, change the title, click `Cancel`.

**Expected:** The browser returns to `/tasks/{id}` and the task still shows its
original title. The backend is unchanged.

### 2.6 Clearing the description writes NULL, not an empty string

**Steps:**
1. Create a task with a description.
2. Navigate to `/tasks/{id}/edit`, clear the Description field, save.

**Expected:** The detail page shows `No description.` and the backend stores
`null` rather than `""`.

### 2.7 An unknown task id reports "Task not found"

**Steps:**
1. Create a task, note its id, and delete it through the API.
2. Navigate to `/tasks/{id}/edit`.

**Expected:** `Task not found` with a `Back to tasks` link, and no form.

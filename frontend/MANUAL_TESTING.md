# MiniTrack Frontend — Manual Test Cases

A hand-runnable checklist to confirm every screen and flow works. Automated
tests (`npm test`) cover the critical logic; this covers the click-through
experience, accessibility, and responsiveness that are best judged by a human.

Tick each box as you go. If anything fails, note the screen + what you saw.

---

## 0. Setup

Run the backend and frontend together.

**Backend** (from the repo root, in one terminal):
```bash
source .venv/bin/activate
MINITRACK_API_KEYS=dev-key-123 \
MINITRACK_CORS_ORIGINS=http://localhost:5173 \
uvicorn app.main:app --host 127.0.0.1 --port 8000
python seed_data.py     # in a second terminal, once — loads 4 demo tasks
```

**Frontend** (in another terminal):
```bash
cd frontend
cp .env.example .env      # first time only
npm install               # first time only
npm run dev               # open the URL it prints, usually http://localhost:5173
```

- Backend base URL: `http://127.0.0.1:8000`
- Test API key: `dev-key-123`
- A wrong key to test rejection: `wrong-key`

> Tip: keep the browser dev-tools **Network** tab open to watch the requests,
> and the **Console** to confirm the API key is never printed.

---

## 1. Connection screen (`/connect`)

| # | Steps | Expected | ✓ |
|---|---|---|---|
| 1.1 | Visit `/` | Redirects to `/connect` (you're not connected yet) | ☐ |
| 1.2 | Read the screen | Says "Connect to MiniTrack" and explains it uses an API key — **not** "Sign in" | ☐ |
| 1.3 | Click **Show** next to the key field | The key becomes visible; button now says **Hide** | ☐ |
| 1.4 | Leave the field blank, click **Connect** | Inline message "Enter your API key to connect."; no network request | ☐ |
| 1.5 | Type `wrong-key`, click **Connect** | Message "That API key was rejected."; you stay on `/connect` | ☐ |
| 1.6 | Type `dev-key-123`, click **Connect** | Button shows "Connecting…", then you land on `/tasks` | ☐ |
| 1.7 | In dev-tools Console, confirm | The API key was **never** logged | ☐ |
| 1.8 | In dev-tools Network, click the `/tasks` request | The key is in the **`X-API-Key` header**, never in the URL | ☐ |

## 2. Remember-for-session & Disconnect

| # | Steps | Expected | ✓ |
|---|---|---|---|
| 2.1 | Disconnect, reconnect WITHOUT ticking "Remember", then refresh the page | You're sent back to `/connect` (key was in memory only) | ☐ |
| 2.2 | Connect WITH "Remember for this browser session" ticked, then refresh | You stay connected (key restored from sessionStorage) | ☐ |
| 2.3 | Application → Session Storage in dev-tools | You may see the key stored — this is the documented trade-off | ☐ |
| 2.4 | Click **Disconnect** in the header | Returns to `/connect`; Session Storage entry is gone | ☐ |
| 2.5 | Close the tab, reopen `http://localhost:5173` | Not connected (sessionStorage clears on tab close) | ☐ |

## 3. Route protection

| # | Steps | Expected | ✓ |
|---|---|---|---|
| 3.1 | While disconnected, type `/tasks` in the address bar | Redirects to `/connect` | ☐ |
| 3.2 | While disconnected, open `/tasks/1` directly | Redirects to `/connect` | ☐ |
| 3.3 | Visit a nonsense URL like `/nope` | Friendly "Page not found" with a "Back to tasks" button | ☐ |

## 4. Task list (`/tasks`)

| # | Steps | Expected | ✓ |
|---|---|---|---|
| 4.1 | Connect and view the list | The 4 seeded tasks appear as cards with title, description, priority + status badges | ☐ |
| 4.2 | Check the badges | Priority shows an icon **and** a word (High/Medium/Low); status shows Active/Completed — not color alone | ☐ |
| 4.3 | Click **Active** filter | URL becomes `/tasks?status=active`; only active tasks show | ☐ |
| 4.4 | Click **Completed** filter | Only completed tasks show (may be empty) with the message "No completed tasks yet." | ☐ |
| 4.5 | Click **All** | All tasks show again | ☐ |
| 4.6 | With < 20 tasks | There is **no** "Load more" button (a short page means nothing more) | ☐ |
| 4.7 | (Optional) run `python seed_data.py` ~5 times to exceed 20 tasks, reload | "Load more" appears; clicking it appends the next page; it disappears on the final short page | ☐ |

## 5. Create a task (`/tasks/new`)

| # | Steps | Expected | ✓ |
|---|---|---|---|
| 5.1 | Click **Create task** | Form with Title (required), Description (optional), Priority (defaults to **Medium**) | ☐ |
| 5.2 | Leave title blank (or spaces only), click **Save task** | Inline "Title is required."; focus moves to the title; no task created | ☐ |
| 5.3 | Enter `  Buy milk  ` (with spaces), pick High, Save | Succeeds; back on the list with a green "Task created."; the new task's title is trimmed to "Buy milk" | ☐ |
| 5.4 | Watch the **Save** button while it submits | It is disabled during the request (no double-submit) | ☐ |

## 6. Task detail (`/tasks/:id`)

| # | Steps | Expected | ✓ |
|---|---|---|---|
| 6.1 | Click a task's **View** (or its title) | Detail shows title, priority + status badges, description, and `Task #id` | ☐ |
| 6.2 | Confirm the actions | Edit, Complete (only if active), Delete, Back — and **no "Reopen"** anywhere | ☐ |
| 6.3 | Open `/tasks/999999` directly | Friendly "Task not found" panel with a link back | ☐ |

## 7. Complete & delete

| # | Steps | Expected | ✓ |
|---|---|---|---|
| 7.1 | On an **active** task, click **Complete** (list or detail) | Status flips to **Completed** (green ✓); the Complete button disappears | ☐ |
| 7.2 | On the **Active** filter, complete a task | It disappears from the Active list | ☐ |
| 7.3 | Click **Delete** on a task | A confirmation dialog appears naming the task | ☐ |
| 7.4 | Press **Esc** (or click **Cancel**) | Dialog closes; the task is still there | ☐ |
| 7.5 | Click **Delete** → **Delete** to confirm | The task is removed; a "Task deleted." confirmation shows | ☐ |

## 8. Edit a task (`/tasks/:id/edit`)

| # | Steps | Expected | ✓ |
|---|---|---|---|
| 8.1 | Click **Edit** on a task | Form is **pre-filled** with the task's current title, description, priority | ☐ |
| 8.2 | Change only the title, click **Save changes** | Returns to the detail screen with "Task updated."; the description and priority are **unchanged** (full-object save) | ☐ |
| 8.3 | Edit a task, clear the description, save, reopen it | Description is now empty — the whole object was sent, as intended | ☐ |
| 8.4 | Click **Cancel** on the edit form | Returns without saving | ☐ |

## 9. Session rejected mid-use (global 401)

| # | Steps | Expected | ✓ |
|---|---|---|---|
| 9.1 | While connected, stop the backend and restart it with a **different** key: `MINITRACK_API_KEYS=another-key uvicorn app.main:app --port 8000` | Backend now rejects `dev-key-123` | ☐ |
| 9.2 | Back in the app, click a task action or reload the list | You're redirected to `/connect` with "Your API key was rejected." | ☐ |
| 9.3 | Reconnect with `another-key` | Works normally again | ☐ |
| 9.4 | (Restore) restart the backend with `MINITRACK_API_KEYS=dev-key-123` for the rest of the tests | — | ☐ |

## 10. Backend unavailable / network error

| # | Steps | Expected | ✓ |
|---|---|---|---|
| 10.1 | Stop the backend, then reload `/tasks` | A clear error ("Can't reach MiniTrack…") with a **Try again** button — not a blank page or a crash | ☐ |
| 10.2 | Start the backend, click **Try again** | The list loads | ☐ |

## 11. Accessibility

| # | Steps | Expected | ✓ |
|---|---|---|---|
| 11.1 | On `/connect`, press **Tab** repeatedly | Every control is reachable with a **visible focus ring**, in a sensible order | ☐ |
| 11.2 | Open the delete dialog, press **Tab** | Focus stays **inside** the dialog; **Esc** closes it and focus returns to the Delete button | ☐ |
| 11.3 | Turn on a screen reader (VoiceOver: ⌘+F5) and complete/delete a task | The result is announced (aria-live regions) | ☐ |
| 11.4 | Inspect a priority/status badge | It has text (not color only); contrast looks sufficient | ☐ |
| 11.5 | Complete or delete a task from the **list** (not the detail screen) | Focus moves to the "Tasks" heading (you're not dropped to the top of the page), and "Task marked complete." / "Task deleted." is announced | ☐ |

## 12. Responsive layout

| # | Steps | Expected | ✓ |
|---|---|---|---|
| 12.1 | Open dev-tools device toolbar, set width to ~375px (mobile) | Task cards stack; actions remain usable; nothing overflows horizontally | ☐ |
| 12.2 | The "Create task" button on mobile | Full-width and easy to tap | ☐ |
| 12.3 | Resize back to desktop | Cards return to the row layout | ☐ |

---

### Done?

If every box is ticked, the frontend meets its spec (`frontend/spec.md`). Note any
failures with the test-case number so they're easy to reproduce and fix.

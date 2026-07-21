# MiniTrack Frontend — Manual Testing Guide

The Vitest suite (`npm test`) covers the load-bearing *logic*: error normalization,
the full-replacement PATCH, Load-more pagination, the two-tier 401, and the
absence of a Reopen affordance.

This guide covers what that suite deliberately **cannot** reach:

- **Focus management.** jsdom does no layout and does not implement `<dialog>`
  focus trapping — `setupTests.ts` polyfills `showModal`/`close` well enough to
  test state transitions, and nothing more.
- **Anything visual.** Vitest runs with `css: false`, so no stylesheet is parsed.
  Every contrast, spacing, and focus-ring check has to happen in a real browser.
- **Actual screen-reader output.** A `role="status"` node can be asserted in
  jsdom; whether VoiceOver *announces* it cannot.
- **The real backend.** The suite stubs `fetch`. Nothing below is stubbed.

---

## Setup

Two terminals, from `minitrack_backend/`:

```bash
# 1. Backend — needs .env with MINITRACK_API_KEYS and MINITRACK_CORS_ORIGINS
source .venv/bin/activate
uvicorn app.main:app --reload --env-file .env

# 2. Frontend
cd frontend && npm run dev
```

Then `python seed_data.py` if the list is empty. The demo key is whatever you set
in `MINITRACK_API_KEYS` (the runbook uses `demo-key-123`).

Open <http://localhost:5173>. **Use a real browser, not a headless one.**

---

## 1. Keyboard-only pass

Put the mouse away entirely. On macOS, first enable full keyboard access:
**System Settings → Keyboard → "Keyboard navigation"** on, or Tab skips buttons
and links.

### 1.1 Connect screen

| Step | Expected |
|---|---|
| Load `/tasks` with no key | Redirected to `/connect` |
| `Tab` from the address bar | Focus enters the page; every stop shows a visible focus ring |
| Tab to the API key field, type a wrong key | — |
| Tab to **Show** and press `Space` | Key becomes readable; `aria-pressed` flips (verify in the a11y inspector) |
| Tab to **Connect to MiniTrack**, press `Enter` | Inline error appears; **focus stays on the button**, not reset to the top |
| Type a valid key, press `Enter` from the field | Form submits — the field's Enter key works, not just the button |

**Check:** the key never appears in the URL bar at any point.

### 1.2 List screen

| Step | Expected |
|---|---|
| Tab through the filter group | All / Active / Completed reachable; the pressed one is visually distinct |
| Press `Enter` on **Active** | List reloads; URL becomes `?status=active`; **focus stays on the button you pressed** |
| Press browser Back | Returns to the previous filter — the filter lives in the URL |
| Tab into a task row | Title link → View → Edit → Complete → Delete, in that visual order |
| Press `Enter` on **Load more** (needs >20 tasks) | Page appends; focus remains on the button so you can press it again |

> To get past 20 tasks: run `python seed_data.py` a few times, or create tasks
> until the button appears. Reset with `rm minitrack.db` and re-seed.

### 1.3 Confirm-and-delete by keyboard — the important one

This is the case the automated suite proves the *state machine* of, but not the
*focus behaviour*.

1. Tab to a task's **Delete** button. Note which task it is.
2. Press `Enter`. The dialog opens.
3. **Press `Tab` repeatedly.** Focus must cycle *inside* the dialog only —
   Cancel → Delete → back to Cancel. It must never reach the page behind it.
4. Press `Shift+Tab`. Cycles backwards, still trapped.
5. Press `Escape`. Dialog closes, **no task is deleted**, and focus returns to
   the Delete button you started from.
6. Re-open the dialog and press `Enter` on **Delete**.
7. **The row disappears and focus lands on the "Tasks" heading** — not on
   `<body>`.

> Step 7 is the subtle one. `<dialog>.close()` restores focus to whatever opened
> it, which by then has unmounted. `TaskListPage` moves focus in an effect that
> runs *after* the dialog closes; if that ever regresses, focus silently drops to
> `<body>` and a keyboard user is ejected to the top of the document. Verify with
> `document.activeElement` in the console if you're unsure.

Repeat the same sequence from the **detail** screen. There, a successful delete
navigates to `/tasks` and the flash reads "Task deleted."

### 1.4 Forms

| Step | Expected |
|---|---|
| On Create, submit with an empty title | Inline "Title is required."; **focus jumps to the title field**; no network request in DevTools |
| Type a title, clear it, submit again | Error returns; still no request |
| Tab to the Priority select, use `↑`/`↓` | Value changes with the keyboard alone |
| Submit a valid form | Navigates to the new task with a "Task created." flash |

---

## 2. Screen-reader pass

macOS VoiceOver: `Cmd+F5`. Use `Ctrl+Option+→` to move through the page.

| What to do | What must be announced |
|---|---|
| Load the list | "Loading tasks…" (the `role="status"` block) |
| Complete a task | "<title> marked complete." — announced without moving focus |
| Delete a task | "<title> deleted." |
| Open the delete dialog | The dialog title and body, via `aria-labelledby`/`aria-describedby` |
| Land on `/connect` after a mid-session 401 | The disconnect reason banner |
| Focus a required field | "Title, required" — the `(required)` text is `sr-only`, the `*` is `aria-hidden` |

**Check the flash region specifically.** `Flash`, the Connect banner, and the
detail page all mount their live region *unconditionally* and only fill in the
text later. A region that appears together with its text is routinely skipped by
screen readers. If you ever see a flash visually but hear nothing, that's the
regression.

**Check the completion checkbox is silent.** The `✓` marker on a completed card
is `aria-hidden` and is *not* a checkbox — completion is one-way, so an
interactive control would promise an action the backend cannot perform.

---

## 3. Mid-session 401

The suite proves the handler fires only for the *stored* key. This proves the
whole loop against a real server.

1. Connect with the working key. Confirm the header shows **✓ Connected**.
2. Without touching the browser, change `MINITRACK_API_KEYS` in `.env` to a
   different value and let uvicorn reload.
3. Back in the browser, click **Complete** or **Load more** on the list.
4. **Expected:** you land on `/connect`, the header shows **Not connected**, and
   a banner explains the session ended.
5. Enter a *wrong* key on that screen. **Expected:** an inline error, and you
   stay on `/connect` — no redirect loop.
6. Restore the original key in `.env`, let it reload, and reconnect. The banner
   clears.

---

## 4. Visual and responsive pass

None of this is reachable from jsdom.

- **Focus rings** are visible on every interactive element, including against the
  panel background. Tab the whole app once and watch for a stop with no ring.
- **Delete buttons render red**, not grey. (`.btn--ghost-danger` and `.btn--ghost`
  have equal specificity and `components.css` loads later — this regressed once
  already.)
- **No link is underlined when styled as a button.** Check "Create task" on the
  list, "View"/"Edit" on each card, and "Back to tasks".
- **Task titles in cards** are links but must not be underlined by default.
- Resize to ~375px wide. The header, filter group, and card actions wrap without
  horizontal scrolling.
- Zoom to 200%. Nothing is clipped or overlapping.
- Long title (200 chars) and long description: the card clamps the description
  and the detail page wraps rather than overflowing.
- macOS: **System Settings → Accessibility → Display → Reduce motion.** Nothing
  should break; the app uses no essential animation.

---

## 5. Data-shape spot checks

Worth one pass against the live API, because these are the contracts the whole
client is built on.

| Check | How |
|---|---|
| 422 `detail` is a string | Submit a 250-character title. The inline error is prose, not `[object Object]` |
| PATCH is a full replacement | Edit *only* the title of a task that has a description and `high` priority. Reload the detail page — both must survive |
| No total in the list response | DevTools → Network → `GET /tasks`. The body is a bare array; there is no count field, which is why pagination is "Load more" |
| 500s are plain text | Not easily forced; if you see one, the UI must show "The MiniTrack server had a problem." and never the raw body |
| Backend down | Stop uvicorn, then act in the UI. Expect the "Can't reach the MiniTrack server… CORS" message, not a blank screen |

---

## Before you call it done

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

All four green, plus one full keyboard pass of §1.3.

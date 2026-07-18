# Figma Make runbook (demo only)

This is the **demo** path for the design step: show learners how a person with no
code can turn our design brief into a clickable prototype in Figma Make. The
actual project ships the **Google Stitch** design + our `tokens.css` — Figma Make
is here purely to *teach the design-to-code idea*, not to feed the build.

> Open Figma Make: **figma.com → Make** (or the "Make" tab in the Figma app).
> You'll type prompts into a chat; it builds a working prototype you can click.

Do the steps in order. Each prompt is copy-paste ready. After each one, look at
the result and use the follow-up prompts to refine.

---

## Step 0 — Set expectations (say this out loud to the room)

- Figma Make generates a *prototype*. We are **not** wiring it to the real API.
- We only design the **five screens** that MiniTrack actually supports.
- We invent **no** fields. A task is only: title, description, priority
  (low/medium/high), completed. No due dates, assignees, tags, or comments.

---

## Step 1 — Establish the design system (kickoff prompt)

Paste this whole block as the first message:

```
Build a clean, modern productivity web app called "MiniTrack" — a minimalist
task tracker. Use this exact design system and reuse it on every screen.

Colors:
- Background #f8fafc, content surfaces #ffffff, borders #e2e8f0
- Text #0f172a, muted text #475569
- Primary (buttons, links): indigo #4f46e5, hover #4338ca
- Completed/success: green #16a34a
- Danger/delete: red #dc2626
- Priority badges: High = red bg #fee2e2 / text #991b1b, Medium = amber bg
  #fef3c7 / text #92400e, Low = blue bg #dbeafe / text #1e40af. Each priority
  badge shows an icon AND a text label — never color alone.

Type: system sans-serif. Spacing on a 4px scale, generous. Corners 8px on cards
and buttons, pill-shaped badges. Subtle shadows. Content centered, max width
880px. Sticky top header with a "MiniTrack" wordmark on the left and a
"Disconnect" button on the right. Accessible: visible focus rings, real labels,
good contrast. Professional enough for a corporate training demo.

Don't build any screens yet — just confirm the design system.
```

---

## Step 2 — Generate the screens (one prompt each)

Send these one at a time, reviewing after each.

**2a. Connect**
```
Create a "Connect to MiniTrack" screen. A centered card with: the MiniTrack
wordmark, a short line explaining MiniTrack uses an API key (not a username/
password account), a password-style "API key" field with a show/hide toggle, a
"Remember for this browser session" checkbox with a small note about the
trade-off, a full-width indigo "Connect to MiniTrack" button, and an inline red
error line reading "That API key was rejected."
```

**2b. Task list**
```
Create the Tasks screen. Sticky header (wordmark + Disconnect). A title "Tasks"
with a "Create task" button on the right. A segmented filter: All / Active /
Completed, with Active selected. Below, a list of 4 task cards; each card shows a
title, a two-line description preview, a priority badge (mix of High/Medium/Low),
a status badge (Active or Completed with a check), and a right-aligned row of
View / Edit / Complete / Delete buttons. A centered "Load more" button at the
bottom.
```

**2c. Task detail**
```
Create a task detail screen. Sticky header. A "Back to tasks" link. A card with
the task title, a priority badge and a status badge, the full description, and a
small "Task #2" id line. Action row: Edit (indigo), Complete (green), Delete
(red). Do NOT add a "Reopen" button.
```

**2d. Task form (create / edit)**
```
Create a "New task" form. Sticky header. A "Back to tasks" link. A card titled
"New task" with a required Title field (show an inline error "Title is
required."), an optional multiline Description, and a Priority dropdown
(Low/Medium/High, Medium selected). A right-aligned Cancel + "Save task" button
row. This same form is reused for editing, pre-filled.
```

**2e. Not found**
```
Create a friendly 404 page: a big indigo "404", a "Page not found" heading, a
short muted sentence, and a "Back to tasks" button. Keep the sticky header.
```

---

## Step 3 — Talk through it

- Point out that the prototype *looks* real but has **no backend** — clicking
  "Connect" doesn't validate a key. That's the difference between a design
  prototype and the app we build in React.
- Compare it side by side with the Google Stitch screens. Same brief, two tools.
- The values above are the **same tokens** that live in
  `frontend/src/styles/tokens.css` — that file, not the prototype, is what the
  real app uses.

## Common demo pitfalls

- Figma Make will happily invent due dates / assignees if asked — resist it. Our
  API has none.
- Don't paste any real API key into Figma Make. There's nothing to connect it to.
- Treat the output as a picture to aim at, not code to copy.

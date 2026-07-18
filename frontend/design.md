# MiniTrack — Design Brief

The single design brief for the MiniTrack frontend. It feeds both design tools:
paste it into **Figma Make** to generate a design system + prototype, and it is
uploaded to **Google Stitch** to generate a parallel system + screens. Whichever
direction we pick, these **tokens become the CSS variables** in
`src/styles/tokens.css` — the one source of truth in code.

## Product in one line

MiniTrack is a minimalist task tracker. A person connects with an API key, then
views, creates, edits, completes, and deletes simple tasks. No accounts, no
teams, no dates, no tags — only: **id, title, description, priority, completed**.

## Look & feel

Clean, modern productivity tool. Calm and professional enough for a corporate
training demo. Light neutral background, white content surfaces, one confident
indigo primary, green for the completed state, subtle shadows and borders,
generous spacing, and only small purposeful motion (hover, focus, dialog fade).

## Design tokens

### Color

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#f8fafc` | app background (slate-50) |
| `--color-surface` | `#ffffff` | cards, header, inputs |
| `--color-border` | `#e2e8f0` | hairlines, input borders |
| `--color-text` | `#0f172a` | primary text (slate-900) |
| `--color-text-muted` | `#475569` | secondary text (slate-600) |
| `--color-text-subtle` | `#94a3b8` | placeholders, meta |
| `--color-primary` | `#4f46e5` | primary buttons, links (indigo-600) |
| `--color-primary-hover` | `#4338ca` | primary hover (indigo-700) |
| `--color-primary-soft` | `#eef2ff` | primary tint bg (indigo-50) |
| `--color-focus` | `#6366f1` | focus ring (indigo-500) |
| `--color-success` | `#16a34a` | completed accents (green-600) |
| `--color-success-soft` | `#dcfce7` | completed badge bg (green-100) |
| `--color-success-text` | `#166534` | completed badge text (green-800) |
| `--color-danger` | `#dc2626` | delete / destructive (red-600) |
| `--color-danger-soft` | `#fee2e2` | danger tint bg (red-100) |

**Priority palette** (each also carries a text label + icon — never color alone):

| Priority | bg | text | dot/icon |
|---|---|---|---|
| high | `#fee2e2` | `#991b1b` | ▲ (red) |
| medium | `#fef3c7` | `#92400e` | ● (amber) |
| low | `#dbeafe` | `#1e40af` | ▼ (blue) |

### Typography

- Font: system stack — `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`.
- Scale: `--text-xs .75rem`, `--text-sm .875rem`, `--text-base 1rem`, `--text-lg 1.125rem`, `--text-xl 1.25rem`, `--text-2xl 1.5rem`, `--text-3xl 1.875rem`.
- Weights: `--weight-normal 400`, `--weight-medium 500`, `--weight-semibold 600`, `--weight-bold 700`.
- Line height: `1.5` body, `1.25` headings.

### Spacing (4px base)

`--space-1 .25rem`, `--space-2 .5rem`, `--space-3 .75rem`, `--space-4 1rem`,
`--space-5 1.5rem`, `--space-6 2rem`, `--space-8 3rem`, `--space-10 4rem`.

### Radius / Shadow / Breakpoints

- Radius: `--radius-sm 4px`, `--radius-md 8px`, `--radius-lg 12px`, `--radius-full 9999px`.
- Shadow: `--shadow-sm 0 1px 2px rgba(15,23,42,.06)`, `--shadow-md 0 4px 12px rgba(15,23,42,.08)`, `--shadow-lg 0 12px 32px rgba(15,23,42,.12)`.
- Breakpoints: mobile-first; `--bp-sm 640px`, `--bp-md 768px`, `--bp-lg 1024px`. Content max-width `--container 880px`.

## Components

- **Button** — variants: primary (indigo), secondary (surface + border), danger (red), ghost (text only); sizes sm/md; disabled + loading (spinner) states; visible focus ring.
- **FormField** — label + control (input / textarea / select) + optional inline error text; error state ties `aria-describedby` to the message.
- **PriorityBadge** — pill using the priority palette; shows icon + capitalized label.
- **StatusBadge** — "Active" (neutral/indigo) vs "Completed" (green + ✓); text, not color alone.
- **TaskCard** — surface card: title (link), 2-line description preview, priority + status badges, action row (View / Edit / Complete / Delete). Row layout on desktop, stacked on mobile.
- **ConfirmDialog** — accessible modal: title, message, Confirm/Cancel; focus trapped, Esc cancels, focus restored on close.
- **ErrorMessage / Banner** — inline error with optional small `request_id` line and a Retry action.
- **EmptyState** — icon + message tailored to context + a primary action.
- **Spinner / Loading** — inline and full-panel loading indicators with `aria-live`.
- **Layout** — sticky header (MiniTrack wordmark, connection status, Disconnect), centered `--container` main region.

## Screens

1. **Connect** (`/connect`) — short explainer that MiniTrack uses an API key, a password-style key field with show/hide, a "Connect to MiniTrack" button, an optional "remember for this session" checkbox with a one-line trade-off note, and an inline error area.
2. **Task list** (`/tasks`) — header with title + "Create task"; a filter segmented control (All / Active / Completed); a list of TaskCards; loading, empty (per-filter), and error states; a "Load more" button.
3. **Task detail** (`/tasks/:id`) — task title, status + priority badges, full description, id; actions Edit / Complete (active only) / Delete / Back.
4. **Task form** (`/tasks/new` and `/tasks/:id/edit`) — title, description (multiline), priority select; Save / Cancel; inline validation; on edit, fields pre-filled and the whole object is submitted.
5. **Not found** (`*`) — friendly message + link back to tasks.

## Accessibility guardrails (design-level)

Every interactive element is keyboard reachable with a visible focus ring; text
meets WCAG AA contrast on its background; status and priority never rely on color
alone (icon + label always present); the confirm dialog traps focus.

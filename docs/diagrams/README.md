# MiniTrack diagrams

Twelve Draw.io diagrams and four Mermaid flowcharts covering the whole stack —
React SPA, FastAPI service, SQLite, and the request path between them.

| Page | Contains |
|---|---|
| [architecture.md](architecture.md) | System architecture, backend components, frontend components, request pipeline |
| [sequences.md](sequences.md) | Eight sequence diagrams: connect, list, create, edit, complete, delete, mid-session 401, 422 |
| [flows.md](flows.md) | Route/guard map, `useTaskList` state machine, error mapping, data model |

## How these are built

Draw.io diagrams are **generated, not hand-drawn**. Each one is declared once in
[specs.py](specs.py) and rendered twice by [build_diagrams.py](build_diagrams.py):

```
drawio/<name>.drawio   mxGraph XML — the editable source; open it in draw.io
svg/<name>.svg         the rendering the markdown embeds
```

Two formats because `.drawio` renders in no markdown viewer, and a hand-exported
PNG would drift from its source the first time anyone edited one and not the
other. One layout pass feeds both writers, so they cannot disagree.

```bash
python docs/diagrams/build_diagrams.py           # rebuild both formats
python docs/diagrams/build_diagrams.py --check   # fail if anything is stale
python docs/diagrams/check_names.py              # fail on invented symbols
```

Standard library only — no new dependencies, per [CLAUDE.md](../../CLAUDE.md).

### Editing

Edit [specs.py](specs.py) and rebuild. **Do not hand-edit anything in `drawio/`
or `svg/`** — the next rebuild overwrites it, and `--check` will flag the file as
stale in the meantime.

The exception is exploratory work: open a `.drawio` in
[app.diagrams.net](https://app.diagrams.net) or the VS Code Draw.io extension,
move things around, then fold what you liked back into the spec.

Layout is deterministic, so `git diff` after a rebuild answers "did anyone
hand-edit a generated file?".

### Guard rails in the generator

Rather than let a crowded diagram render badly, `build_diagrams.py` refuses:

- more than **16 messages** in one sequence — split the flow instead
- a combination of messages, fragments and notes that would push the row pitch
  below the legible floor

Both raise with the diagram name and what to drop. `check_names.py` is the
stronger check: it pulls every file path, function, class and env var out of
`specs.py` and resolves each against the real tree, so **a diagram naming
something that does not exist fails the build**. Genuinely external names
(Starlette classes, browser APIs, SQL keywords) live in an explicit `EXTERNAL`
allowlist.

## Legend

Paths in diagrams and prose are **module-relative**: `app/…` means
`backend/app/…`, `src/…` means `frontend/src/…`.

One colour per layer, used across all twelve diagrams.

| Colour | Role | Used for |
|---|---|---|
| Slate | external | Browser, the user, anything outside the repo |
| Indigo | frontend | `frontend/src/` — pages, components, `main.tsx` |
| Teal | HTTP edge | Middleware, `app/api/`, wire-level messages |
| Violet | business logic | `app/services/`, `src/hooks/` |
| Amber | persistence | `app/data/`, `minitrack.db` |
| Green | success / auth | Happy paths, `src/auth/`, test surfaces |
| Red | failure | 401, 404, 422, 500 and the branches that reach them |
| Grey | cross-cutting | `app/core/`, `app/schemas/`, `src/types/`, config |

In sequence diagrams a **solid** arrow is a call and a **dashed** arrow is a
return. Dashed bands are `alt` / `opt` fragments. In component diagrams a
**dashed** edge is wiring or cross-cutting use rather than a direct import.

## Relationship to the older diagram set

This set replaced eight frontend-only SVG/PNG diagrams that lived in
`facilitator/minitrack_frontend_diagrams_updated/`. That whole `facilitator/`
folder — the diagrams, the two RUNBOOKs, the decks and `build_pptx.py` — has
since been deleted from the working tree. It remains in git history if any of it
is ever needed back.

The mapping, in case you go looking for one of the old diagrams:

| Old diagram | Covered now by |
|---|---|
| 01 Frontend folder structure | [03-frontend-components](architecture.md#frontend-components) |
| 02 Module roles / FastAPI analogies | [frontend/CLAUDE.md](../../frontend/CLAUDE.md) — Architecture |
| 03 Frontend dependency direction | [03-frontend-components](architecture.md#frontend-components) |
| 04 Task-list request sequence | [11-seq-task-list](sequences.md#loading-the-task-list-then-load-more) — now full stack, not just the browser→FastAPI hop |
| 05 Page versus component | [03-frontend-components](architecture.md#frontend-components) group labels |
| 06 TaskListPage component tree | [03-frontend-components](architecture.md#frontend-components) |
| 07 Where new code goes | [frontend/CLAUDE.md](../../frontend/CLAUDE.md) — Architecture |
| 08 Frontend user flow | [flows.md §1](flows.md#1-routes-and-the-connection-guard) |

`ARCHITECTURE.md`'s three ASCII diagrams stay where they are as the inline quick
reference; these are the fuller versions of the same picture and do not
contradict them.

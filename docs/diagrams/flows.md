# Flowcharts

Four Mermaid diagrams covering routing, state, error mapping and the data model.
These are inline fenced blocks rather than generated files — GitHub renders them
directly, so they need no build step and stay diffable.

Component and sequence diagrams live in [architecture.md](architecture.md) and
[sequences.md](sequences.md); those are Draw.io, built by
[build_diagrams.py](build_diagrams.py).

---

## 1. Routes and the connection guard

Every `/tasks*` route sits behind `ProtectedRoute`, which redirects to `/connect`
and remembers where you were headed in `state.from`. `/` is a pure redirect that
branches on connection state, so a reload never flashes the wrong screen.

```mermaid
flowchart TD
    entry([Browser hits a URL]) --> root{"Which path?"}

    root -->|"/"| redirect{"isConnected?"}
    redirect -->|yes| tasks
    redirect -->|no| connect

    root -->|"/connect"| connect["ConnectPage<br/><i>paste an API key</i>"]
    root -->|"/tasks*"| guard{"ProtectedRoute<br/>isConnected?"}
    root -->|"anything else"| notfound["NotFoundPage"]

    guard -->|"no — save state.from"| connect
    guard -->|yes| protected

    subgraph protected [" "]
        direction LR
        tasks["/tasks<br/>TaskListPage"]
        new["/tasks/new<br/>TaskCreatePage"]
        detail["/tasks/:taskId<br/>TaskDetailPage"]
        edit["/tasks/:taskId/edit<br/>TaskEditPage"]
    end

    connect -->|"key accepted"| back(["navigate(state.from ?? '/tasks')"])
    back --> tasks
    tasks --> new
    tasks --> detail
    detail --> edit
    edit -->|"saved"| detail
    detail -->|"deleted"| tasks

    classDef gate fill:#DCFCE7,stroke:#16A34A,color:#166534
    classDef page fill:#EEF2FF,stroke:#4F46E5,color:#312E81
    classDef miss fill:#FEE2E2,stroke:#DC2626,color:#991B1B
    class guard,redirect gate
    class tasks,new,detail,edit,connect page
    class notfound miss
```

A mid-session 401 disconnects the store, which flips `isConnected` to false and
makes `ProtectedRoute` redirect declaratively — no imperative navigation from the
error handler. See [16-seq-session-401](sequences.md#a-mid-session-401-tears-the-session-down).

---

## 2. `useTaskList` state

The hook is a `useReducer` with six action types. `tasks` deliberately survives a
`load-error`, so a failed *Load more* leaves the rows you already have on screen
with a retry affordance rather than blanking the list.

```mermaid
stateDiagram-v2
    direction TB
    [*] --> loading: mount / filter change<br/>(dispatch reset, then load-start)

    loading --> ready: load-success
    loading --> error: load-error

    ready --> loadingMore: loadMore()<br/>(load-start, append=true)
    loadingMore --> ready: load-success<br/>merge, dedupe by id
    loadingMore --> error: load-error<br/>errorWasAppend=true

    error --> loading: retry() when errorWasAppend=false
    error --> loadingMore: retry() when errorWasAppend=true

    ready --> ready: task-updated<br/>(complete — row replaced in place)
    ready --> ready: task-removed<br/>(delete — row filtered out)

    loading --> loading: reset

    note right of ready
        nextOffset += page.length  (a counter, not tasks.length)
        hasMore = page.length === PAGE_SIZE  (20)
    end note

    note right of error
        tasks are NOT cleared, so a failed
        Load more keeps the rows already shown
    end note
```

Two guards protect this machine from out-of-order responses: an `AbortController`
cancels the in-flight page, and a monotonic `requestSeq` makes a late reply that
survives the abort get dropped instead of overwriting newer state.

---

## 3. How an error becomes a response

Three different shapes come out of this app, and the frontend has to read all
three. This is why error bodies are always read with `.text()` and parsed
defensively — never `.json()`.

```mermaid
flowchart TD
    raised([Something goes wrong]) --> which{"What was raised?"}

    which -->|"require_api_key<br/>HTTPException(401)"| h401
    which -->|"TaskNotFound<br/>from the service layer"| h404
    which -->|"RequestValidationError<br/>from Pydantic"| h422
    which -->|"anything unhandled"| h500

    h401["FastAPI's default<br/>http_exception_handler"] --> b401["<b>401</b> application/json<br/>{ detail }<br/><b>no request_id</b>"]
    h404["_task_not_found<br/><i>app/core/errors.py</i>"] --> b404["<b>404</b> application/json<br/>{ detail: 'Task not found', request_id }"]
    h422["_validation_error<br/><i>app/core/errors.py</i>"] --> join["'; '.join(loc: msg)<br/><i>one flat string</i>"]
    join --> b422["<b>422</b> application/json<br/>{ detail, request_id }"]
    h500["ServerErrorMiddleware<br/><i>no handler registered</i>"] --> b500["<b>500</b> <b>text/plain</b><br/>'Internal Server Error'"]

    b401 --> client
    b404 --> client
    b422 --> client
    b500 --> client

    client["api/client.ts readErrorBody()<br/>.text() then defensive JSON.parse"] --> err["ApiClientError<br/>{ status, detail, requestId, bodyText }"]

    classDef bad fill:#FEE2E2,stroke:#DC2626,color:#991B1B
    classDef ok fill:#CCFBF1,stroke:#0D9488,color:#115E59
    classDef fe fill:#EEF2FF,stroke:#4F46E5,color:#312E81
    class b401,b404,b422,b500 bad
    class h401,h404,h422,h500,join ok
    class client,err fe
```

Ordering trap: `require_api_key` is a router-level dependency, so it resolves
**before** body validation. A request with both a bad key and a bad body returns
**401, never 422**.

---

## 4. Data model

One table, five columns, created by `CREATE TABLE IF NOT EXISTS` in
`app/data/database.py` and re-run on every `connect()`.

```mermaid
erDiagram
    tasks {
        INTEGER id PK "AUTOINCREMENT — the only index (rowid alias)"
        TEXT    title        "NOT NULL, Pydantic enforces min_length=1"
        TEXT    description  "nullable — omitting it on PATCH writes NULL"
        TEXT    priority     "NOT NULL DEFAULT 'medium' — no DB CHECK"
        INTEGER completed    "NOT NULL DEFAULT 0 — 0/1, cast to bool in _row_to_dict"
    }
```

Three things this schema does **not** have, all easy to assume into existence:

| Assumption | Reality |
|---|---|
| An index on `completed` or `priority` | **None.** `PRAGMA index_list(tasks)` is empty. The `completed` filter is a full scan. |
| A migration system | **None.** No Alembic, no `migrations/`, and `PRAGMA user_version` is `0` with nothing reading it. |
| A `CHECK` constraint on `priority` | **None.** `low\|medium\|high` is enforced only by the `Priority` enum in `app/schemas/task.py`. Raw SQL can write anything. |

There are no foreign keys because there is exactly one table — no users, no
assignees, no tags, no comments, no subtasks. Adding a column means changing the
DDL *and* `TaskIn`/`Task` in `app/schemas/task.py` *and* `_row_to_dict`, since the
repository builds its dicts field by field rather than splatting the row.

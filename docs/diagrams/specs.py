"""Diagram declarations for MiniTrack.

Every participant label, method name, module path and env var below is taken
verbatim from the code. `check_names.py` enforces that: a spec naming a symbol
that does not exist in `app/` or `frontend/src/` fails the check. Keep it that
way -- an invented name in a diagram is exactly the failure mode CLAUDE.md's
guardrails exist to prevent.

Rendered by build_diagrams.py into drawio/ and svg/.
"""
from build_diagrams import Box, Component, Edge, Frag, Group, M, Note, P, Sequence

# =========================================================================
# Component / architecture diagrams
# =========================================================================

SYSTEM = Component(
    name="01-system-architecture",
    title="MiniTrack — system architecture",
    subtitle="React SPA over a layered FastAPI service on standard-library sqlite3",
    groups=[
        Group("Client — frontend/", 70, 175, 400, 460, "fe"),
        Group("ASGI middleware", 545, 175, 330, 460, "http"),
        Group("Backend — backend/app/", 940, 175, 545, 570, "http"),
        Group("Verification surfaces", 70, 790, 1415, 165, "good"),
    ],
    boxes=[
        Box("browser", "Browser", 105, 235, 330, 85, "ext", "sessionStorage · fetch"),
        Box("spa", "React SPA", 105, 355, 330, 90, "fe",
            "React 19.2 · Vite 8.1 · TypeScript 6.0"),
        Box("client", "src/api/client.ts", 105, 480, 330, 85, "fe",
            "the only fetch() in the app"),

        Box("cors", "CORSMiddleware", 570, 235, 280, 85, "http",
            "MINITRACK_CORS_ORIGINS"),
        Box("reqctx", "RequestContextMiddleware", 570, 355, 280, 90, "http",
            "uuid4 → X-Request-ID"),
        Box("excmw", "ExceptionMiddleware", 570, 480, 280, 85, "http",
            "app/core/errors.py"),

        Box("routes", "app/api/routes/", 970, 235, 485, 80, "http",
            "health.py · tasks.py"),
        Box("deps", "app/api/deps.py", 970, 340, 235, 75, "http", "DI wiring"),
        Box("security", "app/core/security.py", 1220, 340, 235, 75, "core",
            "X-API-Key"),
        Box("service", "app/services/task_service.py", 970, 440, 485, 80, "svc",
            "raises TaskNotFound · no FastAPI import"),
        Box("repo", "app/data/task_repository.py", 970, 545, 485, 80, "data",
            "the only task SQL"),
        Box("database", "app/data/database.py", 970, 650, 485, 75, "data",
            "the only sqlite3.connect()"),

        Box("db", "backend/minitrack.db", 1560, 560, 285, 110, "data",
            "SQLite 3.53.3 · 1 table · 0 indexes"),

        Box("vitest", "Vitest 4.1 + jsdom", 105, 845, 320, 80, "good",
            "82 tests over frontend/src"),
        Box("pytest", "pytest 8.3 + TestClient", 455, 845, 320, 80, "good",
            "34 tests over backend/"),
        Box("playwright", "Playwright 1.62", 805, 845, 320, 80, "good",
            "e2e/ — 16 tests, boots both halves"),
        Box("envcfg", "MINITRACK_* env", 1155, 845, 300, 80, "core",
            "backend/.env → uvicorn --env-file"),
    ],
    edges=[
        Edge("browser", "spa", "", "solid", "fe"),
        Edge("spa", "client", "", "solid", "fe"),
        Edge("client", "cors", "HTTP + X-API-Key", "solid", "http"),
        Edge("cors", "reqctx", "", "solid", "http"),
        Edge("reqctx", "excmw", "", "solid", "http"),
        Edge("excmw", "routes", "", "solid", "http"),
        Edge("security", "routes", "", "dashed", "core", "top"),
        Edge("deps", "service", "constructs", "dashed", "core", "bottom"),
        Edge("routes", "service", "", "solid", "svc"),
        Edge("service", "repo", "", "solid", "data"),
        Edge("repo", "database", "", "solid", "data"),
        Edge("database", "db", "", "solid", "data"),
    ],
    notes=[
        Note("Every /tasks call from the browser is preflighted, because "
             "X-API-Key is a non-simple header. With MINITRACK_CORS_ORIGINS "
             "empty, CORSMiddleware is not installed at all and the SPA "
             "cannot reach the API.",
             1500, 190, 350, 175, "http"),
        Note("No ORM, no migrations, no connection pool. The schema is "
             "CREATE TABLE IF NOT EXISTS, re-run on every connect().",
             1500, 700, 350, 120, "data"),
    ],
    footnote="Reading the diagram: three peer modules — backend/, frontend/, e2e/. "
             "Requests flow left to right and top to bottom; app/core/ and app/schemas/ "
             "are cross-cutting and are drawn in 02-backend-components.",
)

BACKEND = Component(
    name="02-backend-components",
    title="Backend components — backend/app/",
    subtitle="Each layer imports only downward; core/ and schemas/ are cross-cutting leaves",
    groups=[
        Group("Cross-cutting — app/core/ + app/schemas/", 95, 270, 385, 640, "core"),
        Group("HTTP edge — app/api/", 560, 275, 800, 230, "http"),
        Group("Business logic — app/services/", 560, 540, 800, 135, "svc"),
        Group("Persistence — app/data/", 560, 710, 800, 200, "data"),
    ],
    boxes=[
        Box("main", "app/main.py", 760, 165, 400, 80, "http",
            "create_app() · lifespan · middleware"),

        Box("health", "api/routes/health.py", 595, 325, 345, 80, "http",
            "GET /health · public"),
        Box("tasks", "api/routes/tasks.py", 970, 325, 355, 80, "http",
            "6 × /tasks · X-API-Key"),
        Box("deps", "app/api/deps.py", 595, 425, 730, 60, "http",
            "get_task_service → get_repository → get_settings"),

        Box("service", "app/services/task_service.py", 595, 575, 730, 80, "svc",
            "list · get · create · replace · complete · delete"),

        Box("repo", "app/data/task_repository.py", 595, 750, 345, 80, "data",
            "the only task SQL"),
        Box("database", "app/data/database.py", 970, 750, 355, 80, "data",
            "the only sqlite3.connect()"),
        Box("db", "backend/minitrack.db", 1450, 755, 300, 90, "data",
            "5 columns · 0 indexes"),

        Box("config", "core/config.py", 125, 320, 330, 70, "core",
            "Settings · @lru_cache"),
        Box("logging", "core/logging.py", 125, 402, 330, 70, "core",
            "request-id ContextVar"),
        Box("middleware", "core/middleware.py", 125, 484, 330, 70, "core",
            "RequestContextMiddleware"),
        Box("security", "core/security.py", 125, 566, 330, 70, "core",
            "X-API-Key · hmac.compare_digest"),
        Box("errors", "core/errors.py", 125, 648, 330, 70, "core",
            "TaskNotFound → 404 · 422 join"),
        Box("exceptions", "core/exceptions.py", 125, 730, 330, 70, "core",
            "DomainError · TaskNotFound"),
        Box("schemas", "app/schemas/", 125, 812, 330, 70, "core",
            "TaskIn · Task · ErrorResponse"),

        Box("seed", "seed_data.py", 1450, 290, 300, 75, "ext",
            "+ tests/test_seed_data.py"),
        Box("facade", "app/db.py", 1450, 415, 300, 90, "bad",
            "DEPRECATED compatibility facade"),
    ],
    edges=[
        Edge("main", "health", "", "solid", "http"),
        Edge("main", "tasks", "", "solid", "http"),
        Edge("tasks", "deps", "", "dashed", "http"),
        Edge("deps", "service", "", "solid", "svc"),
        Edge("service", "repo", "", "solid", "data", "bottom"),
        Edge("repo", "database", "", "solid", "data"),
        Edge("database", "db", "", "solid", "data"),
        Edge("seed", "facade", "", "solid", "bad"),
        Edge("facade", "database", "", "dashed", "bad"),
        Edge("security", "tasks", "", "dashed", "core", "right"),
        Edge("errors", "exceptions", "", "dashed", "core"),
    ],
    notes=[
        Note("app/services/ never imports fastapi. It raises TaskNotFound from "
             "app/core/exceptions.py, and app/core/errors.py is the single "
             "place that turns a domain exception into an HTTP status.",
             1400, 545, 400, 160, "svc"),
        Note("app/db.py is kept only so seed_data.py and the legacy "
             "tests/test_seed_data.py keep working. It is on no HTTP request "
             "path. Never build a new feature on it.",
             1400, 875, 400, 130, "bad"),
    ],
    footnote="Reading the diagram: solid arrows are imports/calls, dashed are "
             "wiring and cross-cutting use. Nothing in services/ or data/ points "
             "back up into api/.",
)

FRONTEND = Component(
    name="03-frontend-components",
    title="Frontend components — frontend/src/",
    subtitle="Pages coordinate, components display, api/ communicates, hooks package behaviour",
    groups=[
        Group("src/hooks/", 95, 400, 380, 195, "svc"),
        Group("src/pages/  ·  one per route", 520, 400, 800, 195, "fe"),
        Group("src/components/  ·  presentational, no fetching", 1365, 400, 465, 195, "fe"),
        Group("src/api/  ·  no React imports", 520, 640, 800, 140, "http"),
        Group("src/auth/", 1365, 640, 465, 200, "good"),
    ],
    boxes=[
        Box("main", "src/main.tsx", 700, 165, 440, 80, "fe",
            "hydrate → register → createRoot"),
        Box("app", "src/App.tsx", 700, 285, 440, 75, "fe", "the route table"),

        # useTaskList sits on the lower row so its edge down to src/api/ leaves
        # from clear space instead of appearing to start at a sibling hook.
        Box("useflash", "useFlash", 125, 442, 152, 60, "svc", ""),
        Box("usestatus", "useStatusFilter", 292, 442, 153, 60, "svc", ""),
        Box("usetasklist", "useTaskList", 125, 515, 320, 65, "svc",
            "6 reducer actions"),

        Box("connect", "ConnectPage", 550, 445, 240, 65, "fe", ""),
        Box("list", "TaskListPage", 810, 445, 240, 65, "fe", ""),
        Box("detail", "TaskDetailPage", 1070, 445, 230, 65, "fe", ""),
        Box("create", "TaskCreatePage", 550, 522, 240, 58, "fe", ""),
        Box("edit", "TaskEditPage", 810, 522, 240, 58, "fe", ""),
        Box("notfound", "NotFoundPage", 1070, 522, 230, 58, "fe", ""),

        Box("taskform", "TaskForm", 1390, 445, 200, 65, "fe", ""),
        Box("taskcard", "TaskCard", 1610, 445, 195, 65, "fe", ""),
        Box("dialog", "ConfirmDialog", 1390, 522, 200, 58, "fe", ""),
        Box("badges", "Badges · Flash", 1610, 522, 195, 58, "fe", ""),

        Box("client", "api/client.ts", 545, 685, 250, 75, "http",
            "the only fetch()"),
        Box("tasksapi", "api/tasks.ts", 812, 685, 226, 75, "http",
            "6 endpoint wrappers"),
        Box("apierrors", "api/errors.ts", 1055, 685, 245, 75, "http",
            "ApiClientError"),

        Box("store", "auth/apiKeyStore.ts", 1390, 685, 415, 70, "good",
            "observable store · no React"),
        Box("ctx", "ApiKeyContext", 1390, 768, 197, 58, "good",
            "useSyncExternalStore"),
        Box("protected", "ProtectedRoute", 1607, 768, 198, 58, "good", ""),

        Box("types", "src/types/index.ts", 700, 855, 440, 70, "core",
            "Task · TaskInput · Priority"),
        Box("backend", "FastAPI backend", 95, 680, 350, 90, "ext",
            "VITE_API_BASE_URL"),
    ],
    edges=[
        Edge("main", "app", "", "solid", "fe"),
        Edge("app", "list", "", "solid", "fe"),
        Edge("list", "usetasklist", "", "solid", "svc"),
        Edge("usetasklist", "tasksapi", "", "solid", "http", "bottom"),
        Edge("tasksapi", "client", "", "solid", "http"),
        Edge("client", "backend", "", "solid", "ext"),
        Edge("client", "apierrors", "", "dashed", "http"),
        # Label omitted: its midpoint falls inside src/components/. The note
        # bottom-left carries the explanation instead.
        Edge("main", "store", "", "dashed", "good", "right"),
        Edge("ctx", "store", "", "dashed", "good", "top"),
        Edge("protected", "ctx", "", "dashed", "good", "left"),
        Edge("tasksapi", "types", "", "dashed", "core", "bottom"),
    ],
    notes=[
        Note("The inversion that keeps src/api/ React-free: client.ts never "
             "imports apiKeyStore. main.tsx registers a getter with "
             "setApiKeyProvider, and client.ts pulls the key per request. A "
             "pushed key would lose the effect-ordering race and 401 on first load.",
             95, 810, 350, 175, "good"),
    ],
    footnote="Reading the diagram: arrows point the way imports go. Nothing under "
             "src/api/ imports React, and nothing under src/components/ fetches.",
)

PIPELINE = Component(
    name="04-request-pipeline",
    title="Request pipeline — the composed ASGI stack",
    subtitle="Outermost to innermost, as Starlette builds it on the first request",
    boxes=[
        Box("req", "Incoming request", 700, 160, 420, 70, "ext", ""),
        Box("servererr", "ServerErrorMiddleware", 640, 258, 540, 78, "core",
            "no handler registered → 500 as text/plain"),
        Box("cors", "CORSMiddleware", 640, 364, 540, 78, "http",
            "installed only when MINITRACK_CORS_ORIGINS is non-empty"),
        Box("reqctx", "RequestContextMiddleware", 640, 470, 540, 78, "http",
            "uuid4 → X-Request-ID header + app.access log"),
        Box("excmw", "ExceptionMiddleware", 640, 576, 540, 78, "http",
            "TaskNotFound → 404 · RequestValidationError → 422"),
        Box("route", "APIRoute", 640, 682, 540, 78, "svc",
            "solve_dependencies → require_api_key resolves first"),
        Box("endpoint", "endpoint function", 640, 788, 540, 78, "svc",
            "run_in_threadpool — every route is def, not async def"),
    ],
    edges=[
        Edge("req", "servererr", "", "solid", "core"),
        Edge("servererr", "cors", "", "solid", "http"),
        Edge("cors", "reqctx", "", "solid", "http"),
        Edge("reqctx", "excmw", "", "solid", "http"),
        Edge("excmw", "route", "", "solid", "svc"),
        Edge("route", "endpoint", "", "solid", "svc"),
    ],
    notes=[
        Note("add_middleware inserts at index 0, so the LAST registered "
             "middleware ends up OUTERMOST. create_app() registers "
             "RequestContextMiddleware first, then CORSMiddleware.",
             105, 258, 470, 145, "core"),
        Note("An OPTIONS preflight is answered by CORSMiddleware and never "
             "reaches RequestContextMiddleware — so preflights get no "
             "X-Request-ID and no access-log line.",
             105, 430, 470, 145, "http"),
        Note("ExceptionMiddleware sits INSIDE RequestContextMiddleware, which "
             "is why get_request_id() still resolves when _error_response "
             "builds a 404 or 422 body.",
             1245, 560, 470, 145, "http"),
        Note("require_api_key resolves before body validation. A bad key plus "
             "a bad body therefore returns 401 — never 422.",
             1245, 730, 470, 125, "bad"),
    ],
    footnote="Reading the diagram: a request travels down the stack and the "
             "response travels back up, picking up X-Request-ID and CORS headers "
             "on the way out.",
)

COMPONENTS = [SYSTEM, BACKEND, FRONTEND, PIPELINE]


# =========================================================================
# Sequence diagrams
# =========================================================================

SEQ_CONNECT = Sequence(
    name="10-seq-connect",
    title="Connecting with an API key",
    subtitle="/connect → validate against a real protected endpoint → store the key",
    participants=[
        P("browser", "Browser", "ext"),
        P("page", "ConnectPage.tsx", "fe"),
        P("tasksapi", "api/tasks.ts", "fe"),
        P("client", "api/client.ts", "fe"),
        P("security", "core/security.py", "http"),
        P("store", "auth/apiKeyStore.ts", "good"),
    ],
    messages=[
        M("browser", "page", "submit form"),
        M("page", "tasksapi", "validateApiKey(candidate)"),
        M("tasksapi", "client", "request('/tasks', { limit: 1 }, apiKey)"),
        M("client", "client", "usedExplicitKey = true", "self"),
        M("client", "security", "GET /tasks?limit=1", "call", None,
          "header X-API-Key: candidate"),
        M("security", "security", "hmac.compare_digest over UTF-8 bytes", "self"),
        M("security", "client", "200 — a bare array", "return", "good"),
        M("client", "tasksapi", "Task[]", "return", "good"),
        M("page", "store", "connect(candidate, { remember })", "call", "good"),
        M("store", "store", "writeStored() → sessionStorage, if remember", "self",
          "good"),
        M("store", "page", "notify → isConnected = true", "return", "good"),
        M("page", "browser", "navigate(from, { replace: true })", "call", "good"),
        M("security", "client", "401 { detail: 'Invalid or missing API key' }",
          "return", "bad"),
        M("client", "client", "401 but usedExplicitKey → skip handler", "self", "bad"),
        M("client", "page", "throw ApiClientError", "return", "bad"),
        M("page", "browser", "'That API key was rejected.'", "call", "bad"),
    ],
    fragments=[
        Frag(6, 6, "alt  [key accepted]", "good"),
        Frag(12, 4, "alt  [key rejected]", "bad"),
    ],
    footnote="Validation deliberately hits /tasks?limit=1, not /health: /health is "
             "public and would accept a wrong key. Passing the key explicitly is what "
             "stops a rejected candidate from tearing down a live session.",
)

SEQ_TASK_LIST = Sequence(
    name="11-seq-task-list",
    title="Loading the task list, then Load more",
    subtitle="Full stack, including the abort guard and offset bookkeeping",
    participants=[
        P("page", "TaskListPage.tsx", "fe"),
        P("hook", "useTaskList.ts", "svc"),
        P("tasksapi", "api/tasks.ts", "fe"),
        P("route", "routes/tasks.py", "http"),
        P("service", "task_service.py", "svc"),
        P("repo", "task_repository.py", "data"),
        P("db", "minitrack.db", "data"),
    ],
    messages=[
        M("page", "hook", "useTaskList(completed)"),
        M("hook", "hook", "abort in-flight · seq = ++requestSeq · 'load-start'", "self"),
        M("hook", "tasksapi", "listTasks({ limit: 20, offset: 0, signal })"),
        M("tasksapi", "route", "GET /tasks?limit=20&offset=0"),
        M("route", "service", "list_tasks(query)"),
        M("service", "repo", "list_tasks(completed, limit, offset)"),
        M("repo", "db", "SELECT … ORDER BY id LIMIT ? OFFSET ?"),
        M("db", "repo", "sqlite3.Row rows", "return"),
        M("repo", "service", "[dict] — completed int → bool", "return"),
        M("service", "route", "[dict]", "return"),
        M("route", "tasksapi", "200 [Task]", "return", "good"),
        M("tasksapi", "hook", "Task[]", "return", "good"),
        M("hook", "hook", "stale seq? drop · else 'load-success'", "self"),
        M("hook", "page", "dedupe by id · render TaskCard × N", "return", "good"),
        M("page", "hook", "loadMore() → offset 20"),
        M("hook", "hook", "hasMore = page.length === PAGE_SIZE", "self", "good"),
    ],
    fragments=[
        Frag(14, 2, "opt  [user clicks Load more]", "fe"),
    ],
    footnote="GET /tasks returns a bare array with no total, so a short page is the "
             "only end-of-list signal, and nextOffset is a counter rather than "
             "tasks.length — a delete must not cause an already-seen row to be re-fetched.",
)

SEQ_CREATE = Sequence(
    name="12-seq-create-task",
    title="Creating a task",
    subtitle="POST /tasks → 201 → redirect carrying a one-shot flash message",
    participants=[
        P("form", "TaskForm.tsx", "fe"),
        P("page", "TaskCreatePage.tsx", "fe"),
        P("tasksapi", "api/tasks.ts", "fe"),
        P("route", "routes/tasks.py", "http"),
        P("service", "task_service.py", "svc"),
        P("repo", "task_repository.py", "data"),
        P("db", "minitrack.db", "data"),
    ],
    messages=[
        M("form", "form", "blank title? error, never hits the network", "self"),
        M("form", "page", "onSubmit(toTaskInput(values))", "call", None,
          "empty description becomes null, not ''"),
        M("page", "page", "inFlight guard against double submit", "self"),
        M("page", "tasksapi", "createTask(input)"),
        M("tasksapi", "route", "POST /tasks"),
        M("route", "route", "require_api_key resolves before the body", "self"),
        M("route", "route", "TaskIn — title min_length=1, Priority enum", "self"),
        M("route", "service", "create_task(payload)"),
        M("service", "repo", "create_task(title, description, priority)"),
        M("repo", "db", "① INSERT INTO tasks (…)"),
        M("db", "repo", "lastrowid", "return"),
        M("repo", "db", "② SELECT * FROM tasks WHERE id = ? — the re-fetch"),
        M("db", "repo", "fresh row", "return"),
        M("repo", "service", "dict", "return"),
        M("route", "tasksapi", "201 Task", "return", "good"),
        M("page", "form", "navigate to /tasks/{id} with state.flash", "call",
          "good", "useRouterFlash consumes it exactly once"),
    ],
    footnote="TaskRepository.create_task opens two separate connections — insert, then "
             "re-fetch — so the operation is not atomic end to end. Accepted for a "
             "single-user lab (ARCHITECTURE.md §6).",
)

SEQ_EDIT = Sequence(
    name="13-seq-edit-task",
    title="Editing a task — PATCH is a full replacement",
    subtitle="Including the 404 path when the row disappeared underneath",
    participants=[
        P("page", "TaskEditPage.tsx", "fe"),
        P("tasksapi", "api/tasks.ts", "fe"),
        P("route", "routes/tasks.py", "http"),
        P("service", "task_service.py", "svc"),
        P("repo", "task_repository.py", "data"),
        P("errors", "core/errors.py", "http"),
        P("db", "minitrack.db", "data"),
    ],
    messages=[
        M("page", "tasksapi", "getTask(id) — pre-fill the form"),
        M("tasksapi", "page", "Task → fromTask(task)", "return"),
        M("page", "tasksapi", "replaceTask(id, input)", "call", None,
          "all three fields always sent"),
        M("tasksapi", "route", "PATCH /tasks/{id}", "call", None,
          "binds the same TaskIn model as POST"),
        M("route", "service", "replace_task(task_id, data)"),
        M("service", "repo", "update_task(task_id, …)"),
        M("repo", "db", "① SELECT — does the row exist?"),
        M("db", "repo", "row or None", "return"),
        M("repo", "db", "② UPDATE title, description, priority", "call", "good"),
        M("repo", "db", "③ SELECT — re-fetch the fresh row", "call", "good"),
        M("repo", "service", "dict", "return", "good"),
        M("route", "page", "200 Task → 'Task updated.'", "return", "good"),
        M("repo", "service", "None", "return", "bad"),
        M("service", "service", "raise TaskNotFound(task_id)", "self", "bad"),
        M("errors", "page", "404 { detail, request_id }", "return", "bad"),
        M("page", "page", "isNotFound → render the not-found state", "self", "bad"),
    ],
    fragments=[
        Frag(8, 4, "alt  [row exists]", "good"),
        Frag(12, 4, "alt  [row is gone]", "bad"),
    ],
    footnote="Omitting a field does not leave it alone: description omitted writes NULL, "
             "priority omitted resets to 'medium'. That is why the client wrapper is "
             "named replaceTask, and why completed cannot be changed here at all.",
)

SEQ_COMPLETE = Sequence(
    name="14-seq-complete-task",
    title="Completing a task — one way only",
    subtitle="The row is updated in place, never removed from the list",
    participants=[
        P("card", "TaskCard.tsx", "fe"),
        P("page", "TaskListPage.tsx", "fe"),
        P("hook", "useTaskList.ts", "svc"),
        P("tasksapi", "api/tasks.ts", "fe"),
        P("route", "routes/tasks.py", "http"),
        P("service", "task_service.py", "svc"),
        P("repo", "task_repository.py", "data"),
    ],
    messages=[
        M("card", "page", "onComplete(task)"),
        M("page", "page", "setBusyTaskId(task.id)", "self"),
        M("page", "tasksapi", "completeTask(task.id)"),
        M("tasksapi", "route", "POST /tasks/{id}/complete", "call", None,
          "no body, so no Content-Type header"),
        M("route", "service", "complete_task(task_id)"),
        M("service", "repo", "set_completed(task_id, True)"),
        M("repo", "repo", "check → UPDATE completed = 1 → re-fetch", "self", None,
          "three connections"),
        M("repo", "service", "dict or None", "return"),
        M("service", "service", "None → raise TaskNotFound(task_id)", "self", "bad"),
        M("service", "route", "dict", "return", "good"),
        M("route", "tasksapi", "200 Task", "return", "good"),
        M("tasksapi", "page", "updated", "return", "good"),
        M("page", "hook", "dispatch 'task-updated'", "call", "good"),
        M("hook", "card", "row re-renders with the Completed badge", "return", "good"),
        M("page", "page", "showFlash('… marked complete.')", "self", "good"),
    ],
    footnote="There is no reopen endpoint and PATCH cannot set completed, so the "
             "Complete button simply disappears once the task is done. Under "
             "?status=active the row stays visible until the next reload — it is "
             "updated in place, not filtered out.",
)

SEQ_DELETE = Sequence(
    name="15-seq-delete-task",
    title="Deleting a task — confirm, 204, and focus restore",
    subtitle="204 returns before any body read; focus is moved before the row unmounts",
    participants=[
        P("page", "TaskListPage.tsx", "fe"),
        P("dialog", "ConfirmDialog.tsx", "fe"),
        P("tasksapi", "api/tasks.ts", "fe"),
        P("client", "api/client.ts", "fe"),
        P("route", "routes/tasks.py", "http"),
        P("service", "task_service.py", "svc"),
        P("repo", "task_repository.py", "data"),
    ],
    messages=[
        M("page", "dialog", "setPendingDelete(task) → open"),
        M("dialog", "dialog", "native <dialog>.showModal()", "self", None,
          "focus trap and Escape come from the browser"),
        M("dialog", "page", "onConfirm", "return"),
        M("page", "tasksapi", "deleteTask(id)"),
        M("tasksapi", "client", "requestVoid(path, { method: 'DELETE' })"),
        M("client", "route", "DELETE /tasks/{id}"),
        M("route", "service", "delete_task(task_id)"),
        M("service", "repo", "delete_task(task_id)"),
        M("repo", "repo", "check exists → DELETE FROM tasks", "self", None,
          "two connections"),
        M("repo", "service", "True", "return", "good"),
        M("route", "client", "204 No Content", "return", "good"),
        M("client", "client", "204 → return null before reading a body", "self",
          "good"),
        M("client", "page", "resolves void", "return", "good"),
        M("page", "page", "'task-removed' · showFlash · setRestoreFocus", "self",
          "good"),
        M("route", "client", "404 — already deleted", "return", "bad"),
        M("page", "page", "isNotFound → remove the row anyway", "self", "bad"),
    ],
    fragments=[
        Frag(9, 5, "alt  [row still existed]", "good"),
        Frag(14, 2, "alt  [row was already gone]", "bad"),
    ],
    footnote="The two-phase focus restore exists because <dialog>.close() returns focus "
             "to the button that opened it — a Delete button on a row that has just "
             "unmounted. Focus is moved to the list heading instead.",
)

SEQ_401 = Sequence(
    name="16-seq-session-401",
    title="A mid-session 401 tears the session down",
    subtitle="The two-tier rule: stored key vs explicitly supplied candidate",
    participants=[
        P("hook", "useTaskList.ts", "svc"),
        P("client", "api/client.ts", "fe"),
        P("security", "core/security.py", "http"),
        P("main", "src/main.tsx", "fe"),
        P("store", "auth/apiKeyStore.ts", "good"),
        P("guard", "ProtectedRoute.tsx", "good"),
        P("connect", "ConnectPage.tsx", "fe"),
    ],
    messages=[
        M("hook", "client", "listTasks(…) — no explicit key"),
        M("client", "client", "usedExplicitKey = false; key from apiKeyProvider()",
          "self"),
        M("client", "security", "GET /tasks + X-API-Key"),
        M("security", "client", "401 — key no longer valid", "return", "bad"),
        M("client", "client", "401 and NOT usedExplicitKey → fire the handler", "self",
          "bad"),
        M("client", "main", "unauthorizedHandler(error)", "call", "bad"),
        M("main", "store", "disconnect('Your API key was rejected — please reconnect.')",
          "call", "bad"),
        M("store", "store", "sessionStorage.removeItem · snapshot.apiKey = null",
          "self", "bad"),
        M("store", "guard", "useSyncExternalStore notifies → isConnected = false",
          "return", "bad"),
        M("guard", "connect", "Navigate to /connect, state.from = current path",
          "call", "bad"),
        M("connect", "connect", "render the disconnectReason banner", "self", "bad"),
        M("client", "hook", "throw ApiClientError — caller still sees it", "return"),
        M("client", "security", "GET /tasks?limit=1 with an explicit candidate"),
        M("security", "client", "401", "return", "good"),
        M("client", "client", "usedExplicitKey → handler skipped, session survives",
          "self", "good"),
    ],
    fragments=[
        Frag(0, 12, "alt  [stored key rejected — tier 1]", "bad"),
        Frag(12, 3, "alt  [candidate key rejected — tier 2]", "good"),
    ],
    footnote="Both tiers are decided by one condition in api/client.ts: "
             "status === 401 && !usedExplicitKey. Only the stored-key case disconnects; "
             "a rejected candidate on /connect must never log the user out.",
)

SEQ_422 = Sequence(
    name="17-seq-validation-422",
    title="A validation failure becomes a single string",
    subtitle="Pydantic errors are joined, not passed through as FastAPI's array",
    participants=[
        P("form", "TaskForm.tsx", "fe"),
        P("client", "api/client.ts", "fe"),
        P("security", "core/security.py", "http"),
        P("route", "routes/tasks.py", "http"),
        P("schema", "schemas/task.py", "core"),
        P("errors", "core/errors.py", "http"),
        P("apierrors", "api/errors.ts", "fe"),
    ],
    messages=[
        M("form", "client", "createTask({ title: '   ', priority: 'urgent' })"),
        M("client", "security", "POST /tasks"),
        M("security", "security", "require_api_key resolves FIRST", "self"),
        M("security", "route", "key ok → continue to body validation", "return"),
        M("route", "schema", "TaskIn(**body)"),
        M("schema", "schema", "title min_length=1 fails · Priority enum fails", "self",
          "bad"),
        M("schema", "route", "raise RequestValidationError", "return", "bad"),
        M("route", "errors", "handled by _validation_error", "call", "bad"),
        M("errors", "errors",
          "'; '.join(f\"{loc}: {msg}\") — one flat string", "self", "bad"),
        M("errors", "errors", "ErrorResponse(detail, request_id=get_request_id())",
          "self", "bad"),
        M("errors", "client", "422 { detail: '…', request_id: '…' }", "return", "bad"),
        M("client", "client", "read the body with .text(), never .json()", "self"),
        M("client", "apierrors", "new ApiClientError({ status: 422, detail })", "call",
          "bad"),
        M("apierrors", "form", "detail used verbatim in the error banner", "return",
          "bad"),
    ],
    footnote="A 422 detail is a plain string, not FastAPI's array of { loc, msg, type }. "
             "Only read detail when it is a string. A 401 body carries no request_id, "
             "and an unhandled 500 is text/plain — which is why error bodies are always "
             "read with .text().",
)

SEQUENCES = [
    SEQ_CONNECT, SEQ_TASK_LIST, SEQ_CREATE, SEQ_EDIT,
    SEQ_COMPLETE, SEQ_DELETE, SEQ_401, SEQ_422,
]

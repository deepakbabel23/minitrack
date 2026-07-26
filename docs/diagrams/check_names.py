#!/usr/bin/env python3
"""Verify that every name used in a diagram spec actually exists in the code.

A diagram that names a function, module or env var which does not exist is
worse than no diagram: it reads as authoritative and is wrong. This walks
specs.py, pulls out every candidate symbol, and resolves each one against the
real tree (app/, frontend/src/, tests/).

Anything genuinely external -- framework classes, browser APIs, SQL keywords --
lives in EXTERNAL below and is skipped by name, so the allowlist stays small,
explicit and reviewable.

Usage:
    python docs/diagrams/check_names.py
Exit code 1 if any name cannot be resolved.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent

# Names that are real but belong to somebody else's codebase, or are language /
# browser / SQL builtins. Each is deliberate -- do not add to this list to make
# a failure go away without checking the name first.
EXTERNAL = {
    # FastAPI / Starlette / Pydantic
    "CORSMiddleware", "ExceptionMiddleware", "ServerErrorMiddleware", "APIRoute",
    "RequestValidationError", "HTTPException", "APIKeyHeader", "BaseModel",
    "TestClient", "run_in_threadpool", "solve_dependencies", "JSONResponse",
    # stdlib
    "sqlite3", "hmac", "compare_digest", "lru_cache", "uuid4",
    # browser / React / router
    "sessionStorage", "localStorage", "fetch", "dialog", "showModal",
    "useSyncExternalStore", "useReducer", "useRef", "createRoot",
    "AbortController", "Navigate", "DOMException", "Response", "JSON",
    # tooling
    "Vitest", "jsdom", "pytest", "Playwright", "uvicorn", "vite", "npm",
    # SQL
    "SELECT", "INSERT", "UPDATE", "DELETE", "FROM", "WHERE", "ORDER", "LIMIT",
    "OFFSET", "INTO", "VALUES", "CREATE", "TABLE", "EXISTS", "AUTOINCREMENT",
    "INTEGER", "TEXT", "NULL", "CHECK", "PRAGMA",
    # prose words that happen to match an identifier shape
    "connect", "disconnect", "render", "resolves", "notify", "propagates",
    "ok", "dict", "bool", "int", "str", "None", "True", "False",
}

# Where to look for each kind of name. Diagram labels say "app/…" because the
# package is still called app; BACKEND is the directory that now contains it, so
# both spellings resolve.
BACKEND = ROOT / "backend"
PY_ROOTS = [BACKEND / "app", BACKEND / "tests", BACKEND]
TS_ROOTS = [ROOT / "frontend" / "src", ROOT / "e2e" / "tests"]

# Bases a relative path from a diagram label may be resolved against.
PATH_BASES = [ROOT, BACKEND, ROOT / "frontend"]


def load_sources() -> tuple[str, str]:
    """Concatenate the Python and TypeScript trees once, for substring lookup."""
    py, ts = [], []
    missing = [r for r in PY_ROOTS + TS_ROOTS if not r.exists()]
    if missing:
        # Silently skipping a missing root would make every name "unresolvable"
        # and read as hundreds of spec errors instead of one path bug.
        raise SystemExit(
            "check_names.py: source root(s) not found -- has the tree moved?\n"
            + "\n".join(f"  {r}" for r in missing)
        )
    for root in PY_ROOTS:
        files = root.glob("*.py") if root == BACKEND else root.rglob("*.py")
        for f in files:
            if ".venv" not in f.parts and "__pycache__" not in f.parts:
                py.append(f.read_text(errors="ignore"))
    for root in TS_ROOTS:
        for pattern in ("**/*.ts", "**/*.tsx"):
            for f in root.glob(pattern):
                if "node_modules" not in f.parts:
                    ts.append(f.read_text(errors="ignore"))
    return "\n".join(py), "\n".join(ts)


PATH_RE = re.compile(
    r"\b((?:backend/app|backend|app|src|tests|frontend/src|e2e)/[\w./-]*\w)")
BARE_FILE_RE = re.compile(r"\b([A-Za-z][\w-]*\.(?:py|ts|tsx))\b")
PY_CALL_RE = re.compile(r"\b([a-z_][a-z0-9_]{3,})\(")
JS_CALL_RE = re.compile(r"\b([a-z][a-zA-Z0-9]{3,})\(")
# Requires an internal camel hump, so prose ("Reading", "Business") and
# all-caps emphasis ("OUTERMOST") are not mistaken for identifiers.
CLASS_RE = re.compile(r"\b([A-Z][a-z0-9]+(?:[A-Z][a-zA-Z0-9]*)+)\b")
ENV_RE = re.compile(r"\b(MINITRACK_[A-Z_]+|VITE_[A-Z_]+)\b")


def spec_strings() -> list[tuple[str, str]]:
    """Every human-visible string in specs.py, tagged with its diagram name."""
    sys.path.insert(0, str(HERE))
    import specs  # noqa: E402  (import after sys.path fix-up)

    out: list[tuple[str, str]] = []

    def add(name: str, *values: str) -> None:
        for v in values:
            if v:
                out.append((name, v))

    for c in specs.COMPONENTS:
        add(c.name, c.title, c.subtitle, c.footnote)
        for g in c.groups:
            add(c.name, g.label)
        for b in c.boxes:
            add(c.name, b.label, b.sub)
        for e in c.edges:
            add(c.name, e.label)
        for n in c.notes:
            add(c.name, n.text)
    for s in specs.SEQUENCES:
        add(s.name, s.title, s.subtitle, s.footnote)
        for p in s.participants:
            add(s.name, p.label, p.sub)
        for m in s.messages:
            add(s.name, m.label, m.note)
        for f in s.fragments:
            add(s.name, f.label)
    return out


def resolve_path(candidate: str) -> bool:
    """A path is valid if it exists under any of the module roots."""
    for base in PATH_BASES:
        target = base / candidate
        if target.exists():
            return True
        # Trailing-slash forms like "app/api/routes/" and "src/pages/".
        if candidate.endswith("/") and target.is_dir():
            return True
    return False


def main() -> int:
    py_src, ts_src = load_sources()
    all_src = py_src + "\n" + ts_src
    failures: list[str] = []
    checked = 0

    for diagram, text in spec_strings():
        candidates: list[tuple[str, str]] = []
        for m in PATH_RE.finditer(text):
            candidates.append(("path", m.group(1)))
        for m in BARE_FILE_RE.finditer(text):
            candidates.append(("file", m.group(1)))
        for m in PY_CALL_RE.finditer(text):
            candidates.append(("py", m.group(1)))
        for m in JS_CALL_RE.finditer(text):
            candidates.append(("js", m.group(1)))
        for m in CLASS_RE.finditer(text):
            candidates.append(("sym", m.group(1)))
        for m in ENV_RE.finditer(text):
            candidates.append(("env", m.group(1)))

        for kind, name in candidates:
            if name in EXTERNAL:
                continue
            checked += 1
            if kind == "path":
                ok = resolve_path(name.rstrip("/")) or resolve_path(name)
            elif kind == "file":
                ok = any(
                    next(r.rglob(name), None) is not None
                    for r in (BACKEND / "app", BACKEND / "tests",
                              ROOT / "frontend" / "src", ROOT / "e2e" / "tests")
                    if r.is_dir()
                ) or any((b / name).exists() for b in PATH_BASES)
            elif kind == "env":
                env_example = BACKEND / ".env.example"
                ok = name in all_src or name in (
                    env_example.read_text() if env_example.exists() else ""
                )
            else:
                ok = name in all_src
            if not ok:
                failures.append(f"  {diagram}: {kind} '{name}' not found in the tree")

    unique = sorted(set(failures))
    for line in unique:
        print(line)
    if unique:
        print(f"\n{len(unique)} unresolved name(s) out of {checked} checked.")
        print("Either fix the spec or, if the name is genuinely external, "
              "add it to EXTERNAL in check_names.py with a reason.")
        return 1
    print(f"All {checked} names in specs.py resolve to real symbols, files or "
          f"env vars.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

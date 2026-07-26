"""Architecture invariants, enforced rather than documented.

CLAUDE.md and ARCHITECTURE.md state a handful of rules -- the service layer is
framework-agnostic, SQL lives only in app/data/, imports point downward, the
app/db.py facade is off the request path. Those were honour-system until now:
nothing failed if you broke one, and the damage (dragging FastAPI into the
domain layer, say) is invisible until something else goes wrong.

These tests turn each rule into a failure. They read the source with `ast`
rather than importing it, so a violation is reported as a layering error
instead of an ImportError.
"""
import ast
import subprocess
import sys
from pathlib import Path

import pytest

APP = Path(__file__).resolve().parent.parent / "app"

# Which app.* packages each layer is allowed to import. The composition root is
# the one documented exception -- see ARCHITECTURE.md section 5.
ALLOWED: dict[str, set[str]] = {
    "api": {"api", "core", "schemas", "services", "data"},  # deps.py wires data
    "services": {"core", "schemas", "data"},
    "data": set(),                                          # a true bottom
    "core": {"core", "schemas"},
    "schemas": set(),
}


def _modules() -> list[Path]:
    return sorted(p for p in APP.rglob("*.py") if p.stat().st_size)


def _package_of(path: Path) -> str:
    """'api' for app/api/routes/tasks.py; '' for app/main.py and app/db.py."""
    rel = path.relative_to(APP).parts
    return rel[0] if len(rel) > 1 else ""


def _imported_app_packages(path: Path) -> set[str]:
    """The app.<pkg> names this module imports."""
    tree = ast.parse(path.read_text(), filename=str(path))
    found: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and (node.module or "").startswith("app"):
            parts = node.module.split(".")
            if len(parts) > 1:
                found.add(parts[1])
        elif isinstance(node, ast.Import):
            for alias in node.names:
                parts = alias.name.split(".")
                if parts[0] == "app" and len(parts) > 1:
                    found.add(parts[1])
    return found


def _run_in_subprocess(code: str) -> str:
    """Run code in a clean interpreter rooted at backend/, return stdout."""
    result = subprocess.run(
        [sys.executable, "-c", code],
        cwd=APP.parent, capture_output=True, text=True, check=False,
    )
    assert result.returncode == 0, result.stderr
    return result.stdout.strip()


# --- the layering rule ----------------------------------------------------
@pytest.mark.parametrize("module", _modules(), ids=lambda p: str(p.name))
def test_imports_point_downward(module: Path) -> None:
    """No layer reaches past or above itself.

    app/main.py and app/db.py sit outside the layer stack (composition root and
    deprecated facade) and are exempt from the direction rule.
    """
    package = _package_of(module)
    if package not in ALLOWED:
        return
    illegal = _imported_app_packages(module) - ALLOWED[package] - {package}
    assert not illegal, (
        f"{module.relative_to(APP.parent)} is in the '{package}' layer and may "
        f"not import app.{{{', '.join(sorted(illegal))}}}. "
        f"Allowed: {sorted(ALLOWED[package]) or 'nothing'}."
    )


# --- the framework-agnostic rule ------------------------------------------
def test_service_layer_never_pulls_in_fastapi() -> None:
    """Importing the service layer must not import FastAPI, even transitively.

    A static check is not enough here: the regression that prompted this (see
    CODE_REVIEW.md V1) was TaskNotFound living in a module that imported
    fastapi, so task_service reached it through one hop.
    """
    leaked = _run_in_subprocess(
        "import app.services.task_service, sys;"
        "print(','.join(m for m in ('fastapi', 'starlette') if m in sys.modules))"
    )
    assert leaked == "", (
        f"app/services/ transitively imports {leaked}. The service layer must "
        f"stay framework-agnostic -- raise a domain exception from "
        f"app/core/exceptions.py and let app/core/errors.py map it."
    )


def test_domain_exceptions_import_nothing() -> None:
    """app/core/exceptions.py is what makes the rule above holdable."""
    tree = ast.parse((APP / "core" / "exceptions.py").read_text())
    imports = [n for n in ast.walk(tree) if isinstance(n, (ast.Import, ast.ImportFrom))]
    assert not imports, (
        "app/core/exceptions.py must import nothing -- every layer depends on "
        "it, so anything it pulls in is pulled in everywhere."
    )


# --- the persistence rule -------------------------------------------------
def test_sql_and_sqlite_confined_to_the_data_layer() -> None:
    """Only app/data/ may speak sqlite3."""
    offenders = []
    for module in _modules():
        if _package_of(module) == "data":
            continue
        source = module.read_text()
        tree = ast.parse(source, filename=str(module))
        imports_sqlite = any(
            (isinstance(n, ast.Import) and any(a.name == "sqlite3" for a in n.names))
            or (isinstance(n, ast.ImportFrom) and n.module == "sqlite3")
            for n in ast.walk(tree)
        )
        # .execute( in real code, not in a docstring or comment
        executes = any(
            isinstance(n, ast.Attribute) and n.attr == "execute"
            for n in ast.walk(tree)
        )
        if imports_sqlite or executes:
            offenders.append(str(module.relative_to(APP.parent)))
    assert not offenders, (
        f"SQL escaped app/data/: {offenders}. Persistence goes in "
        f"TaskRepository and returns dict/None/bool."
    )


# --- the deprecated facade ------------------------------------------------
def test_facade_is_not_on_the_request_path() -> None:
    """Building the app must not import app.db.

    app/db.py exists only for seed_data.py and tests/test_seed_data.py. If it
    ever gets wired into the app, the layered path has been bypassed.
    """
    loaded = _run_in_subprocess(
        "from app.main import create_app; create_app();"
        "import sys; print('app.db' in sys.modules)"
    )
    assert loaded == "False", (
        "app.db was imported while building the app. The facade is deprecated "
        "and must stay off the HTTP request path -- use app/api/deps.py."
    )

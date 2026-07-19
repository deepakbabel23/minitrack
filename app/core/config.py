"""Application configuration.

A plain Pydantic model populated from `os.environ`, cached with
`functools.lru_cache`. `pydantic-settings` is intentionally not used --
it isn't part of the lab's pinned dependencies (see ARCHITECTURE.md
section 8) -- so the environment is read by hand instead.
"""
import os
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel

_DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent.parent / "minitrack.db"


class Settings(BaseModel):
    app_name: str = "MiniTrack"
    api_keys: frozenset[str] = frozenset()
    db_path: Path = _DEFAULT_DB_PATH
    log_level: str = "INFO"
    api_prefix: str = ""
    cors_origins: list[str] = []


def _csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    env = os.environ
    return Settings(
        api_keys=frozenset(_csv(env.get("MINITRACK_API_KEYS", ""))),
        db_path=Path(env["MINITRACK_DB_PATH"]) if "MINITRACK_DB_PATH" in env else _DEFAULT_DB_PATH,
        log_level=env.get("MINITRACK_LOG_LEVEL", "INFO"),
        api_prefix=env.get("MINITRACK_API_PREFIX", ""),
        cors_origins=_csv(env.get("MINITRACK_CORS_ORIGINS", "")),
    )

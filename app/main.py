"""
MiniTrack — a minimalist team task tracker (FastAPI + SQLite).

Layered backend: api/ (routing) -> services/ (business logic) ->
data/ (persistence), with core/ providing config, logging, security and
error handling as cross-cutting concerns. See ARCHITECTURE.md for the
full design and the migration this module went through.

Run it:
    pip install -r requirements.txt
    cp .env.example .env   # set MINITRACK_API_KEYS or every /tasks call gets 401
    uvicorn app.main:app --reload --env-file .env
Then open http://127.0.0.1:8000/docs
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, tasks
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import RequestContextMiddleware
from app.data.database import init_schema


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    init_schema(settings.db_path)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)

    app = FastAPI(
        title=settings.app_name,
        description="A minimalist team task tracker — K21 Academy Day 3 practice repo.",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(RequestContextMiddleware)
    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    register_exception_handlers(app)

    app.include_router(health.router, prefix=settings.api_prefix)
    app.include_router(tasks.router, prefix=settings.api_prefix)

    return app


app = create_app()

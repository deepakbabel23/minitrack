"""Dependency-injection seam wiring settings -> repository -> service.

This is what tests override to point the app at an isolated DB (see
ARCHITECTURE.md section 12 / tests/conftest.py).
"""
from fastapi import Depends

from app.core.config import Settings, get_settings
from app.data.database import get_connection
from app.data.task_repository import TaskRepository
from app.services.task_service import TaskService


def get_repository(settings: Settings = Depends(get_settings)) -> TaskRepository:
    return TaskRepository(lambda: get_connection(settings.db_path))


def get_task_service(repo: TaskRepository = Depends(get_repository)) -> TaskService:
    return TaskService(repo)

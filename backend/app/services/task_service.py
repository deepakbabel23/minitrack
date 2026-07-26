"""All task business logic.

Framework-agnostic: no FastAPI import here. Turns repository sentinels
(None/False) into domain exceptions the HTTP edge maps to status codes
(see ARCHITECTURE.md sections 5 and 11).
"""
from app.core.exceptions import TaskNotFound
from app.data.task_repository import TaskRepository
from app.schemas.task import TaskIn, TaskListQuery


class TaskService:
    def __init__(self, repository: TaskRepository):
        self._repo = repository

    def list_tasks(self, query: TaskListQuery) -> list[dict]:
        return self._repo.list_tasks(
            completed=query.completed, limit=query.limit, offset=query.offset
        )

    def get_task(self, task_id: int) -> dict:
        task = self._repo.get_task(task_id)
        if task is None:
            raise TaskNotFound(task_id)
        return task

    def create_task(self, data: TaskIn) -> dict:
        return self._repo.create_task(
            title=data.title, description=data.description, priority=data.priority.value
        )

    def replace_task(self, task_id: int, data: TaskIn) -> dict:
        task = self._repo.update_task(
            task_id,
            title=data.title,
            description=data.description,
            priority=data.priority.value,
        )
        if task is None:
            raise TaskNotFound(task_id)
        return task

    def complete_task(self, task_id: int) -> dict:
        task = self._repo.set_completed(task_id, True)
        if task is None:
            raise TaskNotFound(task_id)
        return task

    def delete_task(self, task_id: int) -> None:
        if not self._repo.delete_task(task_id):
            raise TaskNotFound(task_id)

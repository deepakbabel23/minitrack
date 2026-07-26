"""Task endpoints -- thin controllers only.

No SQL and no `if result is None: raise HTTPException(...)` here: the
service layer owns business logic and raises domain exceptions that
app.core.errors maps to HTTP centrally.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response

from app.api.deps import get_task_service
from app.core.security import require_api_key
from app.schemas.task import Task, TaskIn, TaskListQuery
from app.services.task_service import TaskService

router = APIRouter(
    prefix="/tasks",
    tags=["tasks"],
    dependencies=[Depends(require_api_key)],
)


@router.get("", response_model=list[Task])
def list_tasks(
    query: Annotated[TaskListQuery, Query()],
    service: TaskService = Depends(get_task_service),
) -> list[dict]:
    return service.list_tasks(query)


@router.get("/{task_id}", response_model=Task)
def get_task(task_id: int, service: TaskService = Depends(get_task_service)) -> dict:
    return service.get_task(task_id)


@router.post("", response_model=Task, status_code=201)
def create_task(payload: TaskIn, service: TaskService = Depends(get_task_service)) -> dict:
    return service.create_task(payload)


@router.patch("/{task_id}", response_model=Task)
def update_task(
    task_id: int, payload: TaskIn, service: TaskService = Depends(get_task_service)
) -> dict:
    return service.replace_task(task_id, payload)


@router.post("/{task_id}/complete", response_model=Task)
def complete_task(task_id: int, service: TaskService = Depends(get_task_service)) -> dict:
    return service.complete_task(task_id)


@router.delete(
    "/{task_id}",
    status_code=204,
    responses={404: {"description": "Task not found"}},
)
def delete_task(task_id: int, service: TaskService = Depends(get_task_service)) -> Response:
    service.delete_task(task_id)
    return Response(status_code=204)

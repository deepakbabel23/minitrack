"""Unit tests for TaskService against an in-memory fake repository --
no SQLite involved (see the `fake_repo` fixture in tests/conftest.py).
"""
import pytest

from app.core.exceptions import TaskNotFound
from app.schemas.task import Priority, TaskIn, TaskListQuery
from app.services.task_service import TaskService


@pytest.fixture
def service(fake_repo):
    return TaskService(fake_repo)


def test_create_task_returns_full_dict(service):
    task = service.create_task(TaskIn(title="write tests", priority=Priority.high))
    assert task["title"] == "write tests"
    assert task["priority"] == "high"
    assert task["completed"] is False
    assert task["id"] == 1


def test_get_missing_task_raises_not_found(service):
    with pytest.raises(TaskNotFound):
        service.get_task(999)


def test_replace_missing_task_raises_not_found(service):
    with pytest.raises(TaskNotFound):
        service.replace_task(999, TaskIn(title="x"))


def test_complete_missing_task_raises_not_found(service):
    with pytest.raises(TaskNotFound):
        service.complete_task(999)


def test_delete_missing_task_raises_not_found(service):
    with pytest.raises(TaskNotFound):
        service.delete_task(999)


def test_list_tasks_honors_completed_filter(service):
    a = service.create_task(TaskIn(title="a"))
    service.create_task(TaskIn(title="b"))
    service.complete_task(a["id"])

    done = service.list_tasks(TaskListQuery(completed=True))
    pending = service.list_tasks(TaskListQuery(completed=False))

    assert [t["title"] for t in done] == ["a"]
    assert [t["title"] for t in pending] == ["b"]

"""Unit tests for schema validation (closes intentional gap #2)."""
import pytest
from pydantic import ValidationError

from app.schemas.task import Priority, TaskIn


def test_blank_title_rejected():
    with pytest.raises(ValidationError):
        TaskIn(title="")


def test_whitespace_only_title_rejected():
    with pytest.raises(ValidationError):
        TaskIn(title="   ")


def test_invalid_priority_rejected():
    with pytest.raises(ValidationError):
        TaskIn(title="valid", priority="urgent")


def test_valid_task_defaults_priority_to_medium():
    task = TaskIn(title="valid")
    assert task.priority == Priority.medium


def test_title_is_stripped():
    task = TaskIn(title="  padded  ")
    assert task.title == "padded"

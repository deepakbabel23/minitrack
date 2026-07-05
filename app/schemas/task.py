"""Task request/response contracts.

Closes intentional gap #2: `title` is stripped and must be non-blank,
and `priority` is constrained to low|medium|high via `Priority` instead
of being a free string.
"""
from enum import Enum
from typing import Annotated, Optional

from pydantic import BaseModel, Field, StringConstraints


class Priority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class TaskIn(BaseModel):
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    description: Optional[str] = None
    priority: Priority = Priority.medium


class Task(TaskIn):
    id: int
    completed: bool = False


class TaskListQuery(BaseModel):
    completed: Optional[bool] = None
    limit: int = Field(50, ge=1, le=200)
    offset: int = Field(0, ge=0)

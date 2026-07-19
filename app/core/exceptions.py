"""Domain exceptions raised by the service layer.

Framework-agnostic on purpose: this module must never import FastAPI, so
that importing it (as app/services/task_service.py does) doesn't pull
FastAPI into the service layer. app/core/errors.py imports these to wire
up the HTTP mapping (see ARCHITECTURE.md section 5).
"""


class DomainError(Exception):
    """Base class for business-rule failures raised by the service layer."""


class TaskNotFound(DomainError):
    def __init__(self, task_id: int):
        self.task_id = task_id
        super().__init__(f"Task {task_id} not found")

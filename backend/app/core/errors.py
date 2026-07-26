"""The single place that maps domain exceptions to HTTP responses.

Keeps the repository/service layers free of HTTP concerns: a repository
returns dict/None/bool, a service turns that into a domain exception (see
app.core.exceptions, kept FastAPI-free), and this module is the only place
that decides the resulting status code and body shape (see ARCHITECTURE.md
section 5's "error-handling convention").
"""
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.exceptions import TaskNotFound
from app.core.logging import get_request_id
from app.schemas.errors import ErrorResponse


def _error_response(status_code: int, detail: str) -> JSONResponse:
    body = ErrorResponse(detail=detail, request_id=get_request_id())
    return JSONResponse(status_code=status_code, content=body.model_dump())


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(TaskNotFound)
    async def _task_not_found(request: Request, exc: TaskNotFound) -> JSONResponse:
        return _error_response(status.HTTP_404_NOT_FOUND, "Task not found")

    @app.exception_handler(RequestValidationError)
    async def _validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        detail = "; ".join(
            f"{'.'.join(str(part) for part in err['loc'])}: {err['msg']}"
            for err in exc.errors()
        )
        return _error_response(status.HTTP_422_UNPROCESSABLE_ENTITY, detail)

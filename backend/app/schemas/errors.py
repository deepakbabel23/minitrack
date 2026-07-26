"""Uniform error response body (see ARCHITECTURE.md section 11)."""
from typing import Optional

from pydantic import BaseModel


class ErrorResponse(BaseModel):
    detail: str
    request_id: Optional[str] = None

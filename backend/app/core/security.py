"""X-API-Key header authentication (see ARCHITECTURE.md section 10)."""
import hmac
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader

from app.core.config import Settings, get_settings

# auto_error=False so we control the response (uniform 401 for both a
# missing and an invalid key -- avoids leaking whether a key "exists").
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def require_api_key(
    key: Optional[str] = Depends(api_key_header),
    settings: Settings = Depends(get_settings),
) -> None:
    # Compare as bytes, not str: hmac.compare_digest rejects non-ASCII str
    # input with a TypeError, which would otherwise surface as a 500 for
    # any request carrying a non-ASCII X-API-Key header.
    key_bytes = key.encode("utf-8") if key else None
    if key_bytes is None or not any(
        hmac.compare_digest(key_bytes, valid.encode("utf-8")) for valid in settings.api_keys
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
            headers={"WWW-Authenticate": "X-API-Key"},
        )

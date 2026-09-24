"""
VoiceGuard AI — Global Error Handling Middleware
===================================================
Catches unhandled exceptions, logs them, and returns a clean JSON
response instead of leaking stack traces to the client.

Also provides a custom exception class for business-logic errors.
"""

import logging
import traceback

from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("voiceguard")


class AppError(Exception):
    """Business-logic error with a message and optional status code."""

    def __init__(self, message: str, status_code: int = 400, detail: str | None = None):
        self.message = message
        self.status_code = status_code
        self.detail = detail
        super().__init__(message)


async def error_handler_middleware(request: Request, call_next):
    """
    Global exception handler — wraps every request in a try/except so
    unhandled errors produce a consistent JSON envelope.
    """
    try:
        return await call_next(request)
    except AppError as exc:
        logger.warning(f"AppError: {exc.message}")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.message,
                "detail": exc.detail,
                "status_code": exc.status_code,
            },
        )
    except Exception as exc:
        logger.error(f"Unhandled error: {exc}\n{traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "detail": "An unexpected error occurred. Please try again.",
                "status_code": 500,
            },
        )

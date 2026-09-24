"""
VoiceGuard AI — Rate Limiting Middleware
==========================================
Simple in-memory sliding-window rate limiter.

For a hackathon prototype this is sufficient.  In production you would
swap the dict for a Redis-backed store to share limits across workers.

Each client is identified by their JWT user_id (if authenticated) or
their IP address (if unauthenticated).  When the limit is exceeded the
middleware returns HTTP 429 with a Retry-After header.
"""

import time
from collections import defaultdict

from fastapi import Request
from fastapi.responses import JSONResponse

from config.settings import settings

# In-memory store: { identifier: [timestamp, timestamp, ...] }
_rate_store: dict[str, list[float]] = defaultdict(list)


def _client_id(request: Request) -> str:
    """Identify the client by JWT subject if present, else by IP."""
    user = getattr(request.state, "user", None)
    if user and user.get("sub"):
        return f"user:{user['sub']}"
    forwarded = request.headers.get("X-Forwarded-For")
    return f"ip:{forwarded or request.client.host if request.client else 'unknown'}"


async def rate_limit_middleware(request: Request, call_next):
    """
    Enforce a sliding-window rate limit per client.

    Default: 100 requests per 60 seconds (configurable via env).
    """
    # Skip rate limiting for health checks and docs
    if request.url.path in ("/", "/health", "/docs", "/openapi.json"):
        return await call_next(request)

    cid = _client_id(request)
    now = time.time()
    window = settings.RATE_LIMIT_WINDOW_SECONDS
    limit = settings.RATE_LIMIT_REQUESTS

    # Prune entries outside the window
    _rate_store[cid] = [ts for ts in _rate_store[cid] if now - ts < window]

    if len(_rate_store[cid]) >= limit:
        retry_after = int(window - (now - _rate_store[cid][0]))
        return JSONResponse(
            status_code=429,
            content={
                "error": "Rate limit exceeded",
                "detail": f"Maximum {limit} requests per {window}s. Retry after {retry_after}s.",
                "status_code": 429,
            },
            headers={"Retry-After": str(max(retry_after, 1))},
        )

    _rate_store[cid].append(now)
    return await call_next(request)

"""
VoiceGuard AI — Database Configuration
=======================================
MongoDB async connection using Motor (async MongoDB driver for Python).

This module provides a singleton-style async database connection that is
initialised once at application startup and reused across all request
lifecycles.  The connection string and database name are read from
environment variables so the same code runs in dev, staging, and production.

Environment variables:
    MONGODB_URL   — Full MongoDB connection URI (default: localhost)
    MONGODB_DB    — Database name (default: voiceguard)
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

# ---------------------------------------------------------------------------
# Connection settings — pulled from env so we never hardcode secrets
# ---------------------------------------------------------------------------
MONGODB_URL: str = os.getenv(
    "MONGODB_URL",
    "mongodb://localhost:27017",
)
MONGODB_DB_NAME: str = os.getenv("MONGODB_DB", "voiceguard")

# Global motor client + database handle (populated by connect_to_mongo)
_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> None:
    """
    Initialise the async MongoDB client and ping the server to verify
    connectivity.  Called once during the FastAPI startup event.
    """
    global _client, _db
    _client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
    _db = _client[MONGODB_DB_NAME]

    # Ping to fail fast if the database is unreachable
    await _db.command("ping")
    print(f"[VoiceGuard] Connected to MongoDB → {MONGODB_DB_NAME}")


async def close_mongo_connection() -> None:
    """Gracefully close the MongoDB client on application shutdown."""
    global _client
    if _client is not None:
        _client.close()
        _client = None
        print("[VoiceGuard] MongoDB connection closed.")


def get_db() -> AsyncIOMotorDatabase:
    """
    Dependency-injection helper used by FastAPI route handlers:

        @router.get("/")
        async def index(db: AsyncIOMotorDatabase = Depends(get_db)):
            ...

    Raises RuntimeError if called before connect_to_mongo().
    """
    if _db is None:
        raise RuntimeError("Database not initialised. Call connect_to_mongo() first.")
    return _db

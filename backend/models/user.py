"""
VoiceGuard AI — User Model
===========================
Stores registered user accounts (device owners / field agents).

Password hashing is done with bcrypt — the raw password is never stored.
A new user document is created with:
    {
        _id: ObjectId,
        email: "agent@example.com",
        name: "Field Agent 01",
        hashed_password: "$2b$12$...",
        device_id: "ANDROID-AB12CD34",     # unique hardware fingerprint
        role: "user" | "admin",
        created_at, updated_at
    }

Indexes:
    - email (unique)
    - device_id (unique)
"""

from datetime import datetime, timezone


def user_collection(db):
    return db.users


USER_INDEXES = [
    {"key": [("email", 1)], "unique": True, "name": "uniq_email"},
    {"key": [("device_id", 1)], "unique": True, "name": "uniq_device_id"},
]


async def ensure_user_indexes(db):
    """Create indexes on the users collection (idempotent)."""
    coll = user_collection(db)
    for idx in USER_INDEXES:
        await coll.create_index(idx["key"], unique=idx.get("unique", False), name=idx["name"])


def user_serializer(doc: dict) -> dict:
    """Convert a raw Mongo document into a JSON-safe dict (strip _id / password)."""
    return {
        "id": str(doc["_id"]),
        "email": doc["email"],
        "name": doc["name"],
        "device_id": doc.get("device_id"),
        "role": doc.get("role", "user"),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }

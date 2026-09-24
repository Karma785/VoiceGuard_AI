"""
VoiceGuard AI — Auth Controller
=================================
Business logic for user registration, login, and token refresh.

Flow:
  1. Register → hash password with bcrypt, store in MongoDB, return tokens
  2. Login    → verify bcrypt hash, issue JWT access + refresh tokens
  3. Refresh → verify refresh token, issue new access token
"""

from datetime import datetime, timezone

from bson import ObjectId

from config.database import get_db
from middleware.auth import create_access_token, create_refresh_token, decode_token
from middleware.error_handler import AppError
from models.user import user_collection, user_serializer
from schemas import UserCreate, UserLogin, RefreshTokenRequest
from utils.security import hash_password, verify_password


async def register_user(payload: UserCreate) -> dict:
    """Create a new user account and return JWT tokens."""
    db = get_db()
    coll = user_collection(db)

    # Check for existing email
    existing = await coll.find_one({"email": payload.email})
    if existing:
        raise AppError("Email already registered", status_code=409)

    # Check for existing device_id
    existing_device = await coll.find_one({"device_id": payload.device_id})
    if existing_device:
        raise AppError("Device ID already linked to an account", status_code=409)

    # Create user document
    now = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "email": payload.email,
        "name": payload.name,
        "hashed_password": hash_password(payload.password),
        "device_id": payload.device_id,
        "role": "user",
        "created_at": now,
        "updated_at": now,
    }
    result = await coll.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    # Issue tokens
    token_data = {
        "sub": str(result.inserted_id),
        "email": payload.email,
        "device_id": payload.device_id,
        "role": "user",
    }
    access = create_access_token(token_data)
    refresh = create_refresh_token(token_data)

    return {
        "user": user_serializer(user_doc),
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
    }


async def login_user(payload: UserLogin) -> dict:
    """Authenticate a user and return JWT tokens."""
    db = get_db()
    coll = user_collection(db)

    user_doc = await coll.find_one({"email": payload.email})
    if not user_doc:
        raise AppError("Invalid email or password", status_code=401)

    if not verify_password(payload.password, user_doc["hashed_password"]):
        raise AppError("Invalid email or password", status_code=401)

    token_data = {
        "sub": str(user_doc["_id"]),
        "email": user_doc["email"],
        "device_id": user_doc.get("device_id"),
        "role": user_doc.get("role", "user"),
    }
    access = create_access_token(token_data)
    refresh = create_refresh_token(token_data)

    return {
        "user": user_serializer(user_doc),
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
    }


async def refresh_access_token(payload: RefreshTokenRequest) -> dict:
    """Exchange a refresh token for a new access token."""
    decoded = decode_token(payload.refresh_token)

    if decoded.get("type") != "refresh":
        raise AppError("Invalid refresh token", status_code=401)

    token_data = {
        "sub": decoded["sub"],
        "email": decoded.get("email"),
        "device_id": decoded.get("device_id"),
        "role": decoded.get("role", "user"),
    }
    new_access = create_access_token(token_data)

    return {
        "access_token": new_access,
        "token_type": "bearer",
    }


async def get_profile(user: dict) -> dict:
    """Return the authenticated user's profile."""
    db = get_db()
    coll = user_collection(db)
    user_doc = await coll.find_one({"_id": ObjectId(user["sub"])})
    if not user_doc:
        raise AppError("User not found", status_code=404)
    return user_serializer(user_doc)

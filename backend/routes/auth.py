"""
VoiceGuard AI — Auth Routes
=============================
REST endpoints for authentication.

  POST /auth/register     — Create a new account
  POST /auth/login        — Login with email + password
  POST /auth/refresh      — Exchange refresh token for new access token
  GET  /auth/me           — Get current user profile (requires auth)
"""

from fastapi import APIRouter, Depends

from middleware.auth import current_user
from schemas import (
    UserCreate, UserLogin, RefreshTokenRequest,
    TokenResponse, MessageResponse,
)
from controllers import auth_controller

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=dict, status_code=201)
async def register(payload: UserCreate):
    """Register a new user account. Returns user info + JWT tokens."""
    return await auth_controller.register_user(payload)


@router.post("/login", response_model=dict)
async def login(payload: UserLogin):
    """Authenticate and receive JWT access + refresh tokens."""
    return await auth_controller.login_user(payload)


@router.post("/refresh", response_model=dict)
async def refresh(payload: RefreshTokenRequest):
    """Exchange a refresh token for a new access token."""
    return await auth_controller.refresh_access_token(payload)


@router.get("/me", response_model=dict)
async def me(user: dict = Depends(current_user)):
    """Get the authenticated user's profile."""
    return await auth_controller.get_profile(user)

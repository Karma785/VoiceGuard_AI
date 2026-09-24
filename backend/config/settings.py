"""
VoiceGuard AI — Security Configuration
=======================================
Centralised settings for JWT tokens, password hashing, and rate limits.
All values are environment-variable driven with sensible defaults.
"""

import os


class Settings:
    """Application-wide settings loaded from environment variables."""

    # --- JWT ---
    JWT_SECRET: str = os.getenv("JWT_SECRET", "voiceguard-sih26104-dev-secret-change-in-production")
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = int(os.getenv("JWT_ACCESS_EXPIRE_MINUTES", "60"))
    JWT_REFRESH_EXPIRE_DAYS: int = int(os.getenv("JWT_REFRESH_EXPIRE_DAYS", "7"))

    # --- Bcrypt ---
    BCRYPT_ROUNDS: int = int(os.getenv("BCRYPT_ROUNDS", "12"))

    # --- Rate limiting ---
    RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))
    RATE_LIMIT_WINDOW_SECONDS: int = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))

    # --- PDF / Digital signatures ---
    REPORT_SIGNING_KEY: str = os.getenv("REPORT_SIGNING_KEY", "voiceguard-evidence-signing-key")
    REPORT_ISSUER: str = "VoiceGuard AI — SIH26104"
    REPORT_ISSUER_ID: str = "SIH26104-VG-2026"


settings = Settings()

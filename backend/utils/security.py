"""
VoiceGuard AI — Password Utility
==================================
bcrypt hashing and verification for user passwords.
"""

import bcrypt

from config.settings import settings


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt and return the hash as a string."""
    salt = bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS)
    return bcrypt.hashpw(password.encode(), salt).decode()


def verify_password(password: str, hashed: str) -> bool:
    """Verify a plaintext password against a stored bcrypt hash."""
    return bcrypt.checkpw(password.encode(), hashed.encode())

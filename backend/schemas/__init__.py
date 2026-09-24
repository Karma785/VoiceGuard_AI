"""
VoiceGuard AI — Pydantic Schemas
=================================
Input validation models for every API endpoint.

Pydantic v2 models are used for request-body validation and response
serialisation.  Each schema maps 1:1 to a route handler's parameters,
giving us automatic 422 responses on malformed input.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# Auth schemas
# ---------------------------------------------------------------------------

class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)
    device_id: str = Field(..., min_length=4, max_length=64)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)
    device_id: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# ---------------------------------------------------------------------------
# Scan schemas
# ---------------------------------------------------------------------------

class AudioFeatures(BaseModel):
    mfcc_deviation: float = Field(..., ge=0, le=1)
    cqcc_tilt: float = Field(..., ge=-1, le=1)
    pitch_consistency: float = Field(..., ge=0, le=1)
    spectral_flux: Optional[float] = Field(None, ge=0, le=1)
    frequency_variation: Optional[float] = Field(None, ge=0, le=1)


class ScanLogCreate(BaseModel):
    session_id: str = Field(..., min_length=1)
    chunk_index: int = Field(..., ge=0)
    is_cloned: bool
    confidence_score: float = Field(..., ge=0, le=100)
    latency_ms: int = Field(..., ge=0, le=10000)
    extracted_features: AudioFeatures
    timestamp: int = Field(..., gt=0)  # epoch millis from device


class ScanLogBatch(BaseModel):
    """Batch of scan logs synced from the offline mobile device."""
    scans: list[ScanLogCreate] = Field(..., min_length=1, max_length=500)


# ---------------------------------------------------------------------------
# Acoustic verification schemas
# ---------------------------------------------------------------------------

class AcousticGlitchMetric(BaseModel):
    """One glitch event detected during high-frequency verification."""
    frequency_hz: float = Field(..., ge=0)
    glitch_amplitude: float = Field(..., ge=0, le=1)
    timestamp_ms: int = Field(..., ge=0)


class AcousticVerificationLog(BaseModel):
    """Log entry for when the active acoustic fallback was triggered."""
    session_id: str = Field(..., min_length=1)
    triggered: bool
    glitch_count: int = Field(..., ge=0)
    glitch_severity: float = Field(..., ge=0, le=1)
    glitch_metrics: list[AcousticGlitchMetric] = Field(default_factory=list)
    timestamp: int = Field(..., gt=0)


# ---------------------------------------------------------------------------
# Evidence report schemas
# ---------------------------------------------------------------------------

class DeviceInfo(BaseModel):
    model: str = ""
    os_version: str = ""
    app_version: str = ""
    device_id: str = ""


class LocationInfo(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy_m: Optional[float] = None


class EvidenceReportCreate(BaseModel):
    scan_session_id: str = Field(..., min_length=1)
    verdict: str = Field(..., pattern="^(deepfake|authentic|inconclusive)$")
    max_risk_score: float = Field(..., ge=0, le=100)
    total_chunks: int = Field(..., ge=0)
    device_info: DeviceInfo
    acoustic_verification: AcousticVerificationLog
    location: Optional[LocationInfo] = None


# ---------------------------------------------------------------------------
# Generic response schemas
# ---------------------------------------------------------------------------

class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    status_code: int

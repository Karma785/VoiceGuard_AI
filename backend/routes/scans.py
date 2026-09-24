"""
VoiceGuard AI — Scans Routes
==============================
REST endpoints for scan log management.

  POST   /scans/sync                — Batch sync offline scan logs (auth)
  GET    /scans/history              — Get scan history (auth, query params)
  POST   /scans/acoustic-verification — Log acoustic fallback verification (auth)
"""

from fastapi import APIRouter, Depends, Query

from middleware.auth import current_user
from schemas import ScanLogBatch, AcousticVerificationLog, MessageResponse
from controllers import scan_controller

router = APIRouter(prefix="/scans", tags=["Scans"])


@router.post("/sync", response_model=dict)
async def sync_scans(
    payload: ScanLogBatch,
    user: dict = Depends(current_user),
):
    """
    Receive a batch of offline scan logs from the mobile Edge AI.
    Each log contains TinyML metadata: confidence score, latency, timestamp,
    and extracted audio features (MFCC, CQCC, pitch, spectral flux).
    """
    return await scan_controller.sync_scan_logs(user, payload)


@router.get("/history", response_model=dict)
async def scan_history(
    user: dict = Depends(current_user),
    session_id: str | None = Query(None, description="Filter by session ID"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Retrieve scan history for the authenticated user."""
    return await scan_controller.get_scan_history(user, session_id, limit, offset)


@router.post("/acoustic-verification", response_model=dict)
async def log_acoustic_verification(
    payload: AcousticVerificationLog,
    user: dict = Depends(current_user),
):
    """
    Log when the active acoustic (high-frequency) fallback verification
    was triggered and its glitch metrics.
    """
    return await scan_controller.log_acoustic_verification(user, payload)

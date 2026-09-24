"""
VoiceGuard AI — Scans Controller
===================================
Business logic for receiving and querying offline scan logs.

The mobile Edge AI (TinyML) runs detection locally and stores results
when offline.  When connectivity returns, the device POSTs all pending
scan logs in a batch.  This controller:
  1. Validates each scan log
  2. Stores them in MongoDB with a synced_at timestamp
  3. Returns per-user scan history with optional session filtering
"""

from datetime import datetime, timezone

from bson import ObjectId

from config.database import get_db
from middleware.error_handler import AppError
from models.scan_log import scan_collection, scan_serializer
from schemas import ScanLogCreate, ScanLogBatch, AcousticVerificationLog


async def sync_scan_logs(user: dict, payload: ScanLogBatch) -> dict:
    """
    Receive a batch of offline scan logs from the mobile device.
    Each log is stamped with synced_at (server receive time).
    """
    db = get_db()
    coll = scan_collection(db)
    now = datetime.now(timezone.utc).isoformat()

    docs = []
    for scan in payload.scans:
        doc = {
            "user_id": ObjectId(user["sub"]),
            "device_id": user.get("device_id"),
            "session_id": scan.session_id,
            "chunk_index": scan.chunk_index,
            "is_cloned": scan.is_cloned,
            "confidence_score": scan.confidence_score,
            "latency_ms": scan.latency_ms,
            "extracted_features": scan.extracted_features.model_dump(),
            "timestamp": scan.timestamp,
            "synced_at": now,
        }
        docs.append(doc)

    if docs:
        await coll.insert_many(docs)

    return {
        "message": f"Synced {len(docs)} scan logs",
        "synced_count": len(docs),
    }


async def get_scan_history(
    user: dict,
    session_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    """Retrieve scan history for the authenticated user."""
    db = get_db()
    coll = scan_collection(db)

    query: dict = {"user_id": ObjectId(user["sub"])}
    if session_id:
        query["session_id"] = session_id

    cursor = coll.find(query).sort("timestamp", -1).skip(offset).limit(limit)
    results = await cursor.to_list(length=limit)
    total = await coll.count_documents(query)

    return {
        "scans": [scan_serializer(d) for d in results],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


async def log_acoustic_verification(
    user: dict, payload: AcousticVerificationLog
) -> dict:
    """
    Store an active acoustic verification log entry.
    This tracks when the high-frequency fallback verification was triggered
    and its glitch metrics.
    """
    db = get_db()
    coll = db.acoustic_verification_logs

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "user_id": ObjectId(user["sub"]),
        "device_id": user.get("device_id"),
        "session_id": payload.session_id,
        "triggered": payload.triggered,
        "glitch_count": payload.glitch_count,
        "glitch_severity": payload.glitch_severity,
        "glitch_metrics": [gm.model_dump() for gm in payload.glitch_metrics],
        "timestamp": payload.timestamp,
        "logged_at": now,
    }
    result = await coll.insert_one(doc)

    return {
        "message": "Acoustic verification log recorded",
        "log_id": str(result.inserted_id),
    }

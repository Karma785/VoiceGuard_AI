"""
VoiceGuard AI — Scan Log Model
================================
Stores offline scan logs received from the mobile Edge AI (TinyML).

When the mobile device is offline, it stores detection metadata locally.
Once internet is available, it syncs all pending logs via the /scans/sync
endpoint.  Each document represents one audio-chunk analysis:

    {
        _id: ObjectId,
        user_id: ObjectId,
        device_id: "ANDROID-AB12CD34",
        session_id: "uuid-v4",
        chunk_index: 7,
        is_cloned: true,
        confidence_score: 87.5,
        latency_ms: 42,
        extracted_features: {
            mfcc_deviation: 0.523,
            cqcc_tilt: 0.142,
            pitch_consistency: 0.731,
            spectral_flux: 0.087,
            frequency_variation: 0.034
        },
        timestamp: 1697228800000,   # original on-device timestamp
        synced_at: "2026-09-24T..." # server receive time
    }

Indexes:
    - user_id + timestamp (compound, descending) for per-user history queries
    - session_id for grouping chunks belonging to one call session
"""

SCAN_INDEXES = [
    {"key": [("user_id", 1), ("timestamp", -1)], "name": "idx_user_timestamp"},
    {"key": [("session_id", 1)], "name": "idx_session"},
]


async def ensure_scan_indexes(db):
    coll = db.scan_logs
    for idx in SCAN_INDEXES:
        await coll.create_index(idx["key"], name=idx["name"])


def scan_serializer(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "user_id": str(doc["user_id"]),
        "device_id": doc.get("device_id"),
        "session_id": doc.get("session_id"),
        "chunk_index": doc.get("chunk_index", 0),
        "is_cloned": doc.get("is_cloned", False),
        "confidence_score": doc.get("confidence_score", 0),
        "latency_ms": doc.get("latency_ms", 0),
        "extracted_features": doc.get("extracted_features", {}),
        "timestamp": doc.get("timestamp"),
        "synced_at": doc.get("synced_at"),
    }

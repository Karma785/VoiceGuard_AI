"""
VoiceGuard AI — Evidence Report Model
=======================================
Tracks tamper-proof evidence reports generated for cyber-crime submission.

When a deepfake voice is detected, VoiceGuard generates a signed PDF
containing device info, frequency analysis, and location.  This model
stores the metadata + digital signature so reports can be verified
without re-opening the PDF:

    {
        _id: ObjectId,
        report_id: "RPT-20260924-AB12CD",   # human-readable unique ID
        user_id: ObjectId,
        scan_session_id: "uuid-v4",
        verdict: "deepfake" | "authentic" | "inconclusive",
        max_risk_score: 92,
        total_chunks: 15,
        device_info: {
            model: "Pixel 8 Pro",
            os_version: "Android 15",
            app_version: "1.0.0",
            device_id: "ANDROID-AB12CD34"
        },
        acoustic_verification: {
            triggered: true,
            glitch_count: 3,
            glitch_severity: 0.72,
            frequency_response: [list of per-band anomalies]
        },
        location: {
            latitude: 12.9716,
            longitude: 77.5946,
            accuracy_m: 15
        },
        digital_signature: "hex-encoded HMAC-SHA256",
        pdf_path: "/reports/RPT-20260924-AB12CD.pdf",
        created_at: "2026-09-24T..."
    }

Indexes:
    - report_id (unique)
    - user_id + created_at (compound) for per-user report history
"""

EVIDENCE_INDEXES = [
    {"key": [("report_id", 1)], "unique": True, "name": "uniq_report_id"},
    {"key": [("user_id", 1), ("created_at", -1)], "name": "idx_user_created"},
]


async def ensure_evidence_indexes(db):
    coll = db.evidence_reports
    for idx in EVIDENCE_INDEXES:
        await coll.create_index(idx["key"], unique=idx.get("unique", False), name=idx["name"])


def evidence_serializer(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "report_id": doc.get("report_id"),
        "user_id": str(doc.get("user_id")),
        "scan_session_id": doc.get("scan_session_id"),
        "verdict": doc.get("verdict"),
        "max_risk_score": doc.get("max_risk_score", 0),
        "total_chunks": doc.get("total_chunks", 0),
        "device_info": doc.get("device_info", {}),
        "acoustic_verification": doc.get("acoustic_verification", {}),
        "location": doc.get("location"),
        "digital_signature": doc.get("digital_signature"),
        "pdf_path": doc.get("pdf_path"),
        "created_at": doc.get("created_at"),
    }

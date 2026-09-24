"""
VoiceGuard AI — Reports Controller
====================================
Business logic for generating tamper-proof evidence reports.

When a deepfake is detected, the mobile app requests an evidence report.
This controller:
  1. Aggregates scan data for the session
  2. Calls the PDF generator utility
  3. Stores the report metadata + digital signature in MongoDB
  4. Returns the report metadata and PDF download URL
"""

from datetime import datetime, timezone

from bson import ObjectId

from config.database import get_db
from middleware.error_handler import AppError
from models.evidence_report import evidence_collection, evidence_serializer
from models.scan_log import scan_collection
from schemas import EvidenceReportCreate
from utils.pdf_generator import generate_evidence_pdf


async def create_evidence_report(user: dict, payload: EvidenceReportCreate) -> dict:
    """
    Generate a tamper-proof PDF evidence report for a scan session.
    The report includes device info, glitch analysis, location, and a
    digitally signed HMAC-SHA256 signature.
    """
    db = get_db()

    # Verify the session has scan data
    scan_coll = scan_collection(db)
    scan_count = await scan_coll.count_documents({
        "user_id": ObjectId(user["sub"]),
        "session_id": payload.scan_session_id,
    })

    # Build the report data for the PDF generator
    report_data = {
        "scan_session_id": payload.scan_session_id,
        "verdict": payload.verdict,
        "max_risk_score": payload.max_risk_score,
        "total_chunks": payload.total_chunks,
        "device_info": payload.device_info.model_dump(),
        "acoustic_verification": payload.acoustic_verification.model_dump(),
        "location": payload.location.model_dump() if payload.location else None,
    }

    # Generate the PDF (returns report_id, path, signature)
    pdf_result = generate_evidence_pdf(report_data)

    # Store metadata in MongoDB
    evidence_coll = evidence_collection(db)
    doc = {
        "report_id": pdf_result["report_id"],
        "user_id": ObjectId(user["sub"]),
        "scan_session_id": payload.scan_session_id,
        "verdict": payload.verdict,
        "max_risk_score": payload.max_risk_score,
        "total_chunks": payload.total_chunks,
        "device_info": payload.device_info.model_dump(),
        "acoustic_verification": payload.acoustic_verification.model_dump(),
        "location": payload.location.model_dump() if payload.location else None,
        "digital_signature": pdf_result["digital_signature"],
        "pdf_path": pdf_result["pdf_path"],
        "created_at": pdf_result["created_at"],
    }
    await evidence_coll.insert_one(doc)

    return {
        "message": "Evidence report generated",
        "report_id": pdf_result["report_id"],
        "digital_signature": pdf_result["digital_signature"],
        "pdf_url": f"/reports/{pdf_result['report_id']}/download",
        "verdict": payload.verdict,
        "created_at": pdf_result["created_at"],
    }


async def get_user_reports(user: dict, limit: int = 20, offset: int = 0) -> dict:
    """List all evidence reports for the authenticated user."""
    db = get_db()
    coll = evidence_collection(db)

    query = {"user_id": ObjectId(user["sub"])}
    cursor = coll.find(query).sort("created_at", -1).skip(offset).limit(limit)
    results = await cursor.to_list(length=limit)
    total = await coll.count_documents(query)

    return {
        "reports": [evidence_serializer(d) for d in results],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


async def get_report_by_id(user: dict, report_id: str) -> dict:
    """Retrieve a single evidence report by its human-readable report ID."""
    db = get_db()
    coll = evidence_collection(db)

    doc = await coll.find_one({
        "report_id": report_id,
        "user_id": ObjectId(user["sub"]),
    })
    if not doc:
        raise AppError("Report not found", status_code=404)

    return evidence_serializer(doc)


async def verify_report_signature(user: dict, report_id: str) -> dict:
    """
    Verify the digital signature of an evidence report.
    Re-computes the HMAC and compares it to the stored signature.
    """
    import hashlib
    import hmac as hmac_mod
    from config.settings import settings

    db = get_db()
    coll = evidence_collection(db)

    doc = await coll.find_one({
        "report_id": report_id,
        "user_id": ObjectId(user["sub"]),
    })
    if not doc:
        raise AppError("Report not found", status_code=404)

    # Reconstruct the canonical data that was signed
    sign_data = {
        "report_id": doc["report_id"],
        "scan_session_id": doc.get("scan_session_id", ""),
        "verdict": doc.get("verdict", ""),
        "max_risk_score": str(doc.get("max_risk_score", 0)),
        "total_chunks": str(doc.get("total_chunks", 0)),
        "issuer": settings.REPORT_ISSUER,
    }
    canonical_parts = [
        f"{k}={sign_data[k]}"
        for k in sorted(sign_data.keys())
    ]
    canonical = "|".join(canonical_parts)
    recomputed = hmac_mod.new(
        settings.REPORT_SIGNING_KEY.encode(),
        canonical.encode(),
        hashlib.sha256,
    ).hexdigest()

    is_valid = hmac_mod.compare_digest(recomputed, doc.get("digital_signature", ""))

    return {
        "report_id": report_id,
        "signature_valid": is_valid,
        "stored_signature": doc.get("digital_signature"),
        "recomputed_signature": recomputed,
    }

"""
VoiceGuard AI — Reports Routes
================================
REST endpoints for evidence report generation and management.

  POST   /reports/generate           — Generate a tamper-proof PDF report (auth)
  GET    /reports                    — List all reports for the user (auth)
  GET    /reports/{report_id}        — Get a single report by ID (auth)
  GET    /reports/{report_id}/verify — Verify the digital signature (auth)
  GET    /reports/{report_id}/download — Download the PDF file (auth)
"""

import os

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse

from middleware.auth import current_user
from schemas import EvidenceReportCreate
from controllers import report_controller

router = APIRouter(prefix="/reports", tags=["Evidence Reports"])


@router.post("/generate", response_model=dict, status_code=201)
async def generate_report(
    payload: EvidenceReportCreate,
    user: dict = Depends(current_user),
):
    """
    Generate a tamper-proof PDF evidence report.
    The report includes: timestamp, device info, audio frequency glitch
    analysis, location (if available), and a digital signature (HMAC-SHA256).
    """
    return await report_controller.create_evidence_report(user, payload)


@router.get("/", response_model=dict)
async def list_reports(
    user: dict = Depends(current_user),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """List all evidence reports for the authenticated user."""
    return await report_controller.get_user_reports(user, limit, offset)


@router.get("/{report_id}", response_model=dict)
async def get_report(
    report_id: str,
    user: dict = Depends(current_user),
):
    """Retrieve a single evidence report by its report ID."""
    return await report_controller.get_report_by_id(user, report_id)


@router.get("/{report_id}/verify", response_model=dict)
async def verify_report(
    report_id: str,
    user: dict = Depends(current_user),
):
    """Verify the digital signature of an evidence report."""
    return await report_controller.verify_report_signature(user, report_id)


@router.get("/{report_id}/download")
async def download_report(
    report_id: str,
    user: dict = Depends(current_user),
):
    """Download the PDF evidence report file."""
    report = await report_controller.get_report_by_id(user, report_id)
    pdf_path = report.get("pdf_path", "")
    if not pdf_path or not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found on server")
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"{report_id}.pdf",
    )

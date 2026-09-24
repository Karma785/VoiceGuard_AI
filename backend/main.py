"""
VoiceGuard AI — FastAPI Application Entry Point
===================================================
SIH26104 — Smart India Hackathon 2026
Offline-First Edge AI Voice Cloning Detection System

This module assembles the FastAPI application:
  1. Registers global middleware (CORS, error handling, rate limiting)
  2. Includes API routers (auth, scans, reports)
  3. Manages MongoDB connection lifecycle (startup/shutdown)
  4. Preserves the WebSocket endpoint for real-time audio streaming

Run:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

import json
import random
import time
import uuid
from typing import Dict

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from config.database import connect_to_mongo, close_mongo_connection, get_db
from config.settings import settings
from middleware.error_handler import error_handler_middleware
from middleware.rate_limit import rate_limit_middleware
from models.user import ensure_user_indexes
from models.scan_log import ensure_scan_indexes
from models.evidence_report import ensure_evidence_indexes
from routes.auth import router as auth_router
from routes.scans import router as scans_router
from routes.reports import router as reports_router

# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------
app = FastAPI(
    title="VoiceGuard AI Backend",
    description=(
        "Offline-First Edge AI Voice Cloning Detection System\n"
        "SIH26104 — Smart India Hackathon 2026\n\n"
        "Provides JWT authentication, offline scan log sync, "
        "acoustic verification logging, and tamper-proof evidence "
        "report generation with digital signatures."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# Middleware (order matters: error handler wraps everything)
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(error_handler_middleware)
app.middleware("http")(rate_limit_middleware)

# ---------------------------------------------------------------------------
# Router registration
# ---------------------------------------------------------------------------
app.include_router(auth_router)
app.include_router(scans_router)
app.include_router(reports_router)


# ---------------------------------------------------------------------------
# Lifespan — connect to MongoDB and create indexes on startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup():
    """Initialise database connection and create indexes."""
    await connect_to_mongo()
    db = get_db()
    await ensure_user_indexes(db)
    await ensure_scan_indexes(db)
    await ensure_evidence_indexes(db)
    # Index for acoustic verification logs
    await db.acoustic_verification_logs.create_index(
        [("user_id", 1), ("timestamp", -1)], name="idx_av_user_timestamp"
    )
    print("[VoiceGuard] All indexes created. Server ready.")


@app.on_event("shutdown")
async def shutdown():
    """Close database connection on shutdown."""
    await close_mongo_connection()


# ---------------------------------------------------------------------------
# Health & info endpoints
# ---------------------------------------------------------------------------
@app.get("/")
async def root():
    return {
        "service": "VoiceGuard AI Backend",
        "version": "2.0.0",
        "project_id": "SIH26104",
        "status": "operational",
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "auth": "/auth",
            "scans": "/scans",
            "reports": "/reports",
            "websocket": "/ws/audio",
        },
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "ai_engine": "ready",
        "database": "connected",
    }


# ---------------------------------------------------------------------------
# WebSocket endpoint — real-time audio stream analysis (preserved from v1)
# ---------------------------------------------------------------------------
class MockAIEngine:
    """
    Simulates real-time voice clone detection using MFCC and CQCC features.

    In production, this would:
    1. Decode the binary audio chunk (PCM/WAV)
    2. Extract MFCC (Mel-Frequency Cepstral Coefficients)
    3. Extract CQCC (Constant Q Cepstral Coefficients)
    4. Feed features into a trained classifier (e.g., ResNet, LSTM)
    5. Return the deepfake probability
    """

    def __init__(self):
        self.chunk_counters: Dict[str, int] = {}

    def analyze(self, session_id: str, chunk_data: bytes) -> dict:
        if session_id not in self.chunk_counters:
            self.chunk_counters[session_id] = 0
        self.chunk_counters[session_id] += 1
        chunk_index = self.chunk_counters[session_id]

        base_score = 30 + (chunk_index * 0.4)
        noise = random.uniform(-15, 20)
        confidence = max(5, min(98, base_score + noise))

        mfcc_deviation = round(random.uniform(0.15, 0.75), 3)
        cqcc_tilt = round(random.uniform(-0.18, 0.28), 3)
        pitch_consistency = round(random.uniform(0.45, 0.92), 3)
        spectral_flux = round(random.uniform(0.01, 0.5), 3)
        frequency_variation = round(random.uniform(0.01, 0.3), 3)

        is_cloned = confidence > 60 or mfcc_deviation > 0.5

        return {
            "is_cloned": is_cloned,
            "confidence_score": round(confidence, 1),
            "extracted_features": {
                "mfcc_deviation": mfcc_deviation,
                "cqcc_tilt": cqcc_tilt,
                "pitch_consistency": pitch_consistency,
                "spectral_flux": spectral_flux,
                "frequency_variation": frequency_variation,
            },
            "chunk_index": chunk_index,
            "timestamp": time.time() * 1000,
        }

    def reset(self, session_id: str):
        if session_id in self.chunk_counters:
            del self.chunk_counters[session_id]


ai_engine = MockAIEngine()


@app.websocket("/ws/audio")
async def audio_stream(websocket: WebSocket):
    """
    WebSocket endpoint for real-time audio stream analysis.

    Protocol:
    - Client connects and sends JSON handshake: {"action": "start", "session_id": "..."}
    - Client sends binary audio chunks (1-second segments)
    - Server responds with JSON detection results for each chunk
    - Client sends {"action": "stop"} to end the session
    """
    await websocket.accept()

    session_id = str(uuid.uuid4())
    chunk_index = 0

    try:
        while True:
            message = await websocket.receive()

            if "text" in message:
                data = json.loads(message["text"])
                if data.get("action") == "start":
                    session_id = data.get("session_id", session_id)
                    await websocket.send_json({
                        "type": "session_started",
                        "session_id": session_id,
                    })
                elif data.get("action") == "stop":
                    await websocket.send_json({
                        "type": "session_ended",
                        "session_id": session_id,
                    })
                    break

            elif "bytes" in message:
                chunk_data = message["bytes"]
                chunk_index += 1

                # Simulate processing delay (50-150ms)
                processing_delay = random.uniform(0.05, 0.15)
                time.sleep(processing_delay)

                result = ai_engine.analyze(session_id, chunk_data)
                result["chunk_index"] = chunk_index

                await websocket.send_json(result)

    except WebSocketDisconnect:
        ai_engine.reset(session_id)
    except Exception:
        ai_engine.reset(session_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

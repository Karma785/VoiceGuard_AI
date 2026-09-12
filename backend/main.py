"""
VoiceGuard AI - FastAPI Backend
Real-Time Deepfake Voice Detection System
SIH26104 - Smart India Hackathon

WebSocket endpoint that accepts binary audio chunks,
runs mock MFCC/CQCC feature extraction, and returns
detection results in real-time.
"""

import json
import random
import time
import uuid
from typing import Dict

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="VoiceGuard AI Backend",
    description="Real-Time Deepfake Voice Detection API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Mock AI Analysis Engine
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

    For this prototype, we simulate the analysis with realistic
    feature distributions that escalate over the duration of a call.
    """

    def __init__(self):
        self.chunk_counters: Dict[str, int] = {}

    def analyze(self, session_id: str, chunk_data: bytes) -> dict:
        """Analyze a single audio chunk and return detection results."""
        if session_id not in self.chunk_counters:
            self.chunk_counters[session_id] = 0
        self.chunk_counters[session_id] += 1
        chunk_index = self.chunk_counters[session_id]

        # Simulate feature extraction with realistic patterns
        # Risk tends to escalate as more chunks are analyzed
        base_score = 30 + (chunk_index * 0.4)
        wave = random.sin(chunk_index * 0.3) * 15 if hasattr(random, 'sin') else 0
        noise = random.uniform(-15, 20)
        confidence = max(5, min(98, base_score + noise + wave))

        # Simulated MFCC deviation (0.0 - 0.8)
        mfcc_deviation = round(random.uniform(0.15, 0.75), 3)

        # Simulated CQCC spectral tilt (-0.2 - 0.3)
        cqcc_tilt = round(random.uniform(-0.18, 0.28), 3)

        # Simulated pitch consistency (0.4 - 0.95)
        pitch_consistency = round(random.uniform(0.45, 0.92), 3)

        # Determine if cloned based on confidence and feature anomalies
        is_cloned = confidence > 60 or mfcc_deviation > 0.5

        return {
            "is_cloned": is_cloned,
            "confidence_score": round(confidence, 1),
            "extracted_features": {
                "mfcc_deviation": mfcc_deviation,
                "cqcc_tilt": cqcc_tilt,
                "pitch_consistency": pitch_consistency,
            },
            "chunk_index": chunk_index,
            "timestamp": time.time() * 1000,
        }

    def reset(self, session_id: str):
        if session_id in self.chunk_counters:
            del self.chunk_counters[session_id]


ai_engine = MockAIEngine()


# ---------------------------------------------------------------------------
# REST Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    return {
        "service": "VoiceGuard AI Backend",
        "version": "1.0.0",
        "status": "operational",
        "websocket_endpoint": "/ws/audio",
        "endpoints": {
            "health": "/health",
            "websocket": "/ws/audio",
        },
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "ai_engine": "ready"}


# ---------------------------------------------------------------------------
# WebSocket Endpoint
# ---------------------------------------------------------------------------

@app.websocket("/ws/audio")
async def audio_stream(websocket: WebSocket):
    """
    WebSocket endpoint for real-time audio stream analysis.

    Protocol:
    - Client connects and sends a JSON handshake: {"action": "start", "session_id": "..."}
    - Client sends binary audio chunks (1-second segments)
    - Server responds with JSON detection results for each chunk
    - Client sends {"action": "stop"} to end the session

    Detection result format:
    {
        "is_cloned": bool,
        "confidence_score": float,
        "extracted_features": {
            "mfcc_deviation": float,
            "cqcc_tilt": float,
            "pitch_consistency": float
        },
        "chunk_index": int,
        "timestamp": float
    }
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
    except Exception as e:
        ai_engine.reset(session_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

# VoiceGuard AI - FastAPI Backend

## Running the Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## WebSocket Endpoint

Connect to `ws://localhost:8000/ws/audio`

### Protocol

1. **Handshake**: Send JSON `{"action": "start", "session_id": "optional-uuid"}`
2. **Stream**: Send binary audio chunks (1-second segments)
3. **Response**: Server returns JSON detection result per chunk:
```json
{
  "is_cloned": true,
  "confidence_score": 87.5,
  "extracted_features": {
    "mfcc_deviation": 0.523,
    "cqcc_tilt": 0.142,
    "pitch_consistency": 0.731
  },
  "chunk_index": 5,
  "timestamp": 1697228800000.0
}
```
4. **End**: Send JSON `{"action": "stop"}`

## REST Endpoints

- `GET /` — Service info
- `GET /health` — Health check

## Architecture

```
[Client WebSocket] → [Binary Audio Chunks] → [MockAIEngine.analyze()]
                                                ↓
                                    [MFCC Deviation Calculation]
                                    [CQCC Spectral Tilt Analysis]
                                    [Pitch Consistency Check]
                                                ↓
                                    [Detection Result JSON]
                                                ↓
                                    [WebSocket Response → Client]
```

In production, `MockAIEngine.analyze()` would be replaced with a real
ML pipeline using librosa for feature extraction and a trained model
(ResNet/LSTM) for classification.

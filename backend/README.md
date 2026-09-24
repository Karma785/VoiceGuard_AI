# VoiceGuard AI — Backend API

**SIH26104 — Smart India Hackathon 2026**
Offline-First Edge AI Voice Cloning Detection System

A robust, scalable, and secure backend built with **FastAPI** and **MongoDB (Motor async driver)**.

---

## Architecture

```
backend/
├── config/
│   ├── database.py          # MongoDB async connection (Motor)
│   └── settings.py          # Environment-driven settings (JWT, bcrypt, rate limits)
├── models/
│   ├── user.py               # User model + indexes + serializer
│   ├── scan_log.py           # Scan log model (TinyML metadata from mobile)
│   └── evidence_report.py    # Evidence report model (tamper-proof PDFs)
├── schemas/
│   └── __init__.py           # Pydantic v2 input validation for all endpoints
├── middleware/
│   ├── auth.py               # JWT create/decode + auth_required dependency
│   ├── error_handler.py      # Global exception handler + AppError
│   └── rate_limit.py         # Sliding-window rate limiter
├── controllers/
│   ├── auth_controller.py    # Register, login, refresh, profile
│   ├── scan_controller.py    # Batch sync, history, acoustic verification
│   └── report_controller.py # PDF generation, listing, signature verification
├── routes/
│   ├── auth.py               # /auth/* endpoints
│   ├── scans.py              # /scans/* endpoints
│   └── reports.py            # /reports/* endpoints
├── utils/
│   ├── pdf_generator.py      # ReportLab PDF + HMAC-SHA256 digital signature
│   └── security.py           # bcrypt password hashing
└── main.py                   # App factory, middleware, router registration, WebSocket
```

## Setup

```bash
cd backend
pip install -r requirements.txt

# Optional: configure environment variables
export MONGODB_URL="mongodb://localhost:27017"
export MONGODB_DB="voiceguard"
export JWT_SECRET="your-secret-key"

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs available at `http://localhost:8000/docs` (Swagger UI).

## API Endpoints

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Create a new account (email, name, password, device_id) |
| POST | `/auth/login` | No | Login with email + password → JWT tokens |
| POST | `/auth/refresh` | No | Exchange refresh token for new access token |
| GET | `/auth/me` | Yes | Get current user profile |

### Scans

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/scans/sync` | Yes | Batch sync offline scan logs from mobile Edge AI |
| GET | `/scans/history` | Yes | Get scan history (filterable by session_id) |
| POST | `/scans/acoustic-verification` | Yes | Log acoustic fallback verification + glitch metrics |

### Evidence Reports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/reports/generate` | Yes | Generate tamper-proof PDF evidence report |
| GET | `/reports` | Yes | List all reports for the user |
| GET | `/reports/{report_id}` | Yes | Get a single report by ID |
| GET | `/reports/{report_id}/verify` | Yes | Verify the digital signature |
| GET | `/reports/{report_id}/download` | Yes | Download the PDF file |

### WebSocket

| Path | Description |
|------|-------------|
| `ws://localhost:8000/ws/audio` | Real-time audio stream analysis |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Service info |
| GET | `/health` | Health check |

## Key Features

### JWT Authentication
- Access tokens (1 hour) + refresh tokens (7 days)
- bcrypt password hashing (12 rounds)
- Bearer token extraction via FastAPI security

### Offline Scan Sync
- Mobile Edge AI (TinyML) stores detection results locally when offline
- When internet returns, POST all pending logs in one batch
- Each log includes: confidence score, latency, timestamp, extracted features

### Active Acoustic Verification
- Tracks when the high-frequency fallback verification was triggered
- Records per-glitch metrics: frequency, amplitude, timestamp
- Glitch severity score for anomaly assessment

### Evidence Report Generator
- Generates a **tamper-proof PDF** with ReportLab
- Contains: timestamp, device info, audio frequency glitch analysis, location
- **HMAC-SHA256 digital signature** binds report ID, session, verdict, and issuer
- Signature can be independently verified via `/reports/{id}/verify`
- Ready for forwarding to the National Cyber Crime Reporting Portal

### Security
- Global error handling (no stack traces leaked to clients)
- Rate limiting (100 req/60s per client, configurable)
- Pydantic v2 input validation on all endpoints
- CORS configured for frontend integration

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URL` | `mongodb://localhost:27017` | MongoDB connection URI |
| `MONGODB_DB` | `voiceguard` | Database name |
| `JWT_SECRET` | `voiceguard-sih26104-dev-secret...` | JWT signing secret |
| `JWT_ACCESS_EXPIRE_MINUTES` | `60` | Access token TTL |
| `JWT_REFRESH_EXPIRE_DAYS` | `7` | Refresh token TTL |
| `BCRYPT_ROUNDS` | `12` | bcrypt cost factor |
| `RATE_LIMIT_REQUESTS` | `100` | Requests per window |
| `RATE_LIMIT_WINDOW_SECONDS` | `60` | Rate limit window |
| `REPORT_SIGNING_KEY` | `voiceguard-evidence-signing-key` | HMAC signing key |

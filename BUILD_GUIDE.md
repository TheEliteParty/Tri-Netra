# GeoShield Build Guide

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Python | 3.10+ | Backend runtime |
| Node.js | 18+ | Frontend build |
| npm | 9+ | Package manager |
| Git | 2.30+ | Version control |

> **Note:** Python 3.10–3.14 are supported. Node.js 18–22 are supported.

---

## Quick Start (One Command)

```bash
bash deploy.sh    # Linux/Mac — creates venv, installs deps, builds, starts
start.bat         # Windows — same flow
```

`deploy.sh` automatically:
1. Creates a Python virtual environment (`backend/venv/`)
2. Installs all backend dependencies into it
3. Runs `npm install` and `npm run build` for the frontend
4. Starts the FastAPI server on port 8000

---

## Manual Setup

### Backend

```bash
cd backend

# Create virtual environment (REQUIRED — prevents system package conflicts)
python3 -m venv venv

# Activate it
source venv/bin/activate        # Linux / macOS
# .\venv\Scripts\activate      # Windows (PowerShell)
# .\venv\Scripts\activate.bat  # Windows (cmd)

# Install dependencies
pip install -r requirements.txt

# Start server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The backend will:
1. Create SQLite database (`geoshield.db`)
2. Seed 20 NER sensor stations
3. Train AI model (first run: ~22s, cached after — `models/geoshield_model.pkl`)
4. Serve API at `http://localhost:8000/api`

### Frontend (Development)

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (hot reload)
npm run dev
```

Frontend runs at `http://localhost:5173` with hot reload. The dev server proxies API requests to `http://localhost:8000`.

### Frontend (Production)

```bash
cd frontend

# Build for production
npm run build

# Output in frontend/dist/ (served by FastAPI automatically)
```

---

## Docker

```bash
# Build image (Python 3.12 base, Node.js 22 installed automatically)
docker build -t geoshield .

# Run container
docker run -p 8000:8000 geoshield

# Or use Docker Compose (includes health checks, volume mounts)
docker-compose up --build
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./geoshield.db` | PostgreSQL URL for production |
| `JWT_SECRET` | `geoshield-dev-secret-...` | JWT signing secret |
| `TRAINING_DATA_PATH` | Auto-detected | AI training data CSV path |
| `SATELLITE_DATA_PATH` | Auto-detected | Satellite data JSON path |

---

## Android APK

```bash
cd frontend

# Build frontend
npm run build

# Sync with Capacitor
npx cap sync android

# Build APK
cd android
./gradlew assembleDebug

# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

### Requirements
- Android Studio (latest)
- Android SDK 34
- Java 17+

---

## Windows/Linux Desktop (Electron)

```bash
cd frontend

# Build frontend
npm run build

# Install Electron builder
npm install electron-builder --save-dev

# Build desktop app
npx electron-builder --linux  # or --win for Windows
```

---

## Running Tests

```bash
cd backend

# Activate venv first
source venv/bin/activate

# Run API tests (35 tests)
python -m pytest tests/test_api.py -v

# Run E2E tests (40 tests)
python -m pytest tests/test_e2e.py -v

# Run all tests
python -m pytest tests/ -v
```

---

## Demo Accounts

| Email | Password | Role |
|---|---|---|
| admin@geoshield.gov.in | admin123 | Admin |
| field@geoshield.gov.in | field123 | Field Officer |
| district@geoshield.gov.in | district123 | District Admin |
| citizen@geoshield.gov.in | demo123 | Citizen |

---

## API Endpoints (33+)

| Category | Endpoints |
|---|---|
| Auth | `POST /api/auth/login` |
| Dashboard | `GET /api/dashboard/stats`, `/risk-heatmap`, `/rainfall-trend`, `/risk-trend`, `/state-summary` |
| Sensors | `GET /api/sensors/stations`, `/stations/{id}`, `/stations/{id}/history`, `/readings/latest` |
| Alerts | `GET /api/alerts`, `/alerts/active`, `/alerts/stats`, `/alerts/timeline`, `/alerts/history` |
| Reports | `GET /api/reports`, `POST /api/reports` |
| Simulator | `POST /api/simulate/landslide`, `/simulate/batch`, `/simulate/reset` |
| Satellite | `GET /api/satellite/data`, `/satellite/summary`, `/satellite/risk-zones` |
| Weather | `GET /api/weather/{id}`, `/weather/{id}/forecast` |
| Flood | `GET /api/flood/data`, `/flood/summary`, `/flood/correlation` |
| Predict | `POST /api/predict` |
| Export | `GET /api/export/geojson`, `/export/csv`, `/export/risk-zones` |
| Health | `GET /api/health` |

---

*Last updated: 2026-08-28*

"""
Tri-Netra - AI-Based Early Warning and Landslide Risk Monitoring System
Backend API Server for Smart India Hackathon 2026
"""
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.staticfiles import StaticFiles
from starlette.responses import FileResponse
from app.middleware.rate_limiter import RateLimiter

from app.database import engine, Base, SessionLocal
from app.routers import sensors, dashboard, alerts, reports, weather, simulator, satellite, predict, alerts_timeline, flood, ml_enhanced, segmentation, dispatch, scout
from app.auth import authenticate_user, create_token, verify_token
from app.websocket_manager import can_subscribe, manager, normalize_district


def init_database():
    # Use Alembic for production (PostgreSQL), create_all for local dev (SQLite)
    database_url = os.getenv("DATABASE_URL", "")
    if database_url and not database_url.startswith("sqlite"):
        # Production: run Alembic migrations
        try:
            import subprocess
            alembic_ini = os.path.join(os.path.dirname(__file__), "..", "alembic.ini")
            result = subprocess.run(
                [sys.executable, "-m", "alembic", "upgrade", "head"],
                cwd=os.path.dirname(os.path.dirname(__file__)),
                capture_output=True, text=True, timeout=30
            )
            if result.returncode != 0:
                print(f"[Tri-Netra] ⚠️  Alembic error: {result.stderr}")
            else:
                print("[Tri-Netra] ✅ Alembic migrations applied")
        except Exception as e:
            print(f"[Tri-Netra] ⚠️  Alembic failed: {e}, falling back to create_all")
            Base.metadata.create_all(bind=engine)
    else:
        # Development: create_all for instant setup
        Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        from app.models import SensorStation
        if db.query(SensorStation).count() == 0:
            from app.seed_data import seed_database
            seed_database()
        else:
            print("[Tri-Netra] Database already seeded, skipping.")
    finally:
        db.close()
    print("[Tri-Netra] ✅ Database ready")

    # Auto-refresh satellite data if stale (>6 hours old)
    try:
        import json as _json
        from datetime import datetime as _dt, timedelta as _td
        sat_path = os.path.join(os.path.dirname(__file__), "..", "..", "datasets", "processed", "real_satellite_data.json")
        if os.path.exists(sat_path):
            with open(sat_path) as f:
                sat_data = _json.load(f)
            if sat_data:
                last_update = sat_data[0].get("last_updated", "")
                if last_update:
                    try:
                        last_dt = _dt.fromisoformat(last_update)
                        if _dt.utcnow() - last_dt > _td(hours=6):
                            print("[Tri-Netra] 🛰️  Satellite data stale (>6h), run 'python datasets/download_real_data.py' to refresh")
                        else:
                            print(f"[Tri-Netra] 🛰️  Satellite data fresh (updated {last_update})")
                    except (ValueError, TypeError):
                        pass
    except Exception as e:
        print(f"[Tri-Netra] ⚠️  Satellite check skipped: {e}")


init_database()

FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))

app = FastAPI(
    title="Tri-Netra API",
    description="AI-Based Early Warning and Landslide Risk Monitoring System for NER",
    version="1.0.0",
)

_cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost,http://localhost:3000,http://localhost:5173,http://localhost:4173,"
        "capacitor://localhost,null,"
        "http://127.0.0.1:3000,http://127.0.0.1:5173,http://127.0.0.1:4173",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)
app.add_middleware(RateLimiter)

app.include_router(sensors.router)
app.include_router(dashboard.router)
app.include_router(alerts.router)
app.include_router(reports.router)
app.include_router(weather.router)
app.include_router(simulator.router)
app.include_router(satellite.router)
app.include_router(predict.router)
app.include_router(alerts_timeline.router)
app.include_router(flood.router)
app.include_router(ml_enhanced.router)
app.include_router(segmentation.router)
app.include_router(dispatch.router)
app.include_router(scout.router)


@app.get("/health", response_class=JSONResponse)
@app.get("/api/health", response_class=JSONResponse)
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@app.post("/api/auth/login")
async def login(request: Request):
    content_type = request.headers.get("content-type", "")
    email = ""
    password = ""
    if "application/json" in content_type:
        try:
            body = await request.json()
            email = body.get("email", "")
            password = body.get("password", "")
        except Exception:
            pass
    if not email or not password:
        try:
            form = await request.form()
            email = form.get("email", "")
            password = form.get("password", "")
        except Exception:
            pass

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    user = authenticate_user(email, password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user)
    return {
        "token": token,
        "user": {
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "districts": user.get("districts", []),
        },
    }


def _websocket_user(websocket: WebSocket) -> dict:
    """Authenticate browser query tokens or non-browser Authorization headers."""
    token = websocket.query_params.get("token")
    authorization = websocket.headers.get("authorization", "")
    if not token and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    return verify_token(token)


async def _serve_alert_socket(websocket: WebSocket, requested_district: str) -> None:
    try:
        user = _websocket_user(websocket)
        district = normalize_district(requested_district)
        if not can_subscribe(user, district):
            await websocket.close(code=4403, reason="District subscription not authorized")
            return
    except (HTTPException, ValueError) as exc:
        reason = exc.detail if isinstance(exc, HTTPException) else str(exc)
        await websocket.close(code=4401, reason=reason)
        return

    await manager.connect(websocket, district=district, user=user)
    try:
        await websocket.send_json({"type": "connected", "district": district})
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
            elif data.startswith("subscribe:"):
                new_district = normalize_district(data.split(":", 1)[1])
                if not can_subscribe(user, new_district):
                    await websocket.send_json({"type": "error", "message": "District subscription not authorized"})
                    continue
                manager.subscribe(websocket, new_district)
                await websocket.send_json({"type": "subscribed", "district": new_district})
    except (WebSocketDisconnect, ValueError):
        pass
    finally:
        manager.disconnect(websocket)


@app.websocket("/ws/alerts/{district}")
async def websocket_alerts(websocket: WebSocket, district: str = "all"):
    """District-scoped WebSocket for real-time alert broadcasting."""
    await _serve_alert_socket(websocket, district)


@app.websocket("/ws/alerts")
async def websocket_alerts_all(websocket: WebSocket):
    """Legacy endpoint - connects to all districts."""
    await _serve_alert_socket(websocket, "all")


# Serve frontend static files
if os.path.exists(os.path.join(FRONTEND_DIR, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")

if os.path.exists(FRONTEND_DIR):
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        # Skip ALL API, WebSocket, and health routes - never return HTML for these
        if (full_path.startswith("api/") or full_path.startswith("ws") 
            or full_path == "health" or full_path == "api"):
            return JSONResponse({"message": "API endpoint not found", "path": full_path}, status_code=404)
        # Sanitize path to prevent path traversal attacks
        if full_path:
            normalized = os.path.normpath(full_path).lstrip(os.sep)
            if normalized.startswith("..") or os.path.isabs(normalized):
                return {"message": "Not found", "version": "1.0.0"}
            file_path = os.path.join(FRONTEND_DIR, normalized)
            # Ensure resolved path stays within FRONTEND_DIR
            if not os.path.abspath(file_path).startswith(os.path.abspath(FRONTEND_DIR)):
                return {"message": "Not found", "version": "1.0.0"}
            if os.path.isfile(file_path):
                return FileResponse(file_path)
        # Serve index.html for all other routes (SPA routing)
        index_path = os.path.join(FRONTEND_DIR, "index.html")
        if os.path.isfile(index_path):
            return FileResponse(index_path)
        return {"message": "Tri-Netra API", "version": "1.0.0"}

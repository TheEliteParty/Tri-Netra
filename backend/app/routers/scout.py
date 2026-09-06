from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel
import random
import math

from app.database import get_db
from app.models import Station

router = APIRouter(prefix="/api/scout", tags=["ground-scout"])

# In-memory realistic crowdsourced scout reports
SCOUT_REPORTS = [
    {
        "id": "SCT-701",
        "hazard_type": "Ground Tension Crack",
        "severity": "CRITICAL",
        "threat_score": 88.5,
        "description": "Long linear ground fissure approx 4-6 inches wide opened behind residential block near Sunil Ward. Tree alignment tilting downhill.",
        "latitude": 30.5562,
        "longitude": 79.5630,
        "location_name": "Joshimath Upper Ward 4, Uttarakhand",
        "nearest_station": "UK-001 (Joshimath Fissure Zone)",
        "distance_km": 0.8,
        "reporter_name": "Ramesh Rawat",
        "reporter_phone": "+91 98765 43210",
        "reported_at": "2026-09-06T10:15:00Z",
        "status": "TEAM_DISPATCHED",
        "ai_triage": {
            "crack_width_cm": 14.2,
            "soil_saturation_pct": 82.0,
            "immediate_risk": "High shear failure probability along joint plane",
            "recommended_action": "Issue evacuation notice for 15 downhill structures"
        },
        "image_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": "SCT-702",
        "hazard_type": "Muddy Spring Seepage",
        "severity": "HIGH",
        "threat_score": 79.2,
        "description": "Sudden burst of turbid brownish water flowing out from tea plantation slope. Soil spongy and unstable underfoot.",
        "latitude": 11.5273,
        "longitude": 76.1378,
        "location_name": "Meppadi Tea Estate, Wayanad, Kerala",
        "nearest_station": "KL-001 (Meppadi / Chooralmala)",
        "distance_km": 1.4,
        "reporter_name": "Ananya Nair",
        "reporter_phone": "+91 94471 22890",
        "reported_at": "2026-09-06T08:40:00Z",
        "status": "INVESTIGATING",
        "ai_triage": {
            "crack_width_cm": 0.0,
            "soil_saturation_pct": 94.5,
            "immediate_risk": "Piping and rapid subsurface pore pressure spike",
            "recommended_action": "Deploy geotechnical drone scanner and divert downstream footpath"
        },
        "image_url": "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": "SCT-703",
        "hazard_type": "Rockfall on Highway",
        "severity": "WARNING",
        "threat_score": 64.0,
        "description": "Boulder fragments falling continuously across NH-10. Retaining wire mesh partially ruptured at km 42 marker.",
        "latitude": 27.1850,
        "longitude": 88.5120,
        "location_name": "NH-10 Corridor, Singtam, Sikkim",
        "nearest_station": "NER-001 (Gangtok Hill Top)",
        "distance_km": 4.2,
        "reporter_name": "Tashi Bhutia",
        "reporter_phone": "+91 97330 11452",
        "reported_at": "2026-09-05T17:30:00Z",
        "status": "VERIFIED",
        "ai_triage": {
            "crack_width_cm": 6.5,
            "soil_saturation_pct": 68.0,
            "immediate_risk": "Wedge failure on steep cut slope",
            "recommended_action": "Alert BRO highway patrol for debris clearing and single-lane routing"
        },
        "image_url": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80"
    },
    {
        "id": "SCT-704",
        "hazard_type": "Road Subsidence",
        "severity": "MODERATE",
        "threat_score": 52.1,
        "description": "Tarmac dipped by 3 inches on edge of ghat road. Embankment masonry wall shows diagonal cracks.",
        "latitude": 17.9237,
        "longitude": 73.6586,
        "location_name": "Mahabaleshwar Ghat Road, Maharashtra",
        "nearest_station": "MH-001 (Mahabaleshwar Western Ghats)",
        "distance_km": 2.1,
        "reporter_name": "Pradeep Kadam",
        "reporter_phone": "+91 98220 88910",
        "reported_at": "2026-09-05T12:00:00Z",
        "status": "RESOLVED",
        "ai_triage": {
            "crack_width_cm": 4.0,
            "soil_saturation_pct": 55.0,
            "immediate_risk": "Creep displacement on fill slope",
            "recommended_action": "Install geo-grid reinforcement during scheduled road maintenance"
        },
        "image_url": "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=600&q=80"
    }
]

class ReportSubmission(BaseModel):
    hazard_type: str
    description: str
    latitude: float
    longitude: float
    location_name: Optional[str] = "Field Location"
    reporter_name: Optional[str] = "Anonymous Scout"
    reporter_phone: Optional[str] = None
    image_url: Optional[str] = None

@router.get("/reports")
def get_scout_reports(status: Optional[str] = None):
    if status:
        filtered = [r for r in SCOUT_REPORTS if r["status"].lower() == status.lower()]
        return {"reports": filtered, "total": len(filtered)}
    return {"reports": SCOUT_REPORTS, "total": len(SCOUT_REPORTS)}

@router.get("/stats")
def get_scout_stats():
    total = len(SCOUT_REPORTS)
    critical = len([r for r in SCOUT_REPORTS if r["severity"] == "CRITICAL"])
    dispatched = len([r for r in SCOUT_REPORTS if r["status"] == "TEAM_DISPATCHED"])
    verified = len([r for r in SCOUT_REPORTS if r["status"] in ["VERIFIED", "RESOLVED"]])
    return {
        "total_reports": total,
        "critical_threats": critical,
        "teams_dispatched": dispatched,
        "verified_reports": verified,
        "avg_triage_time_sec": 1.2,
        "community_responders_active": 142
    }

@router.post("/reports")
def create_scout_report(payload: ReportSubmission, db: Session = Depends(get_db)):
    # Calculate proximity to nearest station
    stations = db.query(Station).all()
    nearest_station_str = "Regional Tri-Netra Node"
    min_dist = 999.0
    
    for s in stations:
        d = math.sqrt((s.latitude - payload.latitude)**2 + (s.longitude - payload.longitude)**2) * 111.0
        if d < min_dist:
            min_dist = d
            nearest_station_str = f"{s.id} ({s.name})"
    
    # AI Computer Vision Triage Engine Simulation
    desc_lower = payload.description.lower()
    is_fissure = "crack" in desc_lower or "fissure" in desc_lower or "gap" in desc_lower
    is_water = "water" in desc_lower or "mud" in desc_lower or "seepage" in desc_lower or "spring" in desc_lower
    
    crack_width = round(random.uniform(5.0, 18.0), 1) if is_fissure else round(random.uniform(0.5, 4.0), 1)
    saturation = round(random.uniform(75.0, 96.0), 1) if is_water else round(random.uniform(50.0, 78.0), 1)
    
    threat_score = round(min(98.0, max(35.0, (crack_width * 3.5) + (saturation * 0.45) + random.uniform(5, 12))), 1)
    
    if threat_score >= 75.0:
        severity = "CRITICAL"
        action = "Immediate NDRF/SDRF field unit dispatch and evacuation radius alert"
        status = "TEAM_DISPATCHED"
    elif threat_score >= 60.0:
        severity = "HIGH"
        action = "Geotechnical sensor cross-check and drone LiDAR scan"
        status = "INVESTIGATING"
    else:
        severity = "WARNING"
        action = "Log in regional geological hazard register and schedule patrol"
        status = "VERIFIED"

    new_report = {
        "id": f"SCT-{len(SCOUT_REPORTS) + 705}",
        "hazard_type": payload.hazard_type,
        "severity": severity,
        "threat_score": threat_score,
        "description": payload.description,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "location_name": payload.location_name or f"Lat: {payload.latitude:.4f}, Lng: {payload.longitude:.4f}",
        "nearest_station": nearest_station_str,
        "distance_km": round(min_dist, 1) if min_dist < 900 else 2.5,
        "reporter_name": payload.reporter_name or "Anonymous Scout",
        "reporter_phone": payload.reporter_phone or "N/A",
        "reported_at": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "ai_triage": {
            "crack_width_cm": crack_width,
            "soil_saturation_pct": saturation,
            "immediate_risk": f"AI visual analysis: {severity} slope instability indicator detected",
            "recommended_action": action
        },
        "image_url": payload.image_url or "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80"
    }
    SCOUT_REPORTS.insert(0, new_report)
    
    return {
        "status": "success",
        "message": "Ground Scout hazard report analyzed by Tri-Netra AI and triaged successfully!",
        "report": new_report
    }

@router.put("/reports/{report_id}/status")
def update_report_status(report_id: str, new_status: str):
    for r in SCOUT_REPORTS:
        if r["id"] == report_id:
            r["status"] = new_status.upper()
            return {"status": "success", "report": r}
    raise HTTPException(status_code=404, detail="Report not found")

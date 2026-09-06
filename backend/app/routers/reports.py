from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from app.database import get_db
from app.models import CitizenReport, RoadStatus, Village
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api", tags=["reports"])


class NDMABriefingResponse(BaseModel):
    status: str
    data_mode: str
    disclaimer: str
    doc_number: str
    generated_at: str
    classification: str
    authority: str
    station_summary: Dict[str, Any]
    geotechnical_metrics: Dict[str, Any]
    infrastructure_exposure: Dict[str, Any]
    ndma_sop_action_checklist: List[Dict[str, Any]]


# ---- Citizen Reports ----

@router.post("/reports")
def create_report(
    report_type: str = Form(...),
    description: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    reporter_name: Optional[str] = Form(None),
    reporter_phone: Optional[str] = Form(None),
    reporter_language: str = Form("en"),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    report = CitizenReport(
        report_type=report_type,
        description=description,
        latitude=latitude,
        longitude=longitude,
        reporter_name=reporter_name,
        reporter_phone=reporter_phone,
        reporter_language=reporter_language,
        status="pending",
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return {
        "id": report.id,
        "status": "success",
        "message": "Report submitted successfully. Thank you for your contribution!",
        "report_id": report.id,
    }


@router.get("/reports")
def get_reports(
    status: str = None,
    report_type: str = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(CitizenReport)
    if status:
        query = query.filter(CitizenReport.status == status)
    if report_type:
        query = query.filter(CitizenReport.report_type == report_type)

    reports = query.order_by(desc(CitizenReport.created_at)).limit(limit).all()

    return [{
        "id": r.id,
        "report_type": r.report_type,
        "description": r.description,
        "latitude": r.latitude,
        "longitude": r.longitude,
        "reporter_name": r.reporter_name,
        "reporter_language": r.reporter_language,
        "status": r.status,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in reports]


@router.put("/reports/{report_id}/verify")
def verify_report(report_id: int, verified_by: str = "Admin", db: Session = Depends(get_db), user: dict = Depends(require_role("admin"))):
    report = db.query(CitizenReport).filter(CitizenReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.status = "verified"
    report.verified_by = verified_by
    db.commit()
    return {"message": "Report verified", "id": report_id}


@router.put("/reports/{report_id}/dismiss")
def dismiss_report(report_id: int, db: Session = Depends(get_db), user: dict = Depends(require_role("admin", "field_officer", "district_admin"))):
    report = db.query(CitizenReport).filter(CitizenReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.status = "dismissed"
    db.commit()
    return {"message": "Report dismissed", "id": report_id}


# ---- Road Status ----

@router.get("/roads")
def get_roads(db: Session = Depends(get_db)):
    roads = db.query(RoadStatus).all()
    return [{
        "id": r.id,
        "road_name": r.road_name,
        "road_type": r.road_type,
        "start_lat": r.start_lat,
        "start_lng": r.start_lng,
        "end_lat": r.end_lat,
        "end_lng": r.end_lng,
        "status": r.status,
        "blockage_reason": r.blockage_reason,
        "alternative_route": r.alternative_route,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    } for r in roads]


# ---- Villages ----

@router.get("/villages")
def get_villages(
    risk_zone: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(Village)
    if risk_zone:
        query = query.filter(Village.risk_zone == risk_zone)

    villages = query.all()
    return [{
        "id": v.id,
        "name": v.name,
        "state": v.state,
        "district": v.district,
        "latitude": v.latitude,
        "longitude": v.longitude,
        "population": v.population,
        "risk_zone": v.risk_zone,
        "nearest_hospital_km": v.nearest_hospital_km,
        "nearest_police_km": v.nearest_police_km,
    } for v in villages]


# ---- NDMA & District Magistrate Geotechnical Briefing ----

@router.get("/ndma-briefing/{station_id}", response_model=NDMABriefingResponse)
def get_ndma_briefing(station_id: str, db: Session = Depends(get_db)):
    from app.models import SensorStation
    from datetime import datetime, timezone
    import hashlib
    
    station = db.query(SensorStation).filter(SensorStation.station_id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    # Stable station-specific prototype values. These are demonstrative outputs,
    # not measurements, forecasts, or a basis for operational decisions.
    seed = int(hashlib.sha256(station_id.encode("utf-8")).hexdigest()[:8], 16)
    slope = float(station.slope_angle or 35.0)
    fos = round(max(0.78, min(1.85, 1.72 - slope / 55.0 + (seed % 21) / 100.0)), 2)
    monte_carlo_prob = round(min(96.0, max(5.0, (1.8 - fos) * 90.0)), 1)
    status_level = "CRITICAL / EVACUATION" if fos < 1.0 else ("WARNING / WATCH" if fos < 1.3 else "ADVISORY / STABLE")
    insar_displacement = round(35.0 + (seed % 850) / 10.0, 1)
    rainfall = round(55.0 + ((seed >> 4) % 1300) / 10.0, 1)
    
    return {
        "status": "success",
        "data_mode": "prototype_simulation",
        "disclaimer": "Demonstration-only synthetic metrics; not validated measurements or operational guidance.",
        "doc_number": f"TRINETRA/PROTOTYPE/GEO-{station_id}-{seed % 1000:03d}",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "classification": "PROTOTYPE / NOT FOR OPERATIONAL USE",
        "authority": "Tri-Netra demonstration system",
        "station_summary": {
            "station_id": station_id,
            "station_name": station.name,
            "state": station.state,
            "district": station.district,
            "latitude": station.latitude,
            "longitude": station.longitude,
            "elevation_m": station.elevation or 0,
            "geology_type": "Prototype assumption; field survey required",
            "slope_angle_deg": slope,
        },
        "geotechnical_metrics": {
            "factor_of_safety_bishop": fos,
            "monte_carlo_failure_probability_pct": monte_carlo_prob,
            "status_level": status_level,
            "insar_cumulative_displacement_mm": insar_displacement,
            "insar_velocity_mm_per_yr": round(-(20.0 + (seed % 900) / 10.0), 1),
            "soil_pore_water_pressure_kpa": round(25.0 + ((seed >> 8) % 430) / 10.0, 1),
            "acoustic_emission_spikes_24h": 10 + ((seed >> 12) % 79),
            "rainfall_24h_mm": rainfall,
            "caine_threshold_exceedance_pct": round(100.0 + ((seed >> 16) % 960) / 10.0, 1),
            "provenance": "Deterministic synthetic prototype values",
        },
        "infrastructure_exposure": {
            "provenance": "Illustrative prototype scenario; no live infrastructure feed is connected",
            "national_highway_km": "4.8 km stretch (Critical Corridor)",
            "railway_alignment_risk": "Tunnel Portal 12-A within 1.2km buffer",
            "settlements_at_risk": ["Ward 4", "Lower Bazaar", "Riverbank Colony"],
            "population_at_direct_risk": 4850 if fos < 1.1 else 1650,
            "critical_assets": ["132kV Power Substation", "District Civil Hospital", "Potable Water Reservoir"]
        },
        "ndma_sop_action_checklist": [
            {"step": 1, "action": "Prototype recommendation: assess movement restrictions along the affected corridor", "status": "NOT_EXECUTED", "responsible": "District Magistrate (DM)"},
            {"step": 2, "action": "Prototype recommendation: consider pre-staging an authorized response team", "status": "NOT_EXECUTED", "responsible": "District administration / authorized responders"},
            {"step": 3, "action": "Prototype recommendation: prepare approved public-warning channels", "status": "NOT_EXECUTED", "responsible": "Authorized emergency communications team"},
            {"step": 4, "action": "Prototype recommendation: verify and prepare designated relief shelters", "status": "NOT_EXECUTED", "responsible": "Sub-Divisional Magistrate (SDM)"},
            {"step": 5, "action": "Prototype recommendation: request a qualified field survey", "status": "NOT_EXECUTED", "responsible": "Authorized geological survey unit"}
        ]
    }

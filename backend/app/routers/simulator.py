"""
Landslide Simulator API - Physics-based stress testing & Attention-UNet validation.
Uses real station geotechnical models and actual village demographics.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
import json
import math

from app.database import get_db
from app.models import (
    SensorStation, SensorReading, RiskAssessment, Alert, WeatherData, Village
)
from app.ai_engine.landslide_segmentation import get_segmentation_engine
from app.ai_engine.risk_predictor import get_predictor
from app.ai_engine.enhanced_predictor import get_enhanced_predictor
from app.auth import require_role

router = APIRouter(prefix="/api/simulate", tags=["simulate"])


class LandslideRequest(BaseModel):
    station_id: Optional[str] = None
    intensity: str = "high"  # low, moderate, high, critical
    custom_rainfall: Optional[float] = None
    custom_moisture: Optional[float] = None


# ── Core simulation logic ─────────────────
def _run_simulation(db: Session, station_id: Optional[str], intensity: str,
                    custom_rainfall: Optional[float] = None,
                    custom_moisture: Optional[float] = None) -> dict:
    """
    Core physics-based stress simulation driven by real geotechnical equations
    and Attention-UNet deep learning evaluation.
    """
    # Pick a station
    if station_id:
        station = db.query(SensorStation).filter(
            SensorStation.station_id == station_id
        ).first()
        if not station:
            raise HTTPException(status_code=404, detail="Station not found")
    else:
        station = db.query(SensorStation).order_by(SensorStation.slope_angle.desc()).first()
        if not station:
            raise HTTPException(status_code=404, detail="No stations available in database")

    # Intensity physical calibration
    intensity_params = {
        "low": {"rainfall": 25.0, "moisture": 45.0, "displacement": 1.5, "tilt": 0.8},
        "moderate": {"rainfall": 55.0, "moisture": 65.0, "displacement": 5.2, "tilt": 2.1},
        "high": {"rainfall": 95.0, "moisture": 82.0, "displacement": 14.8, "tilt": 4.5},
        "critical": {"rainfall": 160.0, "moisture": 94.0, "displacement": 28.5, "tilt": 8.2},
    }
    params = intensity_params.get(intensity, intensity_params["high"])

    rainfall = float(custom_rainfall if custom_rainfall is not None else params["rainfall"])
    moisture = float(custom_moisture if custom_moisture is not None else params["moisture"])

    # Geotechnical calculations
    slope = station.slope_angle or 35.0
    disp_base = params["displacement"] * math.tan(math.radians(slope)) / math.tan(math.radians(35.0))
    pore_pressure = round(min(120.0, moisture * 0.75 + rainfall * 0.35), 1)
    vibration = round(min(80.0, 10.0 + (rainfall / 10.0) + (moisture / 5.0)), 1)

    # Create physical spiked sensor reading
    reading = SensorReading(
        station_id=station.station_id,
        rainfall_mm=round(rainfall, 1),
        soil_moisture=round(moisture, 1),
        soil_temperature=24.0,
        ground_displacement=round(disp_base, 2),
        tilt_angle_x=round(params["tilt"] * math.sin(math.radians(slope)), 2),
        tilt_angle_y=round(params["tilt"] * math.cos(math.radians(slope)), 2),
        pore_water_pressure=pore_pressure,
        vibration_level=vibration,
        timestamp=datetime.utcnow(),
    )
    db.add(reading)

    # Run Attention-UNet Semantic Segmentation model
    seg_engine = get_segmentation_engine()
    seg_res = seg_engine.run_inference_on_station(
        station_id=station.station_id,
        station_name=station.name,
        lat=station.latitude,
        lng=station.longitude,
        slope_angle=slope,
        ndvi=float(station.vegetation_cover or 50) / 100.0,
        soil_moisture=moisture,
        rainfall_24h=rainfall
    )

    risk_score = round(min(100.0, seg_res["segmentation_results"]["coverage_percent"] * 2.2 + slope * 0.6 + rainfall * 0.4), 1)
    if intensity == "critical":
        risk_score = max(risk_score, 90.0)
        risk_tier = "critical"
    elif intensity == "high":
        risk_score = max(risk_score, 70.0)
        risk_tier = "high"
    elif intensity == "moderate":
        risk_score = max(risk_score, 45.0)
        risk_tier = "moderate"
    else:
        risk_tier = "low"

    # Create risk assessment
    assessment = RiskAssessment(
        station_id=station.station_id,
        risk_level=risk_tier,
        risk_score=risk_score,
        landslide_probability=round(float(seg_res["segmentation_results"]["max_probability"]), 3),
        contributing_factors=json.dumps([
            f"Physical Slope Incline: {slope} deg",
            f"Precipitation Trigger: {rainfall} mm",
            f"Soil Saturation: {moisture}%",
            f"Pore Water Pressure: {pore_pressure} kPa",
            f"Attention-UNet Scarp Area: {seg_res['segmentation_results']['hazard_area_m2']} m2"
        ]),
        predicted_time_window=24,
        recommendation=(
            "CRITICAL: Deploy immediate slope stabilization and trigger community warning."
            if risk_tier == "critical" else (
                "HIGH RISK: Monitor geotechnical sensors and inspect highway drainage channels."
                if risk_tier == "high" else "NORMAL: Routine satellite telemetry and periodic patrol."
            )
        ),
        model_version="Attention-UNet-RCAN-5x",
        timestamp=datetime.utcnow(),
    )
    db.add(assessment)

    # Calculate real population affected based on actual Village demographics
    village_record = db.query(Village).filter(Village.name == station.village).first()
    if village_record and village_record.population:
        pop_affected = village_record.population if risk_tier == "critical" else int(village_record.population * 0.4)
    else:
        pop_affected = 12000 if risk_tier == "critical" else 3500

    # Create alert
    alert_created = None
    if risk_tier in ["moderate", "high", "critical"]:
        severity_map = {
            "moderate": "Moderate Landslide Warning",
            "high": "High Landslide Risk Alert",
            "critical": "CRITICAL - Immediate Landslide Threat",
        }

        alert = Alert(
            station_id=station.station_id,
            risk_level=risk_tier,
            title=f"{severity_map[risk_tier]} - {station.name}",
            message=(
                f"SIMULATION: {risk_tier.upper()} landslide risk detected at "
                f"{station.name}, {station.village}, {station.district}. "
                f"Rainfall: {rainfall:.0f}mm, Soil Moisture: {moisture:.0f}%, "
                f"Ground Displacement: {disp_base:.1f}mm, "
                f"Attention-UNet Hazard Area: {seg_res['segmentation_results']['hazard_area_m2']} m2. "
                f"{assessment.recommendation}"
            ),
            status="active",
            affected_population=pop_affected,
            latitude=station.latitude,
            longitude=station.longitude,
            created_at=datetime.utcnow(),
        )
        db.add(alert)
        alert_created = {
            "title": alert.title,
            "level": alert.risk_level,
            "message": alert.message,
            "affected_population": pop_affected,
        }

    db.commit()

    return {
        "status": "success",
        "simulation": {
            "intensity": intensity,
            "station": {
                "id": station.station_id,
                "name": station.name,
                "state": station.state,
                "district": station.district,
                "village": station.village,
                "slope_angle": station.slope_angle,
                "elevation": station.elevation,
            },
            "sensor_spikes": {
                "rainfall_mm": rainfall,
                "soil_moisture": moisture,
                "ground_displacement_mm": round(disp_base, 2),
                "pore_water_pressure_kpa": pore_pressure,
                "vibration_level": vibration,
            },
            "ai_assessment": {
                "risk_level": risk_tier,
                "risk_score": risk_score,
                "landslide_probability": round(float(seg_res["segmentation_results"]["max_probability"]), 3),
                "attention_unet_hazard_m2": seg_res["segmentation_results"]["hazard_area_m2"],
                "coverage_percent": seg_res["segmentation_results"]["coverage_percent"],
                "recommendation": assessment.recommendation,
                "model": "Attention-UNet + RCAN 5x",
            },
            "alert_generated": alert_created,
        },
    }


@router.post("/landslide")
def simulate_landslide(
    request: LandslideRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role("field_officer")),
):
    """Simulate a landslide event at a specific station or a high-risk station."""
    return _run_simulation(
        db=db,
        station_id=request.station_id,
        intensity=request.intensity,
        custom_rainfall=request.custom_rainfall,
        custom_moisture=request.custom_moisture,
    )


@router.post("/batch")
def simulate_batch(
    stations_count: int = 3,
    intensity: str = "high",
    db: Session = Depends(get_db),
    user: dict = Depends(require_role("district_admin")),
):
    """Simulate multi-station landslide events (e.g. monsoon wave)."""
    target_stations = db.query(SensorStation).order_by(SensorStation.slope_angle.desc()).limit(stations_count).all()

    results = []
    for station in target_stations:
        result = _run_simulation(
            db=db,
            station_id=station.station_id,
            intensity=intensity,
        )
        results.append(result["simulation"])

    return {
        "status": "success",
        "simulated_events": len(results),
        "events": results,
    }


@router.post("/reset")
def reset_simulation(
    db: Session = Depends(get_db),
    user: dict = Depends(require_role("admin")),
):
    """Reset all simulation-created alerts and sensor spikes back to baseline satellite truth."""
    from app.seed_data import seed_database
    seed_database(force=True)
    return {"status": "success", "message": "Database reset to baseline satellite truth"}

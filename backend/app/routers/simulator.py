"""
Landslide Simulator API - Creates realistic landslide simulation events
for live demo during SIH 2026 presentation.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
import json
import random

from app.database import get_db
from app.models import (
    SensorStation, SensorReading, RiskAssessment, Alert, WeatherData
)
from app.ai_engine.risk_predictor import get_predictor
from app.ai_engine.enhanced_predictor import get_enhanced_predictor
from app.auth import require_role

router = APIRouter(prefix="/api/simulate", tags=["simulate"])


class LandslideRequest(BaseModel):
    station_id: Optional[str] = None
    intensity: str = "high"  # low, moderate, high, critical
    custom_rainfall: Optional[float] = None
    custom_moisture: Optional[float] = None


# ── Core simulation logic (called by all endpoints) ─────────────────
def _run_simulation(db: Session, station_id: Optional[str], intensity: str,
                    custom_rainfall: Optional[float] = None,
                    custom_moisture: Optional[float] = None) -> dict:
    """
    Core landslide simulation logic, extracted so that both the /landslide
    and /batch endpoints can share it without breaking FastAPI DI.
    """
    # Pick a station
    if station_id:
        station = db.query(SensorStation).filter(
            SensorStation.station_id == station_id
        ).first()
        if not station:
            raise HTTPException(status_code=404, detail="Station not found")
    else:
        high_risk_stations = db.query(SensorStation).filter(
            SensorStation.slope_angle > 35
        ).all()
        if not high_risk_stations:
            high_risk_stations = db.query(SensorStation).all()
        station = random.choice(high_risk_stations)

    # Intensity parameters
    intensity_params = {
        "low": {"rainfall": 30, "moisture": 55, "displacement": 2, "tilt": 1},
        "moderate": {"rainfall": 60, "moisture": 70, "displacement": 5, "tilt": 2},
        "high": {"rainfall": 100, "moisture": 85, "displacement": 12, "tilt": 4},
        "critical": {"rainfall": 180, "moisture": 95, "displacement": 25, "tilt": 8},
    }
    params = intensity_params.get(intensity, intensity_params["high"])

    rainfall = custom_rainfall or params["rainfall"] + random.uniform(-10, 10)
    moisture = custom_moisture or params["moisture"] + random.uniform(-5, 5)

    # Create spiked sensor reading
    reading = SensorReading(
        station_id=station.station_id,
        rainfall_mm=round(rainfall, 1),
        soil_moisture=round(moisture, 1),
        soil_temperature=round(random.uniform(22, 30), 1),
        ground_displacement=round(params["displacement"] + random.uniform(-2, 2), 2),
        tilt_angle_x=round(random.uniform(-params["tilt"], params["tilt"]), 2),
        tilt_angle_y=round(random.uniform(-params["tilt"], params["tilt"]), 2),
        pore_water_pressure=round(min(100, rainfall * 0.6 + random.uniform(5, 15)), 1),
        vibration_level=round(random.uniform(15, 40), 1),
        timestamp=datetime.utcnow(),
    )
    db.add(reading)

    # Run AI prediction
    predictor = get_predictor()
    sensor_data = {
        "rainfall_mm": rainfall,
        "soil_moisture": moisture,
        "ground_displacement": params["displacement"],
        "tilt_angle_x": reading.tilt_angle_x,
        "tilt_angle_y": reading.tilt_angle_y,
        "pore_water_pressure": reading.pore_water_pressure,
    }
    station_data = {
        "slope_angle": station.slope_angle,
        "elevation": station.elevation,
        "vegetation_cover": station.vegetation_cover,
    }

    result = predictor.predict_risk(sensor_data, station_data)

    # Also run enhanced predictor with terrain enrichment
    try:
        enhanced = get_enhanced_predictor()
        enhanced_result = enhanced.predict(
            station.latitude, station.longitude,
            {
                "slope": station.slope_angle,
                "elevation": station.elevation,
                "rainfall_24hr": rainfall,
                "soil_moisture": moisture / 100,
                "ndvi": station.vegetation_cover / 100,
            }
        )
        result["risk_score"] = enhanced_result["risk_score"]
        result["risk_level"] = enhanced_result["risk_level"]
    except Exception:
        pass  # Fall back to original predictor

    # Force higher risk based on intensity
    if intensity == "critical":
        result["risk_score"] = max(result["risk_score"], 90)
        result["risk_level"] = "critical"
        result["landslide_probability"] = max(result["landslide_probability"], 0.85)
    elif intensity == "high":
        result["risk_score"] = max(result["risk_score"], 70)
        result["risk_level"] = "high" if result["risk_level"] == "low" else result["risk_level"]
        result["landslide_probability"] = max(result["landslide_probability"], 0.65)

    # Create risk assessment
    assessment = RiskAssessment(
        station_id=station.station_id,
        risk_level=result["risk_level"],
        risk_score=result["risk_score"],
        landslide_probability=result["landslide_probability"],
        contributing_factors=json.dumps(result["contributing_factors"]),
        predicted_time_window=result["predicted_time_window_hours"],
        recommendation=result["recommendation"],
        model_version="v1.0-sim",
    )
    db.add(assessment)

    # Create alert if risk is moderate or above
    alert_created = None
    if result["risk_level"] in ["moderate", "high", "critical"]:
        severity_map = {
            "moderate": "Moderate Landslide Warning",
            "high": "High Landslide Risk Alert",
            "critical": "CRITICAL - Immediate Landslide Threat",
        }
        pop_affected = random.randint(500, 15000) if result["risk_level"] != "critical" else random.randint(5000, 50000)

        alert = Alert(
            station_id=station.station_id,
            risk_level=result["risk_level"],
            title=f"{severity_map[result['risk_level']]} - {station.name}",
            message=(
                f"SIMULATION: {result['risk_level'].upper()} landslide risk detected at "
                f"{station.name}, {station.village}, {station.district}. "
                f"Rainfall: {rainfall:.0f}mm, Soil Moisture: {moisture:.0f}%, "
                f"Ground Displacement: {params['displacement']:.1f}mm. "
                f"{result['recommendation']}"
            ),
            status="active",
            affected_population=pop_affected,
            nearby_villages=json.dumps([station.village]),
            latitude=station.latitude,
            longitude=station.longitude,
        )
        db.add(alert)
        alert_created = alert

    db.commit()

    return {
        "status": "success",
        "simulation": {
            "station": {
                "id": station.station_id,
                "name": station.name,
                "state": station.state,
                "district": station.district,
            },
            "intensity": intensity,
            "sensor_reading": {
                "rainfall_mm": round(rainfall, 1),
                "soil_moisture": round(moisture, 1),
                "ground_displacement": round(params["displacement"], 1),
                "pore_pressure": reading.pore_water_pressure,
            },
        },
        "risk_assessment": {
            "risk_score": result["risk_score"],
            "risk_level": result["risk_level"],
            "landslide_probability": round(result["landslide_probability"], 3),
            "contributing_factors": result["contributing_factors"],
            "time_window_hours": result["predicted_time_window_hours"],
            "recommendation": result["recommendation"],
        },
        "alert": {
            "id": alert_created.id if alert_created else None,
            "title": alert_created.title if alert_created else None,
            "affected_population": alert_created.affected_population if alert_created else 0,
        } if alert_created else None,
    }


@router.post("/landslide")
def simulate_landslide(request: LandslideRequest, db: Session = Depends(get_db), user: dict = Depends(require_role("admin", "field_officer", "district_admin", "citizen"))):
    """
    Simulate a landslide event at a station.
    Creates spike in sensor readings, generates risk assessment, creates alert.
    """
    return _run_simulation(
        db=db,
        station_id=request.station_id,
        intensity=request.intensity,
        custom_rainfall=request.custom_rainfall,
        custom_moisture=request.custom_moisture,
    )


@router.post("/batch")
def simulate_batch(count: int = 5, db: Session = Depends(get_db), user: dict = Depends(require_role("admin", "field_officer", "district_admin", "citizen"))):
    """Simulate multiple landslide events across different stations."""
    results = []
    stations = db.query(SensorStation).filter(SensorStation.slope_angle > 30).all()
    if not stations:
        stations = db.query(SensorStation).all()

    intensities = ["moderate", "high", "critical", "high", "moderate"]
    for i in range(min(count, len(stations))):
        result = _run_simulation(
            db=db,
            station_id=stations[i % len(stations)].station_id,
            intensity=intensities[i % len(intensities)],
        )
        results.append(result)

    return {
        "status": "success",
        "simulations_count": len(results),
        "results": results,
    }


@router.post("/reset")
def reset_simulations(db: Session = Depends(get_db), user: dict = Depends(require_role("admin"))):
    """Reset all simulation data - clear alerts and recent readings. Admin only."""
    # Delete simulation alerts and assessments
    db.query(Alert).delete(synchronize_session=False)
    db.query(RiskAssessment).filter(RiskAssessment.model_version == "v1.0-sim").delete(synchronize_session=False)
    # Delete simulation sensor readings (keep seed readings with default model_version)
    from datetime import timedelta
    db.query(SensorReading).filter(
        SensorReading.timestamp > datetime.utcnow() - timedelta(hours=1)
    ).delete(synchronize_session=False)
    db.commit()

    return {"status": "success", "message": "All simulation data cleared."}

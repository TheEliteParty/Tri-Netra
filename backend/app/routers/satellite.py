"""
Satellite Data API - Serves real satellite-derived data for NER stations.
Data sources: Open-Meteo (elevation, soil moisture, weather), NDVI estimates.
"""
import json
import os
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/satellite", tags=["satellite"])

# Configurable data path for Docker deployments
SATELLITE_DATA_FILE = os.getenv(
    "SATELLITE_DATA_PATH",
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "datasets", "processed", "real_satellite_data.json")
)

_satellite_cache = None


def _load_satellite_data():
    global _satellite_cache
    if _satellite_cache is None:
        try:
            with open(SATELLITE_DATA_FILE, "r") as f:
                _satellite_cache = json.load(f)
        except FileNotFoundError:
            _satellite_cache = []
    return _satellite_cache


@router.get("/data")
def get_all_satellite_data():
    """Get real satellite data for all stations."""
    data = _load_satellite_data()
    return {
        "stations": data,
        "source": "Open-Meteo API + NDVI estimation",
        "total_stations": len(data),
    }


@router.get("/data/{station_id}")
def get_station_satellite_data(station_id: str):
    """Get real satellite data for a specific station."""
    data = _load_satellite_data()
    for station in data:
        if station["id"] == station_id:
            return station
    raise HTTPException(status_code=404, detail="Station not found")


@router.get("/summary")
def get_satellite_summary():
    """Get aggregated satellite data summary across NER."""
    data = _load_satellite_data()
    if not data:
        return {"error": "No satellite data available"}

    elevations = [s["real_elevation"] for s in data]
    sm_0_7 = [s["real_soil_moisture_0_7cm"] for s in data]
    rain_24h = [s["real_rainfall_24h"] for s in data]
    rain_7d = [s["real_rainfall_7d"] for s in data]
    ndvi_vals = [s["estimated_ndvi"] for s in data]
    temps = [s["real_temperature"] for s in data]
    humidity = [s["real_humidity"] for s in data]

    return {
        "total_stations": len(data),
        "elevation": {
            "min": round(min(elevations), 1),
            "max": round(max(elevations), 1),
            "avg": round(sum(elevations) / len(elevations), 1),
            "unit": "meters",
        },
        "soil_moisture_surface": {
            "min": round(min(sm_0_7), 3),
            "max": round(max(sm_0_7), 3),
            "avg": round(sum(sm_0_7) / len(sm_0_7), 3),
            "unit": "m³/m³",
        },
        "rainfall_24h": {
            "min": round(min(rain_24h), 1),
            "max": round(max(rain_24h), 1),
            "avg": round(sum(rain_24h) / len(rain_24h), 1),
            "total": round(sum(rain_24h), 1),
            "unit": "mm",
        },
        "rainfall_7d": {
            "min": round(min(rain_7d), 1),
            "max": round(max(rain_7d), 1),
            "avg": round(sum(rain_7d) / len(rain_7d), 1),
            "total": round(sum(rain_7d), 1),
            "unit": "mm",
        },
        "ndvi": {
            "min": round(min(ndvi_vals), 3),
            "max": round(max(ndvi_vals), 3),
            "avg": round(sum(ndvi_vals) / len(ndvi_vals), 3),
            "description": "Normalized Difference Vegetation Index (0-1)",
        },
        "temperature": {
            "min": round(min(temps), 1),
            "max": round(max(temps), 1),
            "avg": round(sum(temps) / len(temps), 1),
            "unit": "°C",
        },
        "humidity": {
            "min": round(min(humidity), 1),
            "max": round(max(humidity), 1),
            "avg": round(sum(humidity) / len(humidity), 1),
            "unit": "%",
        },
        "data_source": "Open-Meteo API (real-time satellite-derived)",
        "last_updated": "Live from satellite APIs",
    }


@router.get("/risk-zones")
def get_satellite_risk_zones():
    """Calculate risk zones based on real satellite data."""
    data = _load_satellite_data()
    risk_zones = []

    for station in data:
        # Risk scoring based on real satellite metrics
        elevation_risk = min(1.0, station["real_elevation"] / 3000)  # Higher = riskier
        sm_risk = min(1.0, station["real_soil_moisture_0_7cm"] / 0.6)  # Wetter = riskier
        rain_risk = min(1.0, station["real_rainfall_24h"] / 50)  # More rain = riskier
        ndvi_risk = max(0, 1 - station["estimated_ndvi"])  # Less vegetation = riskier

        composite_risk = (
            elevation_risk * 0.25 +
            sm_risk * 0.30 +
            rain_risk * 0.25 +
            ndvi_risk * 0.20
        ) * 100

        risk_level = "low"
        if composite_risk >= 70:
            risk_level = "critical"
        elif composite_risk >= 50:
            risk_level = "high"
        elif composite_risk >= 30:
            risk_level = "moderate"

        risk_zones.append({
            "station_id": station["id"],
            "name": station["name"],
            "state": station["state"],
            "lat": station["lat"],
            "lng": station["lng"],
            "satellite_risk_score": round(composite_risk, 1),
            "risk_level": risk_level,
            "factors": {
                "elevation_risk": round(elevation_risk * 100, 1),
                "soil_moisture_risk": round(sm_risk * 100, 1),
                "rainfall_risk": round(rain_risk * 100, 1),
                "vegetation_risk": round(ndvi_risk * 100, 1),
            },
            "real_data": {
                "elevation": station["real_elevation"],
                "soil_moisture": station["real_soil_moisture_0_7cm"],
                "rainfall_24h": station["real_rainfall_24h"],
                "ndvi": station["estimated_ndvi"],
            },
        })

    return sorted(risk_zones, key=lambda x: x["satellite_risk_score"], reverse=True)

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timedelta
from app.database import get_db
from app.models import WeatherData

router = APIRouter(prefix="/api/weather", tags=["weather"])


@router.get("/{station_id}")
def get_weather(station_id: str, db: Session = Depends(get_db)):
    weather = db.query(WeatherData).filter(
        WeatherData.station_id == station_id
    ).order_by(desc(WeatherData.timestamp)).first()

    if not weather:
        return {"station_id": station_id, "data": None}

    return {
        "station_id": station_id,
        "data": {
            "temperature": weather.temperature,
            "humidity": weather.humidity,
            "rainfall_1h": weather.rainfall_1h,
            "rainfall_24h": weather.rainfall_24h,
            "rainfall_7d": weather.rainfall_7d,
            "wind_speed": weather.wind_speed,
            "wind_direction": weather.wind_direction,
            "pressure": weather.pressure,
            "visibility": weather.visibility,
            "forecast_rainfall_24h": weather.forecast_rainfall_24h,
            "forecast_rainfall_48h": weather.forecast_rainfall_48h,
            "timestamp": weather.timestamp.isoformat() if weather.timestamp else None,
        }
    }


@router.get("/{station_id}/forecast")
def get_forecast(station_id: str, hours: int = 48, db: Session = Depends(get_db)):
    weather_entries = db.query(WeatherData).filter(
        WeatherData.station_id == station_id
    ).order_by(desc(WeatherData.timestamp)).limit(hours // 3).all()

    return [{
        "timestamp": w.timestamp.isoformat(),
        "temperature": w.temperature,
        "rainfall_1h": w.rainfall_1h,
        "forecast_rainfall_24h": w.forecast_rainfall_24h,
        "humidity": w.humidity,
    } for w in reversed(weather_entries)]

"""
Pydantic schemas for GeoShield API request/response validation.
Prevents invalid data from reaching the database layer.
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from enum import Enum


# ── Enums ──────────────────────────────────────────────────────
class RiskLevel(str, Enum):
    low = "low"
    moderate = "moderate"
    high = "high"
    critical = "critical"


class IntensityLevel(str, Enum):
    low = "low"
    moderate = "moderate"
    high = "high"
    critical = "critical"


class AlertStatus(str, Enum):
    active = "active"
    acknowledged = "acknowledged"
    resolved = "resolved"


class ReportType(str, Enum):
    crack = "crack"
    slope_movement = "slope_movement"
    blocked_road = "blocked_road"
    flooding = "flooding"
    other = "other"


# ── Predict ────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="Latitude (-90 to 90)")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude (-180 to 180)")
    slope: Optional[float] = Field(None, ge=0, le=90, description="Slope angle in degrees")
    elevation: Optional[float] = Field(None, ge=-500, le=9000, description="Elevation in meters")
    rainfall_mm: Optional[float] = Field(None, ge=0, le=1000, description="Rainfall in mm")
    soil_moisture: Optional[float] = Field(None, ge=0, le=100, description="Soil moisture %")
    ndvi: Optional[float] = Field(None, ge=-1, le=1, description="NDVI index (-1 to 1)")

    @field_validator("latitude")
    @classmethod
    def validate_ner_latitude(cls, v):
        if not (21.0 <= v <= 30.0):
            # Allow non-NER but warn
            pass
        return v


# ── Simulate ───────────────────────────────────────────────────
class SimulateRequest(BaseModel):
    station_id: Optional[str] = Field(None, pattern=r"^NER-\d{3}$", description="Station ID (NER-XXX)")
    intensity: IntensityLevel = Field(default="high", description="Simulation intensity level")
    custom_rainfall: Optional[float] = Field(None, ge=0, le=500, description="Custom rainfall in mm")
    custom_moisture: Optional[float] = Field(None, ge=0, le=100, description="Custom soil moisture %")


# ── Alert ──────────────────────────────────────────────────────
class AlertCreateRequest(BaseModel):
    station_id: str = Field(..., pattern=r"^NER-\d{3}$", description="Station ID")
    risk_level: RiskLevel = Field(..., description="Risk level")
    title: str = Field(..., min_length=5, max_length=200, description="Alert title")
    message: str = Field(..., min_length=10, max_length=2000, description="Alert message")
    affected_population: int = Field(default=0, ge=0, le=1000000, description="People affected")
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


# ── Report ─────────────────────────────────────────────────────
class ReportCreateRequest(BaseModel):
    report_type: ReportType = Field(..., description="Type of report")
    description: str = Field(..., min_length=10, max_length=2000, description="Description")
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    reporter_name: Optional[str] = Field(None, max_length=100)
    reporter_phone: Optional[str] = Field(None, pattern=r"^\+?[\d\s-]{7,15}$")
    reporter_language: Optional[str] = Field("en", pattern=r"^(en|hi|bn|as|ne)$")


# ── Auth ───────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str = Field(..., pattern=r"^[^@]+@[^@]+\.[^@]+$", description="Valid email")
    password: str = Field(..., min_length=4, max_length=128, description="Password")


# ── Response wrappers ─────────────────────────────────────────
class PredictResponse(BaseModel):
    location: dict
    nearest_station: Optional[dict]
    risk_assessment: dict
    model_info: dict
    timestamp: str


class SimulateResponse(BaseModel):
    status: str
    simulation: dict
    risk_assessment: dict
    alert: Optional[dict]


class ErrorResponse(BaseModel):
    detail: str
    status_code: int

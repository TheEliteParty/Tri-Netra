"""
Enhanced Prediction API — Risk Grid, Batch Predict, District Risk, Model Training
Merged from winning reference repo (ArindamTripathi619/landslide-risk-monitoring)
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from app.ai_engine.enhanced_predictor import get_enhanced_predictor

router = APIRouter(prefix="/api/ml", tags=["ML Enhanced"])


class MLBatchRequest(BaseModel):
    """Batch prediction for multiple locations."""
    locations: List[dict]


@router.get("/health")
async def ml_health():
    """ML service health check."""
    predictor = get_enhanced_predictor()
    return {
        "status": "ok",
        "model_loaded": predictor.model_loaded,
        "model_type": "xgboost" if predictor.model_loaded else "rule_based",
        "terrain_lookup": True,
        "version": "2.0-merged",
    }


@router.get("/risk/grid")
async def get_risk_grid(
    lat_min: float = Query(21.0, ge=-90, le=90),
    lat_max: float = Query(30.0, ge=-90, le=90),
    lon_min: float = Query(88.0, ge=-180, le=180),
    lon_max: float = Query(98.0, ge=-180, le=180),
    resolution: int = Query(10, ge=5, le=30),
):
    """Generate a risk grid across the NER region using real terrain data."""
    predictor = get_enhanced_predictor()
    grid = predictor.generate_risk_grid(lat_min, lat_max, lon_min, lon_max, resolution)
    return grid


@router.get("/risk/district/{district}")
async def get_district_risk(district: str):
    """Get aggregated risk assessment for a NER district."""
    predictor = get_enhanced_predictor()
    result = predictor.get_district_risk(district)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.post("/predict")
async def ml_predict(request: dict):
    """Predict landslide risk for a single location with terrain enrichment."""
    lat = request.get("latitude", request.get("lat", 0))
    lng = request.get("longitude", request.get("lng", 0))
    if not lat or not lng:
        raise HTTPException(status_code=422, detail="latitude and longitude are required")

    features = {k: v for k, v in request.items() if k not in ("latitude", "longitude", "lat", "lng")}
    predictor = get_enhanced_predictor()
    result = predictor.predict(lat, lng, features)
    return result


@router.post("/predict/batch")
async def ml_predict_batch(request: MLBatchRequest):
    """Predict risk for multiple locations."""
    predictor = get_enhanced_predictor()
    predictions = []
    for loc in request.locations:
        lat = loc.get("latitude", loc.get("lat", 0))
        lng = loc.get("longitude", loc.get("lng", 0))
        features = {k: v for k, v in loc.items() if k not in ("latitude", "longitude", "lat", "lng")}
        result = predictor.predict(lat, lng, features)
        predictions.append(result)
    return {"predictions": predictions, "count": len(predictions)}


@router.post("/train")
async def train_model(csv_path: Optional[str] = None):
    """Train or retrain the XGBoost prediction model."""
    predictor = get_enhanced_predictor()
    result = predictor.train(csv_path)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return {"message": "Model trained successfully", "details": result}

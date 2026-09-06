from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from app.database import get_db
from app.models import Alert, SensorStation
from app.auth import get_current_user, require_role
from app.websocket_manager import publish_alert_event

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("")
def get_alerts(
    status: str = None,
    risk_level: str = None,
    lang: str = "en",
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(Alert)
    if status:
        query = query.filter(Alert.status == status)
    if risk_level:
        query = query.filter(Alert.risk_level == risk_level)

    alerts = query.order_by(desc(Alert.created_at)).limit(limit).all()

    from app.translations import translate_alert
    return [{
        "id": a.id,
        "station_id": a.station_id,
        "risk_level": a.risk_level,
        "title": translate_alert(a.title, a.message, lang)[0],
        "message": translate_alert(a.title, a.message, lang)[1],
        "status": a.status,
        "affected_population": a.affected_population,
        "latitude": a.latitude,
        "longitude": a.longitude,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "acknowledged_at": a.acknowledged_at.isoformat() if a.acknowledged_at else None,
    } for a in alerts]


@router.get("/active")
def get_active_alerts(lang: str = "en", db: Session = Depends(get_db)):
    alerts = db.query(Alert).filter(
        Alert.status == "active"
    ).order_by(desc(Alert.created_at)).all()

    from app.translations import translate_alert
    return [{
        "id": a.id,
        "station_id": a.station_id,
        "risk_level": a.risk_level,
        "title": translate_alert(a.title, a.message, lang)[0],
        "message": translate_alert(a.title, a.message, lang)[1],
        "affected_population": a.affected_population,
        "latitude": a.latitude,
        "longitude": a.longitude,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    } for a in alerts]


def _alert_event_payload(alert: Alert) -> dict:
    return {
        "id": alert.id,
        "station_id": alert.station_id,
        "risk_level": alert.risk_level,
        "title": alert.title,
        "message": alert.message,
        "status": alert.status,
        "affected_population": alert.affected_population,
        "latitude": alert.latitude,
        "longitude": alert.longitude,
        "created_at": alert.created_at.isoformat() if alert.created_at else None,
        "acknowledged_at": alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
        "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None,
    }


def _station_district(db: Session, station_id: str) -> str:
    station = db.query(SensorStation).filter(SensorStation.station_id == station_id).first()
    return station.district if station and station.district else "all"


@router.put("/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: int, db: Session = Depends(get_db), user: dict = Depends(require_role("admin", "field_officer", "district_admin"))):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "acknowledged"
    alert.acknowledged_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)
    await publish_alert_event("alert.updated", _alert_event_payload(alert), district=_station_district(db, alert.station_id))
    return {"message": "Alert acknowledged", "id": alert_id}


@router.put("/{alert_id}/resolve")
async def resolve_alert(alert_id: int, db: Session = Depends(get_db), user: dict = Depends(require_role("admin"))):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "resolved"
    alert.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)
    await publish_alert_event("alert.updated", _alert_event_payload(alert), district=_station_district(db, alert.station_id))
    return {"message": "Alert resolved", "id": alert_id}


@router.get("/stats")
def get_alert_stats(db: Session = Depends(get_db)):
    from sqlalchemy import func

    total = db.query(Alert).count()
    active = db.query(Alert).filter(Alert.status == "active").count()
    acknowledged = db.query(Alert).filter(Alert.status == "acknowledged").count()
    resolved = db.query(Alert).filter(Alert.status == "resolved").count()

    critical = db.query(Alert).filter(
        Alert.status == "active", Alert.risk_level == "critical"
    ).count()
    high = db.query(Alert).filter(
        Alert.status == "active", Alert.risk_level == "high"
    ).count()

    return {
        "total": total,
        "active": active,
        "acknowledged": acknowledged,
        "resolved": resolved,
        "critical_active": critical,
        "high_active": high,
    }

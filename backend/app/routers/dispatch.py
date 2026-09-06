from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid
import xml.etree.ElementTree as ET
from typing import Optional, List
from pydantic import BaseModel

from app.database import get_db
from app.models import Station, Alert
from app.auth import get_current_user

router = APIRouter(prefix="/api/dispatch", tags=["emergency-dispatch"])

# In-memory dispatch audit log for simulation
DISPATCH_HISTORY = [
    {
        "id": "DSP-2026-0891",
        "station_id": "UK-001",
        "station_name": "Joshimath Fissure Zone",
        "state": "Uttarakhand",
        "district": "Chamoli",
        "severity": "CRITICAL",
        "channels": ["Cell Broadcast (Ch 4370)", "WhatsApp EWS", "Voice IVR", "LoRaWAN Mesh"],
        "target_radius_km": 8.5,
        "population_reached": 18450,
        "delivery_rate_pct": 99.2,
        "avg_latency_sec": 3.4,
        "sent_at": "2026-09-06T11:45:00Z",
        "status": "DELIVERED",
        "cap_identifier": "IN-NDMA-2026-UK-0891",
        "message": "EMERGENCY EVACUATION WARNING: Active slope deformation detected in Joshimath Ward 4. Immediate evacuation to Sector 3 Shelter. Dial 1077 for NDRF rescue."
    },
    {
        "id": "DSP-2026-0890",
        "station_id": "KL-001",
        "station_name": "Meppadi / Chooralmala",
        "state": "Kerala",
        "district": "Wayanad",
        "severity": "HIGH",
        "channels": ["Cell Broadcast (Ch 4370)", "WhatsApp EWS", "Voice IVR"],
        "target_radius_km": 12.0,
        "population_reached": 24300,
        "delivery_rate_pct": 98.7,
        "avg_latency_sec": 2.8,
        "sent_at": "2026-09-06T09:20:00Z",
        "status": "DELIVERED",
        "cap_identifier": "IN-SDMA-2026-KL-0890",
        "message": "DEBRIS FLOW ALERT: Rainfall exceeded 210mm in 24h. Chooralmala riverbanks under extreme flash surge risk. Move to elevated relief camps immediately."
    },
    {
        "id": "DSP-2026-0889",
        "station_id": "NER-001",
        "station_name": "Gangtok Hill Top",
        "state": "Sikkim",
        "district": "East Sikkim",
        "severity": "WARNING",
        "channels": ["WhatsApp EWS", "SMS Gateway"],
        "target_radius_km": 5.0,
        "population_reached": 11200,
        "delivery_rate_pct": 99.5,
        "avg_latency_sec": 4.1,
        "sent_at": "2026-09-05T18:10:00Z",
        "status": "DELIVERED",
        "cap_identifier": "IN-SDMA-2026-SK-0889",
        "message": "LANDSLIDE WARNING: NH-10 corridor between Rangpo and Singtam experiencing active rockfall. Avoid non-essential vehicular travel."
    }
]

class DispatchRequest(BaseModel):
    station_id: str
    severity: str
    message: str
    target_radius_km: float = 10.0
    channels: List[str]
    language: str = "hi"
    audio_enabled: bool = True

@router.get("/history")
def get_dispatch_history():
    return {
        "status": "success",
        "total_dispatches": len(DISPATCH_HISTORY),
        "history": DISPATCH_HISTORY
    }

@router.post("/send")
def send_emergency_dispatch(payload: DispatchRequest, db: Session = Depends(get_db)):
    station = db.query(Station).filter(Station.id == payload.station_id).first()
    station_name = station.name if station else payload.station_id
    state = station.state if station else "National"
    district = station.district if station else "Zone"

    base_pop = int((payload.target_radius_km ** 2) * 314.15 * (120 if "UK" in payload.station_id or "NER" in payload.station_id else 250))
    
    new_dispatch = {
        "id": f"DSP-{datetime.now().year}-{len(DISPATCH_HISTORY) + 892}",
        "station_id": payload.station_id,
        "station_name": station_name,
        "state": state,
        "district": district,
        "severity": payload.severity.upper(),
        "channels": payload.channels,
        "target_radius_km": payload.target_radius_km,
        "population_reached": base_pop,
        "delivery_rate_pct": 99.4,
        "avg_latency_sec": 3.1,
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "status": "DELIVERED",
        "cap_identifier": f"IN-NDMA-{datetime.now().year}-{payload.station_id}-{uuid.uuid4().hex[:6].upper()}",
        "message": payload.message,
        "carrier_stats": {
            "Jio": {"delivered": int(base_pop * 0.42), "latency": "2.9s", "status": "ACK"},
            "Airtel": {"delivered": int(base_pop * 0.36), "latency": "3.1s", "status": "ACK"},
            "BSNL": {"delivered": int(base_pop * 0.14), "latency": "4.2s", "status": "ACK"},
            "Vodafone-Idea": {"delivered": int(base_pop * 0.08), "latency": "3.8s", "status": "ACK"}
        }
    }
    DISPATCH_HISTORY.insert(0, new_dispatch)
    
    return {
        "status": "success",
        "dispatch": new_dispatch,
        "confirmation": f"Emergency alert broadcast triggered successfully across {len(payload.channels)} channels to ~{base_pop:,} citizens."
    }

@router.get("/cap/{dispatch_id}")
def generate_cap_xml(dispatch_id: str):
    item = next((d for d in DISPATCH_HISTORY if d["id"] == dispatch_id), DISPATCH_HISTORY[0])
    
    root = ET.Element("alert", xmlns="urn:oasis:names:tc:emergency:cap:1.2")
    ET.SubElement(root, "identifier").text = item["cap_identifier"]
    ET.SubElement(root, "sender").text = "operations@trinetra.ndma.gov.in"
    ET.SubElement(root, "sent").text = item["sent_at"]
    ET.SubElement(root, "status").text = "Actual"
    ET.SubElement(root, "msgType").text = "Alert"
    ET.SubElement(root, "scope").text = "Public"
    
    info = ET.SubElement(root, "info")
    ET.SubElement(info, "category").text = "Geo"
    ET.SubElement(info, "event").text = f"Landslide & Slope Hazard - {item['severity']}"
    ET.SubElement(info, "urgency").text = "Immediate" if item["severity"] in ["CRITICAL", "EVACUATION"] else "Expected"
    ET.SubElement(info, "severity").text = "Extreme" if item["severity"] in ["CRITICAL", "EVACUATION"] else "Severe"
    ET.SubElement(info, "certainty").text = "Observed"
    ET.SubElement(info, "eventCode").text = "GEO-LND-01"
    ET.SubElement(info, "headline").text = f"Tri-Netra AI Landslide Alert for {item['station_name']}, {item['district']}"
    ET.SubElement(info, "description").text = item["message"]
    ET.SubElement(info, "instruction").text = "Move immediately to marked emergency shelters. Follow instructions from NDRF/SDRF local field officers."
    
    area = ET.SubElement(info, "area")
    ET.SubElement(area, "areaDesc").text = f"{item['station_name']} and surrounding {item['target_radius_km']} km geofence zone"
    ET.SubElement(area, "circle").text = f"28.5355,79.8964,{item['target_radius_km']}"
    
    xml_str = ET.tostring(root, encoding="utf-8", method="xml").decode("utf-8")
    return {
        "status": "success",
        "dispatch_id": item["id"],
        "cap_identifier": item["cap_identifier"],
        "xml": f'<?xml version="1.0" encoding="UTF-8"?>\n{xml_str}'
    }

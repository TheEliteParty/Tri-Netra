"""
Seed real satellite data & Attention-UNet segmentation assessments for PAN-INDIA.
Integrates real Open-Meteo, SRTM, and Eb3ls/landslides_segmentation deep learning pipeline
across North-Eastern Region, Western Ghats, NW Himalayas, and Eastern Ghats.
"""
import json
import os
import math
import numpy as np
from datetime import datetime, timedelta
from app.database import SessionLocal, engine, Base
from app.models import (
    SensorStation, SensorReading, RiskAssessment, Alert,
    CitizenReport, WeatherData, RoadStatus, Village
)
from app.ai_engine.landslide_segmentation import get_segmentation_engine

SATELLITE_DATA_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "datasets", "processed", "real_satellite_data.json"
)

def _load_real_satellite_map():
    if os.path.exists(SATELLITE_DATA_PATH):
        try:
            with open(SATELLITE_DATA_PATH, "r") as f:
                data = json.load(f)
                return {item["id"]: item for item in data}
        except Exception as e:
            print(f"[Seed] Warning loading real_satellite_data.json: {e}")
    return {}

# 28 Pan-India observation stations across 15 states
PAN_INDIA_STATIONS = [
    # --- North East (Himalayas & Hills) ---
    {"station_id": "NER-001", "name": "Gangtok North Slope", "lat": 27.3389, "lng": 88.6065, "state": "Sikkim", "district": "Gangtok", "village": "Tadong", "elevation": 1487, "slope_angle": 38, "soil_type": "silty_clay", "veg": 45},
    {"station_id": "NER-002", "name": "Mangan Hill Monitor", "lat": 27.5124, "lng": 88.5281, "state": "Sikkim", "district": "Mangan", "village": "Mangan", "elevation": 796, "slope_angle": 42, "soil_type": "weathered_gneiss", "veg": 35},
    {"station_id": "NER-003", "name": "Namchi Valley Watch", "lat": 27.1684, "lng": 88.5510, "state": "Sikkim", "district": "Namchi", "village": "Namchi", "elevation": 814, "slope_angle": 35, "soil_type": "clay_loam", "veg": 55},
    {"station_id": "NER-004", "name": "Guwahati Foothills", "lat": 26.1445, "lng": 91.7362, "state": "Assam", "district": "Kamrup", "village": "Chandrapur", "elevation": 52, "slope_angle": 28, "soil_type": "alluvial", "veg": 40},
    {"station_id": "NER-005", "name": "Karbi Anglong Slope", "lat": 26.1000, "lng": 93.2000, "state": "Assam", "district": "Karbi Anglong", "village": "Diphu", "elevation": 185, "slope_angle": 32, "soil_type": "laterite", "veg": 50},
    {"station_id": "NER-006", "name": "Shillong Peak Sensor", "lat": 25.5788, "lng": 91.8933, "state": "Meghalaya", "district": "East Khasi Hills", "village": "Mawlynnong", "elevation": 1961, "slope_angle": 34, "soil_type": "sandstone_weathered", "veg": 65},
    {"station_id": "NER-007", "name": "Cherrapunji Escarpment", "lat": 25.2700, "lng": 91.7300, "state": "Meghalaya", "district": "East Khasi Hills", "village": "Cherrapunji", "elevation": 1430, "slope_angle": 40, "soil_type": "sandstone", "veg": 52},
    {"station_id": "NER-008", "name": "Aizawl Ridge Monitor", "lat": 23.7271, "lng": 92.7176, "state": "Mizoram", "district": "Aizawl", "village": "Aizawl", "elevation": 1132, "slope_angle": 44, "soil_type": "sandstone_shale", "veg": 38},
    {"station_id": "NER-009", "name": "Kohima Highland Pass", "lat": 25.6700, "lng": 94.1100, "state": "Nagaland", "district": "Kohima", "village": "Kohima", "elevation": 1444, "slope_angle": 36, "soil_type": "weathered_shale", "veg": 44},
    {"station_id": "NER-010", "name": "Tawang Ridge", "lat": 27.5860, "lng": 91.8800, "state": "Arunachal Pradesh", "district": "Tawang", "village": "Tawang", "elevation": 3048, "slope_angle": 48, "soil_type": "glacial_till", "veg": 25},
    {"station_id": "NER-011", "name": "Itanagar Hills", "lat": 27.0844, "lng": 93.6053, "state": "Arunachal Pradesh", "district": "Papum Pare", "village": "Itanagar", "elevation": 320, "slope_angle": 31, "soil_type": "forest_loam", "veg": 67},
    {"station_id": "NER-012", "name": "Dima Hasao Watch", "lat": 25.1700, "lng": 93.0200, "state": "Assam", "district": "Dima Hasao", "village": "Haflong", "elevation": 680, "slope_angle": 41, "soil_type": "sandstone_residue", "veg": 42},

    # --- Western Ghats & Konkan (Kerala, Maharashtra, Karnataka, Tamil Nadu) ---
    {"station_id": "WG-001", "name": "Wayanad Meppadi Basin", "lat": 11.5542, "lng": 76.1320, "state": "Kerala", "district": "Wayanad", "village": "Meppadi", "elevation": 780, "slope_angle": 39, "soil_type": "laterite_clay", "veg": 61},
    {"station_id": "WG-002", "name": "Munnar Tea Ridge", "lat": 10.0889, "lng": 77.0595, "state": "Kerala", "district": "Idukki", "village": "Munnar", "elevation": 1532, "slope_angle": 41, "soil_type": "loamy_peat", "veg": 63},
    {"station_id": "WG-003", "name": "Mahabaleshwar Western Cliff", "lat": 17.9237, "lng": 73.6586, "state": "Maharashtra", "district": "Satara", "village": "Mahabaleshwar", "elevation": 1353, "slope_angle": 43, "soil_type": "basalt_laterite", "veg": 57},
    {"station_id": "WG-004", "name": "Raigad Mahad Escarpment", "lat": 18.2356, "lng": 73.4478, "state": "Maharashtra", "district": "Raigad", "village": "Mahad", "elevation": 450, "slope_angle": 38, "soil_type": "decomposed_trap", "veg": 54},
    {"station_id": "WG-005", "name": "Nilgiris Ooty High Slope", "lat": 11.4102, "lng": 76.6950, "state": "Tamil Nadu", "district": "Nilgiris", "village": "Ooty", "elevation": 2240, "slope_angle": 36, "soil_type": "charnockite_loam", "veg": 66},
    {"station_id": "WG-006", "name": "Kodagu Madikeri Catchment", "lat": 12.4244, "lng": 75.7382, "state": "Karnataka", "district": "Kodagu", "village": "Madikeri", "elevation": 1060, "slope_angle": 35, "soil_type": "red_lateritic", "veg": 64},
    {"station_id": "WG-007", "name": "Valparai Anamalai Corridor", "lat": 10.3256, "lng": 76.9558, "state": "Tamil Nadu", "district": "Coimbatore", "village": "Valparai", "elevation": 1190, "slope_angle": 37, "soil_type": "granitic_clay", "veg": 65},

    # --- North-Western Himalayas (Uttarakhand, Himachal Pradesh, Jammu & Kashmir) ---
    {"station_id": "NWH-001", "name": "Joshimath Subsidence Monitor", "lat": 30.5564, "lng": 79.5667, "state": "Uttarakhand", "district": "Chamoli", "village": "Joshimath", "elevation": 1890, "slope_angle": 45, "soil_type": "morainic_debris", "veg": 49},
    {"station_id": "NWH-002", "name": "Kedarnath Mandakini Gorge", "lat": 30.7352, "lng": 79.0669, "state": "Uttarakhand", "district": "Rudraprayag", "village": "Kedarnath", "elevation": 3583, "slope_angle": 49, "soil_type": "glacial_scree", "veg": 38},
    {"station_id": "NWH-003", "name": "Mandi Beas Basin", "lat": 31.7087, "lng": 76.9320, "state": "Himachal Pradesh", "district": "Mandi", "village": "Mandi", "elevation": 760, "slope_angle": 39, "soil_type": "fluvial_silt", "veg": 58},
    {"station_id": "NWH-004", "name": "Shimla Mall Ridge", "lat": 31.1048, "lng": 77.1734, "state": "Himachal Pradesh", "district": "Shimla", "village": "Shimla", "elevation": 2206, "slope_angle": 37, "soil_type": "phyllitic_schist", "veg": 61},
    {"station_id": "NWH-005", "name": "Kullu Manali Valley", "lat": 31.9579, "lng": 77.1095, "state": "Himachal Pradesh", "district": "Kullu", "village": "Manali", "elevation": 1279, "slope_angle": 42, "soil_type": "alluvial_boulders", "veg": 59},
    {"station_id": "NWH-006", "name": "Ramban NH-44 Landslide Zone", "lat": 33.2425, "lng": 75.2415, "state": "Jammu & Kashmir", "district": "Ramban", "village": "Ramban", "elevation": 1156, "slope_angle": 46, "soil_type": "sheared_shale", "veg": 52},
    {"station_id": "NWH-007", "name": "Dharamshala Kangra Slope", "lat": 32.2190, "lng": 76.3234, "state": "Himachal Pradesh", "district": "Kangra", "village": "Dharamshala", "elevation": 1457, "slope_angle": 40, "soil_type": "sandstone_clay", "veg": 62},

    # --- Eastern Ghats & Central Uplands (Odisha, Andhra Pradesh) ---
    {"station_id": "EG-001", "name": "Koraput Deomali Peak", "lat": 18.8135, "lng": 82.7118, "state": "Odisha", "district": "Koraput", "village": "Deomali", "elevation": 870, "slope_angle": 34, "soil_type": "khondalite_laterite", "veg": 58},
    {"station_id": "EG-002", "name": "Araku Valley Ridge", "lat": 18.3273, "lng": 82.8775, "state": "Andhra Pradesh", "district": "Alluri Sitharama Raju", "village": "Araku", "elevation": 910, "slope_angle": 33, "soil_type": "red_sandy_clay", "veg": 60}
]

PAN_INDIA_VILLAGES = [
    # North East
    {"name": "Gangtok", "state": "Sikkim", "district": "Gangtok", "lat": 27.3389, "lng": 88.6065, "pop": 100000, "risk": "medium_risk", "hosp_km": 2, "police_km": 1},
    {"name": "Mangan", "state": "Sikkim", "district": "Mangan", "lat": 27.5124, "lng": 88.5281, "pop": 5000, "risk": "high_risk", "hosp_km": 12, "police_km": 8},
    {"name": "Namchi", "state": "Sikkim", "district": "Namchi", "lat": 27.1684, "lng": 88.5510, "pop": 10000, "risk": "medium_risk", "hosp_km": 8, "police_km": 5},
    {"name": "Cherrapunji", "state": "Meghalaya", "district": "East Khasi Hills", "lat": 25.2838, "lng": 91.7344, "pop": 14000, "risk": "high_risk", "hosp_km": 10, "police_km": 6},
    {"name": "Aizawl", "state": "Mizoram", "district": "Aizawl", "lat": 23.7271, "lng": 92.7176, "pop": 300000, "risk": "medium_risk", "hosp_km": 1, "police_km": 1},
    {"name": "Kohima", "state": "Nagaland", "district": "Kohima", "lat": 25.6586, "lng": 94.1086, "pop": 100000, "risk": "medium_risk", "hosp_km": 2, "police_km": 1},
    {"name": "Tawang", "state": "Arunachal Pradesh", "district": "Tawang", "lat": 27.5860, "lng": 91.8800, "pop": 12000, "risk": "high_risk", "hosp_km": 15, "police_km": 5},
    {"name": "Haflong", "state": "Assam", "district": "Dima Hasao", "lat": 25.4500, "lng": 93.1800, "pop": 15000, "risk": "high_risk", "hosp_km": 10, "police_km": 5},

    # Western Ghats
    {"name": "Chooralmala & Meppadi", "state": "Kerala", "district": "Wayanad", "lat": 11.5542, "lng": 76.1320, "pop": 18500, "risk": "high_risk", "hosp_km": 6, "police_km": 4},
    {"name": "Munnar", "state": "Kerala", "district": "Idukki", "lat": 10.0889, "lng": 77.0595, "pop": 32000, "risk": "high_risk", "hosp_km": 4, "police_km": 2},
    {"name": "Mahabaleshwar", "state": "Maharashtra", "district": "Satara", "lat": 17.9237, "lng": 73.6586, "pop": 14000, "risk": "high_risk", "hosp_km": 5, "police_km": 3},
    {"name": "Mahad", "state": "Maharashtra", "district": "Raigad", "lat": 18.2356, "lng": 73.4478, "pop": 25000, "risk": "high_risk", "hosp_km": 3, "police_km": 2},
    {"name": "Ooty", "state": "Tamil Nadu", "district": "Nilgiris", "lat": 11.4102, "lng": 76.6950, "pop": 88000, "risk": "medium_risk", "hosp_km": 2, "police_km": 1},
    {"name": "Madikeri", "state": "Karnataka", "district": "Kodagu", "lat": 12.4244, "lng": 75.7382, "pop": 35000, "risk": "medium_risk", "hosp_km": 3, "police_km": 2},

    # NW Himalayas
    {"name": "Joshimath", "state": "Uttarakhand", "district": "Chamoli", "lat": 30.5564, "lng": 79.5667, "pop": 16000, "risk": "high_risk", "hosp_km": 4, "police_km": 2},
    {"name": "Kedarnath", "state": "Uttarakhand", "district": "Rudraprayag", "lat": 30.7352, "lng": 79.0669, "pop": 4500, "risk": "high_risk", "hosp_km": 14, "police_km": 6},
    {"name": "Mandi", "state": "Himachal Pradesh", "district": "Mandi", "lat": 31.7087, "lng": 76.9320, "pop": 27000, "risk": "high_risk", "hosp_km": 2, "police_km": 1},
    {"name": "Shimla", "state": "Himachal Pradesh", "district": "Shimla", "lat": 31.1048, "lng": 77.1734, "pop": 170000, "risk": "medium_risk", "hosp_km": 1, "police_km": 1},
    {"name": "Ramban", "state": "Jammu & Kashmir", "district": "Ramban", "lat": 33.2425, "lng": 75.2415, "pop": 12000, "risk": "high_risk", "hosp_km": 5, "police_km": 3},
]

PAN_INDIA_ROADS = [
    # North East Corridors
    {"name": "NH-10 (Siliguri-Gangtok)", "type": "national_highway", "slat": 26.72, "slng": 88.39, "elat": 27.34, "elng": 88.61, "status": "open"},
    {"name": "NH-510 (Singtam-Mangan)", "type": "national_highway", "slat": 27.22, "slng": 88.51, "elat": 27.51, "elng": 88.53, "status": "partially_blocked"},
    {"name": "NH-13 (Bomdila-Tawang)", "type": "national_highway", "slat": 27.25, "slng": 92.42, "elat": 27.59, "elng": 91.88, "status": "partially_blocked"},
    {"name": "NH-29 (Guwahati-Shillong)", "type": "national_highway", "slat": 26.14, "slng": 91.74, "elat": 25.58, "elng": 91.89, "status": "open"},
    {"name": "NH-54 (Aizawl-Lunglei)", "type": "national_highway", "slat": 23.73, "slng": 92.72, "elat": 22.90, "elng": 92.75, "status": "blocked"},
    {"name": "NH-2 (Dimapur-Kohima)", "type": "national_highway", "slat": 25.90, "slng": 93.73, "elat": 25.66, "elng": 94.11, "status": "open"},

    # Western Ghats Corridors
    {"name": "NH-766 (Kozhikode-Wayanad-Kollegal)", "type": "national_highway", "slat": 11.25, "slng": 75.78, "elat": 11.68, "elng": 76.13, "status": "partially_blocked"},
    {"name": "NH-85 (Kochi-Munnar-Dhanushkodi)", "type": "national_highway", "slat": 9.93, "slng": 76.26, "elat": 10.08, "elng": 77.06, "status": "partially_blocked"},
    {"name": "NH-66 (Mumbai-Goa-Kochi via Mahad)", "type": "national_highway", "slat": 18.23, "slng": 73.44, "elat": 17.92, "elng": 73.65, "status": "open"},
    {"name": "NH-181 (Gudalur-Ooty Ghats)", "type": "national_highway", "slat": 11.50, "slng": 76.49, "elat": 11.41, "elng": 76.69, "status": "open"},
    {"name": "NH-275 (Bengaluru-Madikeri-Mangaluru)", "type": "national_highway", "slat": 12.30, "slng": 76.65, "elat": 12.42, "elng": 75.73, "status": "open"},

    # NW Himalayas Corridors
    {"name": "NH-7 (Rishikesh-Chamoli-Badrinath)", "type": "national_highway", "slat": 30.10, "slng": 78.29, "elat": 30.55, "elng": 79.56, "status": "partially_blocked"},
    {"name": "NH-107 (Rudraprayag-Guptkashi-Kedarnath)", "type": "national_highway", "slat": 30.28, "slng": 78.98, "elat": 30.73, "elng": 79.06, "status": "blocked"},
    {"name": "NH-3 (Chandigarh-Mandi-Manali)", "type": "national_highway", "slat": 30.73, "slng": 76.78, "elat": 31.95, "elng": 77.10, "status": "partially_blocked"},
    {"name": "NH-5 (Kalka-Shimla Express)", "type": "national_highway", "slat": 30.83, "slng": 76.93, "elat": 31.10, "elng": 77.17, "status": "open"},
    {"name": "NH-44 (Jammu-Ramban-Srinagar)", "type": "national_highway", "slat": 32.72, "slng": 74.85, "elat": 33.24, "elng": 75.24, "status": "partially_blocked"},
]

def _generate_real_satellite_reading(station: dict, sat_data: dict, hours_ago: int = 0):
    now = datetime.now() - timedelta(hours=hours_ago)
    base_rain_24h = sat_data.get("real_rainfall_24h", 25.0)
    raw_sm = sat_data.get("real_soil_moisture_0_7cm", 0.40)
    base_sm = (raw_sm * 100.0) if raw_sm <= 1.0 else raw_sm
    base_temp = sat_data.get("real_soil_temperature") or sat_data.get("real_temperature", 24.0)
    slope = station.get("slope_angle", 35.0)

    phase = (hours_ago / 24.0) * 2 * math.pi
    rain_hourly = max(0.0, (base_rain_24h / 12.0) * (1.0 + 0.8 * math.sin(phase)))
    moisture = round(min(100.0, max(15.0, base_sm + (rain_hourly * 0.35) - (hours_ago * 0.05))), 1)

    pore_pressure = round(min(120.0, max(5.0, moisture * 0.65 + rain_hourly * 0.4)), 1)
    disp_factor = math.tan(math.radians(slope)) * (moisture / 100.0)
    ground_disp = round(disp_factor * 1.5 + (rain_hourly * 0.04), 2)
    tilt_x = round(math.sin(phase) * (slope / 45.0) * 0.4, 2)
    tilt_y = round(math.cos(phase) * (slope / 45.0) * 0.3, 2)
    vibration = round(abs(math.sin(phase * 2) * 8.0 + (rain_hourly * 0.5)), 1)

    return {
        "station_id": station["station_id"],
        "rainfall_mm": round(rain_hourly, 1),
        "soil_moisture": moisture,
        "soil_temperature": round(base_temp + math.cos(phase) * 2.5, 1),
        "ground_displacement": ground_disp,
        "tilt_angle_x": tilt_x,
        "tilt_angle_y": tilt_y,
        "pore_water_pressure": pore_pressure,
        "vibration_level": vibration,
        "timestamp": now,
    }

def seed_database(force: bool = False):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        managed_models = (
            Alert, RiskAssessment, SensorReading, WeatherData, RoadStatus,
            Village, CitizenReport, SensorStation,
        )
        if not force and any(db.query(model).first() is not None for model in managed_models):
            print("[Seed] Existing application data found; safe seed skipped.")
            return

        sat_map = _load_real_satellite_map()
        seg_engine = get_segmentation_engine()
        print("[Seed] Refreshing database with seeded station telemetry and prototype heuristic assessments...")
        if force:
            for model in managed_models:
                db.query(model).delete()
            db.commit()

        print(f"[Seed] 🛰️  Seeding {len(PAN_INDIA_STATIONS)} Pan-India sensor stations with SRTM elevation...")
        for s in PAN_INDIA_STATIONS:
            sat_info = sat_map.get(s["station_id"], {})
            elev = sat_info.get("real_elevation") or s["elevation"]
            raw_sm = sat_info.get("real_soil_moisture_0_7cm", 0.40)
            sm = (raw_sm * 100.0) if raw_sm <= 1.0 else raw_sm

            station = SensorStation(
                station_id=s["station_id"],
                name=s["name"],
                latitude=s["lat"],
                longitude=s["lng"],
                state=s["state"],
                district=s["district"],
                village=s["village"],
                elevation=elev,
                slope_angle=s["slope_angle"],
                soil_type=s["soil_type"],
                vegetation_cover=sat_info.get("estimated_ndvi", 0.55) * 100.0,
                is_active=True,
            )
            db.add(station)
        db.commit()

        print(f"[Seed] 🏘️  Seeding {len(PAN_INDIA_VILLAGES)} nationwide population centers & disaster safe zones...")
        for v in PAN_INDIA_VILLAGES:
            village = Village(
                name=v["name"],
                state=v["state"],
                district=v["district"],
                latitude=v["lat"],
                longitude=v["lng"],
                population=v["pop"],
                risk_zone=v["risk"],
                nearest_hospital_km=v["hosp_km"],
                nearest_police_km=v["police_km"],
            )
            db.add(village)
        db.commit()

        print(f"[Seed] 🛣️  Seeding {len(PAN_INDIA_ROADS)} national highway corridors across India...")
        for r in PAN_INDIA_ROADS:
            road = RoadStatus(
                road_name=r["name"],
                road_type=r["type"],
                start_lat=r["slat"],
                start_lng=r["slng"],
                end_lat=r["elat"],
                end_lng=r["elng"],
                status=r["status"],
                blockage_reason="Debris on slope" if r["status"] == "blocked" else ("High soil saturation" if r["status"] == "partially_blocked" else None),
                alternative_route="Detour via safe corridor" if r["status"] in ("blocked", "partially_blocked") else None,
            )
            db.add(road)
        db.commit()

        print("[Seed] 📊 Seeding physical sensor readings (7-day time series)...")
        readings = []
        for s in PAN_INDIA_STATIONS:
            sat_info = sat_map.get(s["station_id"], {})
            for hours_ago in range(0, 168, 1):
                readings.append(_generate_real_satellite_reading(s, sat_info, hours_ago))
                if len(readings) >= 1000:
                    db.bulk_insert_mappings(SensorReading, readings)
                    db.commit()
                    readings = []
        if readings:
            db.bulk_insert_mappings(SensorReading, readings)
            db.commit()

        print("[Seed] 🌦️  Seeding real meteorological weather records from Open-Meteo...")
        for s in PAN_INDIA_STATIONS:
            sat_info = sat_map.get(s["station_id"], {})
            temp = sat_info.get("real_temperature", 24.5)
            humidity = sat_info.get("real_humidity", 80.0)
            rain_24h = sat_info.get("real_rainfall_24h", 25.0)
            rain_7d = sat_info.get("real_rainfall_7d", 65.0)
            pressure = sat_info.get("real_pressure", 950.0)
            wind = sat_info.get("real_wind_speed", 3.0)

            for hours_ago in range(0, 168, 3):
                now = datetime.now() - timedelta(hours=hours_ago)
                weather = WeatherData(
                    station_id=s["station_id"],
                    temperature=round(temp + math.cos(hours_ago / 12.0) * 3.0, 1),
                    humidity=round(min(99.0, max(50.0, humidity + math.sin(hours_ago / 12.0) * 10.0)), 1),
                    rainfall_1h=round(max(0.0, rain_24h / 24.0 * (1 + math.sin(hours_ago / 6.0))), 1),
                    rainfall_24h=round(rain_24h, 1),
                    rainfall_7d=round(rain_7d, 1),
                    wind_speed=round(wind, 1),
                    wind_direction=180.0,
                    pressure=round(pressure, 1),
                    visibility=10.0,
                    forecast_rainfall_24h=round(rain_24h * 1.1, 1),
                    forecast_rainfall_48h=round(rain_24h * 1.8, 1),
                    timestamp=now,
                )
                db.add(weather)
        db.commit()

        print("[Seed] 🧠 Seeding prototype heuristic landslide risk assessments...")
        for s in PAN_INDIA_STATIONS:
            sat_info = sat_map.get(s["station_id"], {})
            slope = s["slope_angle"]
            ndvi = sat_info.get("estimated_ndvi", 0.55)
            raw_sm = sat_info.get("real_soil_moisture_0_7cm", 0.45)
            sm = (raw_sm * 100.0) if raw_sm <= 1.0 else raw_sm
            rain = sat_info.get("real_rainfall_24h", 30.0)

            seg_res = seg_engine.run_inference_on_station(
                station_id=s["station_id"],
                station_name=s['name'],
                lat=s["lat"],
                lng=s["lng"],
                slope_angle=slope,
                ndvi=ndvi,
                soil_moisture=sm,
                rainfall_24h=rain
            )

            cov = seg_res["segmentation_results"]["coverage_percent"]
            score = round(min(100.0, cov * 2.2 + slope * 0.6 + rain * 0.4), 1)
            
            if score >= 75 or cov > 25:
                tier = "critical"
            elif score >= 50 or cov > 12:
                tier = "high"
            elif score >= 25 or cov > 5:
                tier = "moderate"
            else:
                tier = "low"

            assessment = RiskAssessment(
                station_id=s["station_id"],
                risk_level=tier,
                risk_score=score,
                landslide_probability=round(float(seg_res["segmentation_results"]["max_probability"]), 3),
                contributing_factors=json.dumps([
                    f"Slope angle: {slope} deg (SRTM DEM)",
                    f"24h Precipitation: {rain} mm (Open-Meteo)",
                    f"Soil Moisture: {round(sm, 1)}%",
                    f"Canopy NDVI: {round(ndvi, 2)}",
                    f"Prototype heuristic hazard area: {seg_res['segmentation_results']['hazard_area_m2']} m2"
                ]),
                recommendation=(
                    "CRITICAL: Immediate slope stabilization and district emergency mobilization required."
                    if tier == "critical" else (
                        "HIGH RISK: Monitor geophones, inspect drainage and alert local authorities."
                        if tier == "high" else "NORMAL: Routine satellite telemetry and continuous monitoring."
                    )
                ),
                predicted_time_window=24,
                model_version="prototype-heuristic-mask-v1",
                timestamp=datetime.now(),
            )
            db.add(assessment)
            db.flush()

            if tier in ("critical", "high"):
                matching_villages = [v for v in PAN_INDIA_VILLAGES if v.get("district") == s.get("district")]
                pop = sum(v["pop"] for v in matching_villages) if matching_villages else (18500 if tier == "critical" else 6200)
                
                alert = Alert(
                    station_id=s["station_id"],
                    risk_level=tier,
                    title=f"{tier.upper()} Landslide Hazard Alert - {s['name']}",
                    message=f"Prototype heuristic estimated {seg_res['segmentation_results']['hazard_area_m2']} m² illustrative hazard area with {score}/100 composite risk index (Slope: {slope}°, Rain: {rain}mm/24h).",
                    status="active",
                    affected_population=pop,
                    latitude=s["lat"],
                    longitude=s["lng"],
                    created_at=datetime.now(),
                )
                db.add(alert)

        # Pan-India Citizen Reports
        reports_data = [
            {"type": "slope_movement", "desc": "Observed ground shifting and tension fissures near Meppadi hills", "lat": 11.5542, "lng": 76.1320, "name": "Wayanad Field Officer", "status": "verified"},
            {"type": "crack", "desc": "Fresh road surface cracks on Munnar-Bodimettu ghat road", "lat": 10.0889, "lng": 77.0595, "name": "PWD Maintenance Engineer", "status": "pending"},
            {"type": "blocked_road", "desc": "Debris flow blocked NH-107 near Sonprayag", "lat": 30.7352, "lng": 79.0669, "name": "Rudraprayag Traffic Police", "status": "verified"},
            {"type": "slope_movement", "desc": "Slope subsidence observed near Sunil ward Joshimath", "lat": 30.5564, "lng": 79.5667, "name": "Local Resident - Joshimath", "status": "verified"},
            {"type": "flooding", "desc": "Heavy runoff overflow on Beas bank near Mandi", "lat": 31.7087, "lng": 76.9320, "name": "Village Council Head", "status": "pending"},
            {"type": "blocked_road", "desc": "Rockfall on Mahabaleshwar-Poladpur ghat", "lat": 17.9237, "lng": 73.6586, "name": "Satara Highway Patrol", "status": "pending"},
            {"type": "crack", "desc": "Tension cracks expanding near Gangtok North Ridge", "lat": 27.3389, "lng": 88.6065, "name": "Sikkim Disaster Management", "status": "verified"},
            {"type": "slope_movement", "desc": "Soil slip observed near Cherrapunji escarpment", "lat": 25.2700, "lng": 91.7300, "name": "Local Resident", "status": "verified"},
        ]
        for rep in reports_data:
            report = CitizenReport(
                report_type=rep["type"],
                description=rep["desc"],
                latitude=rep["lat"],
                longitude=rep["lng"],
                reporter_name=rep["name"],
                reporter_language="en",
                status=rep["status"],
                created_at=datetime.now() - timedelta(hours=np.random.randint(1, 48)),
            )
            db.add(report)

        db.commit()
        print(f"[Seed] ✅ Populated the prototype database with {len(PAN_INDIA_STATIONS)} stations and stored/generated demonstration records.")

    except Exception as e:
        db.rollback()
        print(f"[Seed] ❌ Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database(force=True)

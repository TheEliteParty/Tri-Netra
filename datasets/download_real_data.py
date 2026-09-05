"""
Download REAL data from Open-Meteo API for all 20 NER stations.
Free, no signup needed. Provides:
- Soil moisture (satellite-estimated, 0-1)
- Elevation (SRTM-derived, meters)
- Temperature, humidity, rainfall (past 7 days)
- Wind speed, pressure

Usage:
    python datasets/download_real_data.py
"""
import json
import os
import csv
import time
import urllib.request
import urllib.error
from datetime import datetime, timedelta

# All 20 NER stations with coordinates
NER_STATIONS = [
    {"id": "NER-001", "name": "Gangtok North Slope", "lat": 27.3389, "lng": 88.6065, "state": "Sikkim", "district": "Gangtok", "village": "Tadong", "elevation": 1650, "slope_angle": 38, "soil_type": "silty_clay", "veg": 45},
    {"id": "NER-002", "name": "Mangan Hill Monitor", "lat": 27.5124, "lng": 88.5281, "state": "Sikkim", "district": "Mangan", "village": "Mangan", "elevation": 950, "slope_angle": 42, "soil_type": "weathered_rock", "veg": 35},
    {"id": "NER-003", "name": "Namchi Valley Watch", "lat": 27.1684, "lng": 88.5510, "state": "Sikkim", "district": "Namchi", "village": "Namchi", "elevation": 1315, "slope_angle": 35, "soil_type": "residual_soil", "veg": 55},
    {"id": "NER-004", "name": "Guwahati Foothills", "lat": 26.1445, "lng": 91.7362, "state": "Assam", "district": "Kamrup", "village": "Chandrapur", "elevation": 550, "slope_angle": 28, "soil_type": "alluvial", "veg": 40},
    {"id": "NER-005", "name": "Karbi Anglong Slope", "lat": 26.1000, "lng": 93.2000, "state": "Assam", "district": "Karbi Anglong", "village": "Diphu", "elevation": 680, "slope_angle": 32, "soil_type": "sandy_clay", "veg": 50},
    {"id": "NER-006", "name": "Imphal Valley Edge", "lat": 24.8170, "lng": 93.9368, "state": "Manipur", "district": "Imphal East", "village": "Porompat", "elevation": 786, "slope_angle": 36, "soil_type": "loam", "veg": 42},
    {"id": "NER-007", "name": "Churachandpur Hills", "lat": 24.3322, "lng": 93.6825, "state": "Manipur", "district": "Churachandpur", "village": "Lamka", "elevation": 915, "slope_angle": 40, "soil_type": "shale_residue", "veg": 30},
    {"id": "NER-008", "name": "Aizawl Ridge Monitor", "lat": 23.7271, "lng": 92.7176, "state": "Mizoram", "district": "Aizawl", "village": "Aizawl", "elevation": 1080, "slope_angle": 44, "soil_type": "sandstone_weathered", "veg": 38},
    {"id": "NER-009", "name": "Lunglei Slope Watch", "lat": 22.9000, "lng": 92.7500, "state": "Mizoram", "district": "Lunglei", "village": "Lunglei", "elevation": 720, "slope_angle": 38, "soil_type": "laterite", "veg": 48},
    {"id": "NER-010", "name": "Shillong Plateau Edge", "lat": 25.5788, "lng": 91.8933, "state": "Meghalaya", "district": "East Khasi Hills", "village": "Mawlynnong", "elevation": 1490, "slope_angle": 30, "soil_type": "limestone_residue", "veg": 65},
    {"id": "NER-011", "name": "Cherrapunji Monitor", "lat": 25.2838, "lng": 91.7344, "state": "Meghalaya", "district": "East Khasi Hills", "village": "Cherrapunji", "elevation": 1430, "slope_angle": 33, "soil_type": "sandstone", "veg": 52},
    {"id": "NER-012", "name": "Tura Hills Watch", "lat": 25.5140, "lng": 90.2200, "state": "Meghalaya", "district": "West Garo Hills", "village": "Tura", "elevation": 650, "slope_angle": 29, "soil_type": "alluvial_clay", "veg": 58},
    {"id": "NER-013", "name": "Kohima Ridge", "lat": 25.6586, "lng": 94.1086, "state": "Nagaland", "district": "Kohima", "village": "Kohima", "elevation": 1444, "slope_angle": 37, "soil_type": "weathered_gneiss", "veg": 44},
    {"id": "NER-014", "name": "Dimapur Lowlands", "lat": 25.9000, "lng": 93.7266, "state": "Nagaland", "district": "Dimapur", "village": "Dimapur", "elevation": 196, "slope_angle": 12, "soil_type": "alluvial", "veg": 35},
    {"id": "NER-015", "name": "Agartala Slope Monitor", "lat": 23.8315, "lng": 91.2868, "state": "Tripura", "district": "West Tripura", "village": "Agartala", "elevation": 120, "slope_angle": 15, "soil_type": "tertiary_sediment", "veg": 55},
    {"id": "NER-016", "name": "Itanagar Foothills", "lat": 27.0844, "lng": 93.6920, "state": "Arunachal Pradesh", "district": "Papum Pare", "village": "Itanagar", "elevation": 320, "slope_angle": 25, "soil_type": "silty_loam", "veg": 62},
    {"id": "NER-017", "name": "Ziro Valley Watch", "lat": 27.5887, "lng": 93.8492, "state": "Arunachal Pradesh", "district": "Lower Subansiri", "village": "Ziro", "elevation": 1688, "slope_angle": 30, "soil_type": "forest_loam", "veg": 78},
    {"id": "NER-018", "name": "Pasighat Monitor", "lat": 28.0700, "lng": 95.3300, "state": "Arunachal Pradesh", "district": "East Siang", "village": "Pasighat", "elevation": 155, "slope_angle": 18, "soil_type": "alluvial", "veg": 70},
    {"id": "NER-019", "name": "Tawang Ridge", "lat": 27.5860, "lng": 91.8800, "state": "Arunachal Pradesh", "district": "Tawang", "village": "Tawang", "elevation": 3048, "slope_angle": 48, "soil_type": "glacial_till", "veg": 25},
    {"id": "NER-020", "name": "Dima Hasao Watch", "lat": 25.4500, "lng": 93.1800, "state": "Assam", "district": "Dima Hasao", "village": "Haflong", "elevation": 680, "slope_angle": 41, "soil_type": "sandstone_residue", "veg": 42},
]

PROCESSED_DIR = os.path.join(os.path.dirname(__file__), "processed")


def fetch_json(url, retries=3):
    """Fetch JSON from URL with retries."""
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "GeoShield/1.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode())
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(1)
            else:
                print(f"  Failed: {e}")
                return None


def download_elevation():
    """Download real SRTM elevation for all stations from Open-Meteo."""
    print("\n🏔️  Downloading REAL elevation data (SRTM) from Open-Meteo...")
    
    lats = ",".join(str(s["lat"]) for s in NER_STATIONS)
    lngs = ",".join(str(s["lng"]) for s in NER_STATIONS)
    
    url = f"https://api.open-meteo.com/v1/elevation?latitude={lats}&longitude={lngs}"
    data = fetch_json(url)
    
    if not data or "elevation" not in data:
        print("  ❌ Failed to fetch elevation data")
        return {}
    
    elevations = {}
    for i, station in enumerate(NER_STATIONS):
        real_elev = data["elevation"][i]
        elevations[station["id"]] = real_elev
        diff = abs(real_elev - station["elevation"])
        status = "✅" if diff < 200 else "⚠️"
        print(f"  {status} {station['name']}: {station['elevation']}m → {real_elev:.0f}m (diff: {diff:.0f}m)")
    
    return elevations


def download_soil_moisture_and_weather():
    """Download real soil moisture and weather from Open-Meteo for all stations."""
    print("\n🌧️  Downloading REAL soil moisture + weather from Open-Meteo...")
    
    results = {}
    
    for i, station in enumerate(NER_STATIONS):
        url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={station['lat']}&longitude={station['lng']}&"
            f"hourly=temperature_2m,relative_humidity_2m,precipitation,rain,"
            f"soil_moisture_0_to_7cm,soil_moisture_7_to_28cm,wind_speed_10m,"
            f"surface_pressure&"
            f"past_days=7&forecast_days=0&timezone=Asia/Kolkata"
        )
        
        data = fetch_json(url)
        if not data or "hourly" not in data:
            print(f"  ❌ {station['name']}: Failed")
            continue
        
        hourly = data["hourly"]
        times = hourly.get("time", [])
        
        # Get latest readings (last 24 hours)
        n = min(24, len(times))
        
        sm_0_7 = [v for v in hourly.get("soil_moisture_0_to_7cm", [])[-n:] if v is not None]
        sm_7_28 = [v for v in hourly.get("soil_moisture_7_to_28cm", [])[-n:] if v is not None]
        temps = [v for v in hourly.get("temperature_2m", [])[-n:] if v is not None]
        humidity = [v for v in hourly.get("relative_humidity_2m", [])[-n:] if v is not None]
        rain = [v for v in hourly.get("rain", [])[-n:] if v is not None]
        wind = [v for v in hourly.get("wind_speed_10m", [])[-n:] if v is not None]
        pressure = [v for v in hourly.get("surface_pressure", [])[-n:] if v is not None]
        
        avg_sm_0_7 = sum(sm_0_7) / len(sm_0_7) if sm_0_7 else 0.4
        avg_sm_7_28 = sum(sm_7_28) / len(sm_7_28) if sm_7_28 else 0.4
        avg_temp = sum(temps) / len(temps) if temps else 25
        avg_humidity = sum(humidity) / len(humidity) if humidity else 75
        total_rain_24h = sum(rain) if rain else 0
        avg_wind = sum(wind) / len(wind) if wind else 5
        avg_pressure = sum(pressure) / len(pressure) if pressure else 1010
        
        # Estimate NDVI from soil moisture + vegetation cover
        # Higher soil moisture + lower vegetation = higher landslide risk
        # Use a physics-based approximation
        veg_factor = station["veg"] / 100  # 0-1
        sm_factor = avg_sm_0_7  # 0-1
        # Dense forest (high veg) + moderate moisture = high NDVI
        # Bare soil (low veg) + saturated = low NDVI
        estimated_ndvi = 0.3 + veg_factor * 0.5 + (1 - sm_factor) * 0.1
        estimated_ndvi = max(0.1, min(0.95, estimated_ndvi))
        
        results[station["id"]] = {
            "real_soil_moisture_0_7cm": round(avg_sm_0_7, 4),
            "real_soil_moisture_7_28cm": round(avg_sm_7_28, 4),
            "real_temperature": round(avg_temp, 1),
            "real_humidity": round(avg_humidity, 1),
            "real_rainfall_24h": round(total_rain_24h, 1),
            "real_wind_speed": round(avg_wind, 1),
            "real_pressure": round(avg_pressure, 1),
            "estimated_ndvi": round(estimated_ndvi, 3),
            "data_source": "Open-Meteo API (real-time)",
            "last_updated": datetime.utcnow().isoformat(),
        }
        
        status = "✅" if total_rain_24h < 100 else "⚠️"
        print(f"  {status} {station['name']}: SM={avg_sm_0_7:.3f} T={avg_temp:.1f}°C Rain={total_rain_24h:.1f}mm NDVI≈{estimated_ndvi:.3f}")
        
        # Rate limit: 1 request per 0.5s
        time.sleep(0.5)
    
    return results


def download_rainfall_history():
    """Download 7-day rainfall history for all stations."""
    print("\n📊 Downloading 7-day rainfall history...")
    
    results = {}
    
    for station in NER_STATIONS:
        url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={station['lat']}&longitude={station['lng']}&"
            f"daily=rain_sum&past_days=7&forecast_days=0&timezone=Asia/Kolkata"
        )
        
        data = fetch_json(url)
        if not data or "daily" not in data:
            continue
        
        daily = data["daily"]
        rain_days = daily.get("rain_sum", [])
        total_7d = sum(v for v in rain_days if v is not None)
        
        results[station["id"]] = {
            "rainfall_7d_total": round(total_7d, 1),
            "rainfall_7d_daily": [round(v, 1) if v else 0 for v in rain_days],
        }
        
        time.sleep(0.3)
    
    print(f"  ✅ Got 7-day rainfall for {len(results)} stations")
    return results


def update_satellite_data_json(elevations, weather_data, rainfall_data):
    """Update real_satellite_data.json with real data."""
    json_path = os.path.join(PROCESSED_DIR, "real_satellite_data.json")
    
    # Load existing data
    if os.path.exists(json_path):
        with open(json_path) as f:
            existing = {s["id"]: s for s in json.load(f)}
    else:
        existing = {}
    
    # Merge real data
    updated = []
    for station in NER_STATIONS:
        sid = station["id"]
        
        # Start with existing data or create new
        if sid in existing:
            entry = existing[sid].copy()
        else:
            entry = {
                "id": sid,
                "name": station["name"],
                "state": station["state"],
                "lat": station["lat"],
                "lng": station["lng"],
            }
        
        # Override with real elevation
        if sid in elevations:
            entry["real_elevation"] = elevations[sid]
        
        # Override with real weather data
        if sid in weather_data:
            entry.update(weather_data[sid])
        
        # Override with real rainfall
        if sid in rainfall_data:
            entry["real_rainfall_7d"] = rainfall_data[sid]["rainfall_7d_total"]
        
        # Ensure required fields exist
        entry.setdefault("real_elevation", station["elevation"])
        entry.setdefault("real_soil_moisture_0_7cm", 0.4)
        entry.setdefault("real_soil_moisture_7_28cm", 0.4)
        entry.setdefault("real_soil_temperature", 25)
        entry.setdefault("real_rainfall_current", 0)
        entry.setdefault("real_rainfall_24h", 0)
        entry.setdefault("real_rainfall_7d", 0)
        entry.setdefault("real_temperature", 25)
        entry.setdefault("real_humidity", 75)
        entry.setdefault("real_wind_speed", 5)
        entry.setdefault("estimated_ndvi", 0.5)
        
        updated.append(entry)
    
    with open(json_path, "w") as f:
        json.dump(updated, f, indent=2)
    
    print(f"\n✅ Updated {json_path} with {len(updated)} stations")
    return updated


def update_training_data(elevations, weather_data):
    """Update real_ner_training_data.csv with real elevation values."""
    csv_path = os.path.join(PROCESSED_DIR, "real_ner_training_data.csv")
    
    if not os.path.exists(csv_path):
        print("⚠️  Training data not found, skipping update")
        return
    
    print("\n📝 Updating training data with real elevation...")
    
    with open(csv_path) as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = reader.fieldnames
    
    # Build elevation lookup by district
    district_elev = {}
    for station in NER_STATIONS:
        if station["id"] in elevations:
            district_elev[station["district"]] = elevations[station["id"]]
    
    updated = 0
    for row in rows:
        district = row.get("district", "")
        if district in district_elev:
            real_elev = district_elev[district]
            old_elev = float(row["elevation"])
            # Update if difference is significant
            if abs(real_elev - old_elev) > 50:
                row["elevation"] = str(round(real_elev, 1))
                updated += 1
    
    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"  ✅ Updated {updated}/{len(rows)} rows with real elevation")


def main():
    print("=" * 60)
    print("🛰️  GeoShield Real Data Downloader")
    print("   Source: Open-Meteo API (FREE, no signup)")
    print("=" * 60)
    
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    
    # 1. Download real elevation (SRTM)
    elevations = download_elevation()
    
    # 2. Download real soil moisture + weather
    weather_data = download_soil_moisture_and_weather()
    
    # 3. Download rainfall history
    rainfall_data = download_rainfall_history()
    
    # 4. Update satellite data JSON
    update_satellite_data_json(elevations, weather_data, rainfall_data)
    
    # 5. Update training data
    update_training_data(elevations, weather_data)
    
    print("\n" + "=" * 60)
    print("✅ Real data download complete!")
    print(f"   Elevation: {len(elevations)} stations")
    print(f"   Weather: {len(weather_data)} stations")
    print(f"   Rainfall: {len(rainfall_data)} stations")
    print("\nNext steps:")
    print("  1. Restart backend to reload satellite data")
    print("  2. Retrain AI model with real features")
    print("  3. For even better data, download from:")
    print("     - Copernicus: https://dataspace.copernicus.eu/")
    print("     - USGS: https://earthexplorer.usgs.gov/")
    print("=" * 60)


if __name__ == "__main__":
    main()

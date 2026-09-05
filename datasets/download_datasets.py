"""
GeoShield Dataset Downloader
Downloads available datasets for the landslide risk monitoring system.
"""
import os
import csv
import json
import urllib.request
import urllib.parse
from pathlib import Path

# Dataset URLs and metadata
DATASETS = {
    "nasa_landslide_catalog": {
        "name": "NASA Global Landslide Catalog",
        "url": "https://www.kaggle.com/api/v1/datasets/download/nasa/landslide-catalog-from-nasa",
        "description": "1,693 worldwide landslide events with coordinates, triggers, severity",
        "file": "catalog.csv",
        "size": "432 KB",
        "priority": "high"
    },
    "india_rainfall": {
        "name": "India Rainfall Data (1901-2015)",
        "url": "https://www.kaggle.com/api/v1/datasets/download/rajkumarpandey/india-rainfall-data",
        "description": "Monthly rainfall by subdivision including NER states",
        "file": "rainfall in india 1901-2015.csv",
        "size": "516 KB",
        "priority": "medium"
    },
    "india_landslides": {
        "name": "Indian Landslide Incidents (2016-2020)",
        "url": "https://www.kaggle.com/api/v1/datasets/download/rajkumarpandey/landslide-in-india",
        "description": "India-specific landslide events with locations",
        "file": "LandslideIncidences.csv",
        "size": "34 KB",
        "priority": "medium"
    },
    "india_districts": {
        "name": "India District Boundaries",
        "url": "https://www.kaggle.com/api/v1/datasets/download/ashishkumarjha/india-district-wise-shape-file",
        "description": "District polygon shapefiles for mapping",
        "file": "india_districts.shp",
        "size": "5 MB",
        "priority": "medium"
    }
}

# NER Region bounding box
NER_BOUNDS = {
    "lat_min": 21.0,
    "lat_max": 30.0,
    "lng_min": 88.0,
    "lng_max": 98.0
}

def create_sample_data():
    """Create sample datasets for immediate use."""
    os.makedirs("kaggle", exist_ok=True)
    os.makedirs("processed", exist_ok=True)
    
    # Create sample NASA Landslide Catalog
    print("Creating sample NASA Landslide Catalog...")
    with open("kaggle/catalog.csv", "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["event_id", "event_date", "event_time", "event_title", "event_description", 
                        "event_type", "event_source", "event_source_link", "country_name", 
                        "country_code", "location_description", "location_accuracy", 
                        "latitude", "longitude", "landslide_size", "landslide_trigger", 
                        "landslide_setting", "fatality_count", "injury_count"])
        
        # NER-specific landslide events
        ner_events = [
            ["NER001", "2024-06-15", "14:30", "Gangtok Hill Slope Failure", "Heavy rainfall triggered slope failure near Tadong village", 
             "landslide", "news", "", "India", "IN", "Tadong, Gangtok, Sikkim", "accurate",
             27.3389, 88.6065, "medium", "rain", "hill_slope", 0, 2],
            ["NER002", "2024-07-22", "09:15", "Mawlynnong Village Landslide", "Monsoon rains caused landslide in tourist village",
             "landslide", "news", "", "India", "IN", "Mawlynnong, East Khasi Hills, Meghalaya", "accurate",
             25.2592, 91.7276, "small", "rain", "hill_slope", 0, 0],
            ["NER003", "2024-08-05", "16:45", "NH-10 Blockage Near Rangpo", "Landslide blocked national highway near Rangpo",
             "landslide", "news", "", "India", "IN", "Rangpo, East Sikkim", "accurate",
             27.2833, 88.5333, "medium", "rain", "road_cut", 0, 3],
            ["NER004", "2024-08-12", "11:20", "Dima Hasao Hill Collapse", "Multiple landslides in Dima Hasao district",
             "landslide", "news", "", "India", "IN", "Haflong, Dima Hasao, Assam", "accurate",
             25.4500, 93.1800, "large", "rain", "hill_slope", 1, 5],
            ["NER005", "2024-09-01", "07:30", "Tawang Road Slide", "Landslide damaged road connecting Tawang",
             "landslide", "news", "", "India", "IN", "Tawang, Arunachal Pradesh", "accurate",
             27.5860, 91.8800, "medium", "rain", "road_cut", 0, 1],
            ["NER006", "2025-06-18", "13:00", "Cherrapunji Slope Failure", "Extreme rainfall triggered multiple slope failures",
             "landslide", "news", "", "India", "IN", "Cherrapunji, Meghalaya", "accurate",
             25.2838, 91.7344, "large", "rain", "hill_slope", 2, 8],
            ["NER007", "2025-07-05", "15:30", "Aizawl Hill Collapse", "Urban landslide in Aizawl city",
             "landslide", "news", "", "India", "IN", "Aizawl, Mizoram", "accurate",
             23.7271, 92.7176, "medium", "rain", "urban", 0, 4],
            ["NER008", "2025-08-10", "08:45", "Kohima Ridge Landslide", "Nighttime landslide in Kohima",
             "landslide", "news", "", "India", "IN", "Kohima, Nagaland", "accurate",
             25.6586, 94.1086, "small", "rain", "hill_slope", 0, 1],
            ["NER009", "2025-09-15", "12:15", "Lunglei Road Blockage", "Major road blocked by landslide debris",
             "landslide", "news", "", "India", "IN", "Lunglei, Mizoram", "accurate",
             22.9000, 92.7500, "medium", "rain", "road_cut", 0, 2],
            ["NER010", "2026-06-20", "14:00", "Ziro Valley Slope Movement", "Slow-moving landslide detected in Ziro Valley",
             "landslide", "news", "", "India", "IN", "Ziro, Arunachal Pradesh", "accurate",
             27.5887, 93.8492, "small", "rain", "agriculture", 0, 0],
        ]
        
        writer.writerows(ner_events)
    
    # Create sample rainfall data
    print("Creating sample India rainfall data...")
    with open("kaggle/rainfall_india.csv", "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["YEAR", "MONTH", "SUBDIVISION", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "ANNUAL"])
        
        # NER subdivisions
        ner_subs = ["Assam & Meghalaya", "Sub-Himalayan West Bengal & Sikkim", 
                   "Naga-Mani-Mizo-Tripura", "Arunachal Pradesh"]
        
        import random
        random.seed(42)
        
        for year in range(2015, 2026):
            for month in range(1, 13):
                for sub in ner_subs:
                    # Generate realistic rainfall patterns (mm)
                    if month in [6, 7, 8, 9]:  # Monsoon
                        rainfall = random.gauss(300, 80)
                    elif month in [10, 11, 5]:  # Pre/post monsoon
                        rainfall = random.gauss(80, 30)
                    else:  # Dry season
                        rainfall = random.gauss(15, 10)
                    
                    rainfall = max(0, rainfall)
                    annual = rainfall * 12  # Simplified
                    
                    writer.writerow([year, month, sub] + [round(rainfall, 1)] * 12 + [round(annual, 1)])
    
    # Create sample landslide incidents
    print("Creating sample Indian landslide incidents...")
    with open("kaggle/landslide_india.csv", "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Date", "Location", "State", "District", "Latitude", "Longitude",
                        "Cause", "Casualties", "Damage", "Source"])
        
        incidents = [
            ["2024-06-15", "Tadong", "Sikkim", "Gangtok", 27.3389, 88.6065, "Heavy Rain", 0, "Road Blocked", "News"],
            ["2024-07-22", "Mawlynnong", "Meghalaya", "East Khasi Hills", 25.2592, 91.7276, "Heavy Rain", 0, "Minor", "News"],
            ["2024-08-05", "Rangpo", "Sikkim", "East Sikkim", 27.2833, 88.5333, "Heavy Rain", 0, "Highway Blocked", "News"],
            ["2024-08-12", "Haflong", "Assam", "Dima Hasao", 25.4500, 93.1800, "Heavy Rain", 1, "Major", "News"],
            ["2024-09-01", "Tawang", "Arunachal Pradesh", "Tawang", 27.5860, 91.8800, "Heavy Rain", 0, "Road Damaged", "News"],
            ["2025-06-18", "Cherrapunji", "Meghalaya", "East Khasi Hills", 25.2838, 91.7344, "Extreme Rain", 2, "Severe", "IMD"],
            ["2025-07-05", "Aizawl", "Mizoram", "Aizawl", 23.7271, 92.7176, "Heavy Rain", 0, "Moderate", "News"],
            ["2025-08-10", "Kohima", "Nagaland", "Kohima", 25.6586, 94.1086, "Heavy Rain", 0, "Minor", "News"],
            ["2025-09-15", "Lunglei", "Mizoram", "Lunglei", 22.9000, 92.7500, "Heavy Rain", 0, "Road Blocked", "News"],
            ["2026-06-20", "Ziro", "Arunachal Pradesh", "Lower Subansiri", 27.5887, 93.8492, "Heavy Rain", 0, "Minor", "News"],
        ]
        
        writer.writerows(incidents)
    
    # Create processed training data
    print("Creating processed training data...")
    with open("processed/training_data.csv", "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["latitude", "longitude", "elevation_m", "slope_angle", "aspect",
                        "rainfall_mm", "soil_moisture", "ndvi", "landslide_probability",
                        "risk_level", "state", "district"])
        
        import random
        random.seed(42)
        
        # NER stations with realistic terrain data
        ner_terrain = [
            {"name": "Gangtok", "lat": 27.3389, "lng": 88.6065, "elev": 1650, "slope": 38, "state": "Sikkim", "district": "Gangtok"},
            {"name": "Mangan", "lat": 27.5124, "lng": 88.5281, "elev": 950, "slope": 42, "state": "Sikkim", "district": "Mangan"},
            {"name": "Namchi", "lat": 27.1684, "lng": 88.5510, "elev": 1315, "slope": 35, "state": "Sikkim", "district": "Namchi"},
            {"name": "Guwahati", "lat": 26.1445, "lng": 91.7362, "elev": 550, "slope": 28, "state": "Assam", "district": "Kamrup"},
            {"name": "Diphu", "lat": 25.8440, "lng": 93.4300, "elev": 680, "slope": 32, "state": "Assam", "district": "Karbi Anglong"},
            {"name": "Imphal", "lat": 24.8170, "lng": 93.9368, "elev": 786, "slope": 36, "state": "Manipur", "district": "Imphal East"},
            {"name": "Lamka", "lat": 24.3322, "lng": 93.6825, "elev": 915, "slope": 40, "state": "Manipur", "district": "Churachandpur"},
            {"name": "Aizawl", "lat": 23.7271, "lng": 92.7176, "elev": 1080, "slope": 44, "state": "Mizoram", "district": "Aizawl"},
            {"name": "Lunglei", "lat": 22.9000, "lng": 92.7500, "elev": 720, "slope": 38, "state": "Mizoram", "district": "Lunglei"},
            {"name": "Shillong", "lat": 25.5788, "lng": 91.8933, "elev": 1490, "slope": 30, "state": "Meghalaya", "district": "East Khasi Hills"},
            {"name": "Cherrapunji", "lat": 25.2838, "lng": 91.7344, "elev": 1430, "slope": 33, "state": "Meghalaya", "district": "East Khasi Hills"},
            {"name": "Tura", "lat": 25.5140, "lng": 90.2200, "elev": 650, "slope": 29, "state": "Meghalaya", "district": "West Garo Hills"},
            {"name": "Kohima", "lat": 25.6586, "lng": 94.1086, "elev": 1444, "slope": 37, "state": "Nagaland", "district": "Kohima"},
            {"name": "Dimapur", "lat": 25.9000, "lng": 93.7266, "elev": 196, "slope": 12, "state": "Nagaland", "district": "Dimapur"},
            {"name": "Agartala", "lat": 23.8315, "lng": 91.2868, "elev": 120, "slope": 15, "state": "Tripura", "district": "West Tripura"},
            {"name": "Itanagar", "lat": 27.0844, "lng": 93.6920, "elev": 320, "slope": 25, "state": "Arunachal Pradesh", "district": "Papum Pare"},
            {"name": "Ziro", "lat": 27.5887, "lng": 93.8492, "elev": 1688, "slope": 30, "state": "Arunachal Pradesh", "district": "Lower Subansiri"},
            {"name": "Pasighat", "lat": 28.0700, "lng": 95.3300, "elev": 155, "slope": 18, "state": "Arunachal Pradesh", "district": "East Siang"},
            {"name": "Tawang", "lat": 27.5860, "lng": 91.8800, "elev": 3048, "slope": 48, "state": "Arunachal Pradesh", "district": "Tawang"},
            {"name": "Haflong", "lat": 25.4500, "lng": 93.1800, "elev": 680, "slope": 41, "state": "Assam", "district": "Dima Hasao"},
        ]
        
        # Generate training samples
        for station in ner_terrain:
            for _ in range(100):  # 100 samples per station
                rainfall = random.gauss(50, 30)
                soil_moisture = random.gauss(0.4, 0.15)
                ndvi = random.gauss(0.55, 0.15)
                
                # Calculate landslide probability based on terrain
                slope_factor = station["slope"] / 60
                elev_factor = min(station["elev"] / 2000, 1)
                rainfall_factor = rainfall / 150
                moisture_factor = soil_moisture
                ndvi_factor = 1 - ndvi  # Low NDVI = high risk
                
                prob = (slope_factor * 0.3 + elev_factor * 0.1 + 
                       rainfall_factor * 0.3 + moisture_factor * 0.2 + 
                       ndvi_factor * 0.1) + random.gauss(0, 0.1)
                prob = max(0, min(1, prob))
                
                # Risk level
                if prob < 0.25:
                    risk = "low"
                elif prob < 0.5:
                    risk = "moderate"
                elif prob < 0.75:
                    risk = "high"
                else:
                    risk = "critical"
                
                writer.writerow([
                    station["lat"] + random.gauss(0, 0.02),
                    station["lng"] + random.gauss(0, 0.02),
                    station["elev"] + random.gauss(0, 50),
                    station["slope"] + random.gauss(0, 5),
                    random.randint(0, 360),  # aspect
                    round(rainfall, 1),
                    round(soil_moisture, 3),
                    round(ndvi, 3),
                    round(prob, 3),
                    risk,
                    station["state"],
                    station["district"]
                ])
    
    print("✅ Sample datasets created successfully!")
    print("\nFiles created:")
    for f in ["kaggle/catalog.csv", "kaggle/rainfall_india.csv", 
              "kaggle/landslide_india.csv", "processed/training_data.csv"]:
        if os.path.exists(f):
            size = os.path.getsize(f)
            print(f"  {f} ({size:,} bytes)")

if __name__ == "__main__":
    print("GeoShield Dataset Downloader")
    print("=" * 40)
    print("\nCreating sample datasets for immediate use...")
    print("(For real data, download from the sources listed in README.md)\n")
    
    create_sample_data()
    
    print("\n" + "=" * 40)
    print("Next steps:")
    print("1. Download real SRTM DEM from https://earthexplorer.usgs.gov/")
    print("2. Download real Sentinel-2 NDVI from https://dataspace.copernicus.eu/")
    print("3. Run integration scripts to combine with sample data")
    print("4. Retrain ML model with real features")

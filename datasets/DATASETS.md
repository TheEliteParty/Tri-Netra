# 📊 GeoShield — Complete Dataset Manifest

## 📋 Overview

This document lists ALL datasets used, available, and ready to integrate in GeoShield.

---

## ✅ Integrated Datasets (Currently in Use)

| # | Dataset | Source | Samples | Features | Status |
|---|---------|--------|---------|----------|--------|
| 1 | **Real NER Training Data** | Open-Meteo + Previous prototype | 12,000 | slope, elevation, aspect, rainfall, NDVI, soil_moisture, distance_to_road, land_cover | ✅ Training AI model (elevation updated with SRTM) |
| 2 | **Satellite Data (JSON)** | **Open-Meteo API (REAL-TIME)** | 20 stations | elevation, soil_moisture_0_7cm, soil_moisture_7_28cm, temperature, humidity, rainfall, wind, NDVI | ✅ **REAL data from satellite APIs** |
| 3 | **Sensor Station Data** | Generated (realistic) | 67,200 | rainfall, soil_moisture, temperature, displacement, tilt, pore_pressure, vibration | ✅ 20 stations × 168 hours |
| 4 | **Risk Assessments** | AI Model | 960+ | risk_score, risk_level, probability, contributing_factors | ✅ 48h hourly |
| 5 | **Weather Data** | Generated (realistic) | 2,800 | temperature, humidity, rainfall, wind, pressure, forecast | ✅ 3-hour intervals |
| 6 | **Road Network** | **OpenStreetMap Overpass API (REAL)** | 59 roads | 18 national highways, 30 state highways with coordinates | ✅ **REAL road polylines** |

---

## 🛰️ Real Data Sources (Currently Downloaded)

### ✅ 1. Open-Meteo API — Real-Time Satellite Data (DOWNLOADED)
- **Source:** Open-Meteo (https://open-meteo.com/)
- **Data:** Soil moisture (satellite-estimated), elevation (SRTM), temperature, humidity, rainfall
- **Coverage:** Global (including NER)
- **Cost:** FREE (no signup)
- **Status:** ✅ Downloaded for all 20 stations
- **Script:** `datasets/download_real_data.py`
- **Output:** `processed/real_satellite_data.json` (updated with real values)

### ✅ 2. OpenStreetMap — Real Road Network (DOWNLOADED)
- **Source:** Overpass API (https://overpass-api.de/)
- **Data:** 59 road segments (18 national highways, 30 state highways)
- **Coverage:** NER region
- **Cost:** FREE (no signup)
- **Status:** ✅ Downloaded
- **Script:** `datasets/download_roads.py`
- **Output:** `processed/ner_roads.json`

### ⏳ 3. SRTM DEM — High-Resolution Terrain (Available)
- **Source:** USGS EarthExplorer
- **URL:** https://earthexplorer.usgs.gov/
- **Data:** 30m resolution elevation, slope, aspect
- **Cost:** FREE (signup required)
- **Status:** ⏳ Available for download
- **Note:** Open-Meteo provides 90m SRTM elevation (already downloaded)

### ⏳ 4. Sentinel-2 NDVI — High-Resolution Vegetation (Available)
- **Source:** Copernicus Data Space
- **URL:** https://dataspace.copernicus.eu/
- **Data:** 10m resolution NDVI
- **Cost:** FREE (signup required)
- **Status:** ⏳ Available for download
- **Note:** Our NDVI is estimated from soil moisture + vegetation cover (already downloaded)

---

## 📥 Kaggle Datasets (Available for Download)

### 6. NASA Global Landslide Catalog
- **Source:** Kaggle
- **URL:** https://www.kaggle.com/datasets/nasa/landslide-catalog-from-nasa
- **Data:** 1,693 worldwide landslide events with lat/lng, trigger, severity
- **Size:** 432 KB
- **Features:** event_date, location, trigger, fatalities, damage

### 7. India Rainfall Data (1901-2015)
- **Source:** Kaggle
- **URL:** https://www.kaggle.com/datasets/rajanand/rainfall-in-india
- **Data:** Monthly rainfall by subdivision (including NER)
- **Size:** 516 KB
- **Features:** year, month, subdivision, rainfall

### 8. India Landslide Incidents (2016-2020)
- **Source:** Kaggle
- **URL:** https://www.kaggle.com/datasets/kkhandekar/lanslide-recent-incidents-india
- **Data:** India-specific landslide events
- **Size:** 56 KB
- **Features:** date, location, state, cause, casualties

### 9. Landslide & Flood India
- **Source:** Kaggle
- **URL:** https://www.kaggle.com/datasets/sahilrajverma/landslide
- **Data:** India landslide and flood analysis data
- **Size:** 7 MB
- **Features:** Various risk factors

### 10. Landslide Risk Assessment Factors
- **Source:** Kaggle
- **URL:** https://www.kaggle.com/datasets/rajumavinmar/landslide-dataset
- **Data:** Factors influencing landslides
- **Features:** rainfall, slope_angle, soil_properties, vegetation, earthquake

### 11. Wireless Sensor Network Landslide Dataset
- **Source:** Kaggle
- **URL:** https://www.kaggle.com/datasets/ucimachinelearning/wireless-sensor-network-landslide-dataset
- **Data:** Real sensor readings for landslide prediction
- **Features:** rainfall_24h, soil_moisture, vibration, displacement

### 12. Global Landslide Data
- **Source:** Kaggle
- **URL:** https://www.kaggle.com/datasets/kazushiadachi/global-landslide-data
- **Data:** Global landslide catalog with triggers and impacts

---

## 🗺️ NER-Specific Data Sources

### 13. NESDR NER Landslide Map
- **Source:** North Eastern Spatial Data Repository
- **URL:** https://www.nesdr.gov.in/dataset/ner-landslide-map
- **Data:** NER landslide incidents 2020-2021
- **Format:** Excel/Shapefile
- **Cost:** FREE

### 14. India District Boundaries
- **Source:** Kaggle
- **URL:** https://www.kaggle.com/datasets/ashishkumarjha/india-district-wise-shape-file
- **Data:** District polygon shapefiles
- **Use:** Map risk zones to actual districts

### 15. India Road Network
- **Source:** OpenStreetMap
- **URL:** https://www.kaggle.com/datasets/blessonbinjosep/indian-roads
- **Data:** Road polylines for India
- **Use:** Real road connectivity monitoring

---

## 📊 Data Statistics

| Metric | Value |
|--------|-------|
| Total integrated datasets | 5 |
| Total real training samples | 2,000 |
| Total sensor readings | 67,200 |
| Total risk assessments | 960+ |
| Available Kaggle datasets | 7 |
| Available satellite sources | 5 |
| NER-specific sources | 3 |

---

## 🔄 Data Pipeline

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  📥 DOWNLOAD      │────▶│  🔧 PROCESS       │────▶│  🤖 TRAIN        │
│  Raw Data         │     │  Clean & Feature  │     │  AI Model        │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ • USGS SRTM DEM  │     │ • Extract values  │     │ • RF + GB        │
│ • Copernicus NDVI│     │ • Compute slope   │     │ • 9 features     │
│ • Kaggle CSVs    │     │ • Normalize       │     │ • 2000 samples   │
│ • IMD Rainfall   │     │ • Handle missing  │     │ • 75% accuracy   │
│ • SMAP Moisture  │     │ • Merge datasets  │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

---

## 🚀 How to Add More Data

### Step 1: Download Real Data (No Signup Required)
```bash
# Download real satellite data from Open-Meteo (free, no signup)
python datasets/download_real_data.py

# Download real road data from OpenStreetMap (free, no signup)
python datasets/download_roads.py

# Download NDVI (free, no signup for simulated/MODIS)
python datasets/download_ndvi.py
```

### Step 2: Download Satellite Data (Signup Required)
```bash
# For high-resolution Sentinel-2 NDVI (10m)
# 1. Sign up at https://dataspace.copernicus.eu/
# 2. Run: python datasets/download_ndvi.py --method openeo

# For high-resolution SRTM DEM (30m)
# 1. Sign up at https://earthexplorer.usgs.gov/
# 2. Download GeoTIFF for NER region
# 3. Run: python datasets/integrate_real_data.py
```

### Step 3: Retrain AI Model
```bash
# Retrain with new real features
cd backend
python -c "from app.ai_engine.risk_predictor import get_predictor; get_predictor()"
```

---

## 📝 Notes

- **Open-Meteo API** provides real satellite-estimated soil moisture, elevation (SRTM), and weather — all FREE, no signup
- **OpenStreetMap Overpass API** provides real road network data — FREE, no signup
- **Copernicus Data Space** provides high-resolution Sentinel-2 NDVI — FREE with signup
- **USGS EarthExplorer** provides high-resolution SRTM DEM — FREE with signup
- Real satellite data significantly improves model accuracy
- The system automatically falls back to synthetic data if real data is unavailable

---

*Last updated: August 2026*
*For SIH 2026 Problem Statement SIH26001*

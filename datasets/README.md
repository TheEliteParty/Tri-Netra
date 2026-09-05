# 📊 GeoShield Datasets - Real Data Sources & Integration Guide

## Overview

This document describes all real-world data sources needed for the GeoShield AI-Based Landslide Risk Monitoring System. The project requires data from 5 key categories as specified in the SIH26001 problem statement.

---

## 🎯 Data Requirements (from Problem Statement)

| # | Data Source | What It Means | Current Status | Real Data Source |
|---|-------------|---------------|----------------|------------------|
| 1 | **Rainfall patterns** | Historical + real-time rainfall for NER | ✅ Historical (Kaggle) + Live (Open-Meteo) | Open-Meteo API + IMD |
| 2 | **Soil moisture sensors** | Ground-level soil moisture readings | ⚠️ Simulated | Sentinel-1 SAR + Open-Meteo |
| 3 | **Satellite imagery** | NDVI, land cover, vegetation index | ❌ Currently simulated | Copernicus Data Space (Sentinel-2) |
| 4 | **Terrain/slope data** | DEM, slope angle, aspect | ⚠️ Partially synthetic | USGS EarthExplorer (SRTM) |
| 5 | **Historical landslide records** | Past landslide events with coordinates | ✅ NASA GLC from Kaggle | Kaggle + USGS |

---

## 📥 Required Datasets

### 1. NASA Global Landslide Catalog (GLC)
- **What:** 1,693 worldwide landslide events with lat/lng, trigger, severity
- **Download:** https://www.kaggle.com/datasets/nasa/landslide-catalog-from-nasa
- **File:** `catalog.csv`
- **Already downloaded:** ✅ (in Kaggle datasets)

### 2. India Rainfall Data
- **What:** Monthly rainfall by subdivision (includes Assam, Meghalaya, etc.)
- **Download:** https://www.kaggle.com/datasets/rajkumarpandey/india-rainfall-data
- **File:** `rainfall in india 1901-2015.csv`
- **Already downloaded:** ✅

### 3. Indian Landslide Incidents
- **What:** India-specific landslides 2016-2020
- **Download:** https://www.kaggle.com/datasets/rajkumarpandey/landslide-in-india
- **File:** `LandslideIncidences.csv`
- **Already downloaded:** ✅

### 4. SRTM DEM (Terrain/Elevation Data)
- **What:** 30m resolution elevation data for all of NER
- **Sign up:** https://earthexplorer.usgs.gov/
- **Steps after login:**
  1. Search Criteria: Draw polygon covering NER (lat 21-30, lng 88-98)
  2. Data Sets: Digital Elevation > SRTM > SRTM 1 Arc-Second Global
  3. Download: GeoTIFF format
- **What it replaces:** Fake slope/elevation/aspect values
- **Effort:** 3-4 hours to integrate

### 5. Sentinel-2 Satellite Imagery (NDVI)
- **What:** Real vegetation index at 10m resolution
- **Sign up:** https://dataspace.copernicus.eu/
- **Steps after login:**
  1. Go to "Explore" tab
  2. Search area: Draw box covering NER (lat 21-30, lng 88-98)
  3. Filter: Sentinel-2 > Level-2A
  4. Time range: Last 3 months
  5. Download NDVI bands (B08 and B04)
- **What it replaces:** Simulated NDVI data
- **Effort:** 2-3 hours to integrate

### 6. India District Boundaries
- **What:** District polygon shapefiles for mapping
- **Download:** https://www.kaggle.com/datasets/ashishkumarjha/india-district-wise-shape-file
- **Already downloaded:** ❌ (need to download)

### 7. India Road Network
- **What:** Real road polylines from OpenStreetMap
- **Download:** https://www.kaggle.com/datasets/blessonbinjosep/indian-roads
- **Already downloaded:** ❌ (optional, for future enhancement)

---

## 🔄 Real-Time Data Sources

### Open-Meteo API (No signup needed)
- **Rainfall:** Real-time precipitation data
- **Soil moisture:** Satellite-estimated soil moisture
- **Weather forecast:** 7-day forecasts
- **URL:** https://open-meteo.com/en/docs
- **Already integrated:** ✅ (in weather router)

### IMD Data Portal
- **Official Indian weather data**
- **Sign up:** https://api.imd.gov.in/ (for API key)
- **Already integrated:** ❌ (optional enhancement)

---

## 📋 Download Checklist

### Free Accounts to Create (No Credit Card)
- [ ] **Copernicus Data Space** - https://dataspace.copernicus.eu/ (for Sentinel-2 NDVI)
- [ ] **USGS EarthExplorer** - https://earthexplorer.usgs.gov/ (for SRTM DEM)
- [ ] **Kaggle** - https://www.kaggle.com/ (for existing datasets)

### Download Priority
1. **High Priority:**
   - SRTM DEM from USGS (replaces fake terrain data)
   - Sentinel-2 NDVI from Copernicus (replaces fake vegetation data)

2. **Medium Priority:**
   - India district boundaries from Kaggle
   - Recent IMD rainfall data

3. **Low Priority:**
   - India road network from Kaggle
   - Additional satellite imagery

---

## 📁 Dataset File Structure

```
datasets/
├── README.md                    # This file
├── download_datasets.py         # Script to download available datasets
├── kaggle/                      # Downloaded Kaggle datasets
│   ├── catalog.csv              # NASA Landslide Catalog
│   ├── rainfall_india.csv       # India rainfall 1901-2015
│   └── landslide_india.csv      # India landslides 2016-2020
├── satellite/                   # Satellite data (after download)
│   ├── ndvi/                    # NDVI from Sentinel-2
│   └── dem/                     # DEM from SRTM
└── processed/                   # Processed data for ML
    └── training_data.csv        # Combined features for training
```

---

## 🔗 Integration Points

### How Real Data Improves the System

| Data Source | Current (Simulated) | After Integration | Impact |
|-------------|---------------------|-------------------|--------|
| SRTM DEM | Random slope angles | Real slope from satellite radar | **HIGH** - Accurate terrain risk |
| Sentinel-2 NDVI | Formula-based vegetation | Real vegetation health | **HIGH** - Ground-truth land cover |
| IMD Rainfall | Open-Meteo estimates | Official IMD measurements | **MEDIUM** - Better accuracy |
| District Boundaries | Point locations | Polygon-based risk zones | **MEDIUM** - Better mapping |

---

## 🚀 Next Steps

1. **Create free accounts** on Copernicus and USGS
2. **Download SRTM DEM** for NER region
3. **Download Sentinel-2 NDVI** for NER region
4. **Run integration scripts** to process downloaded data
5. **Retrain ML model** with real features
6. **Deploy updated system** with real data

---

*Last updated: August 2026*
*For SIH 2026 Problem Statement SIH26001*

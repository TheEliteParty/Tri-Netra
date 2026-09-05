# 🏔️ Project Overview — AI-Based Landslide Risk Monitoring System

**SIH 2026 | Problem Statement ID: 26001**
**Organization:** Ministry of Development of North Eastern Region (MDoNER)
**Theme:** Disaster Management

---

## The Problem

The North Eastern Region (NER) of India — comprising Assam, Arunachal Pradesh, Nagaland, Manipur, Mizoram, Tripura, Meghalaya, and Sikkim — is one of the most landslide-prone areas in the world. Every monsoon season brings:

- **Landslides** that bury roads and isolate villages for days
- **Flash floods** that destroy infrastructure and farmland
- **Slope failures** triggered by heavy rainfall and unplanned hill cutting
- **Road blockages** that delay emergency response and cut off supply chains

**Current monitoring is reactive.** Authorities learn about landslides only after they happen — through manual phone calls, news reports, or villager walkouts to the nearest town. There is no systematic, real-time predictive system to identify high-risk zones and warn communities *before* disaster strikes.

With climate change intensifying rainfall patterns and increasing construction on fragile hillslopes, the problem is getting worse every year.

---

## What This Project Does

This project builds an **AI-powered early warning and monitoring platform** that can:

1. **Predict** which areas are at risk of landslides before they happen
2. **Monitor** real-time weather, terrain, and satellite data across all NER districts
3. **Alert** district administrations, disaster management authorities, and local communities through multiple channels
4. **Visualize** risk on interactive GIS maps showing vulnerable roads, villages, and infrastructure
5. **Enable citizen reporting** so field officials and villagers can upload geo-tagged photos of cracks, slope movements, and blocked roads
6. **Work offline** in remote areas with low network connectivity

---

## Requirements Breakdown (from Problem Statement)

The problem statement specifies these capabilities:

| # | Requirement | Our Implementation | Status |
|---|---|---|---|
| a | Collect & analyze rainfall, soil moisture, satellite, terrain, historical data | NASA GLC catalog, IMD rainfall data, terrain factors, NDVI vegetation index | ✅ Done |
| b | AI/ML models to identify high-risk zones and predict landslides | XGBoost classifier (80% accuracy) trained on 1,600 NER samples | ✅ Done |
| c | Real-time alerts to authorities and communities | Socket.IO real-time + multi-channel alert system (in-app, dashboard) | ✅ Done |
| d | GIS mapping of vulnerable roads, villages, infrastructure | Leaflet.js heatmap with risk zones, click-to-predict anywhere | ✅ Done |
| e | Geo-tagged photo/video upload of cracks, slope movements, blocked roads | React Native mobile app with camera, GPS, and offline queue | ✅ Scaffolded |
| f | Dashboard: risk severity, road status, weather forecasts, emergency prioritization | React admin dashboard with stats cards, alerts, risk summary | ✅ Done |
| g | Multilingual notifications | Alert model has Assamese, Bengali, Hindi, Manipuri, Mizo translations | ✅ Done |
| h | Low-network/offline functionality | Mobile app queues reports locally, syncs when online | ✅ Done |
| i | Integration with IMD weather APIs | Weather service connects to IMD API (with demo fallback) | ⚠️ Partial |
| j | Satellite feeds integration | NDVI acquisition script (MODIS/Sentinel-2 via openEO) | ⚠️ Partial |
| k | SMS-based early warning system | Alert model supports SMS channel, no Twilio/SMS provider yet | ❌ Not done |
| l | Cloud-based architecture | Docker Compose ready, needs cloud deployment | ❌ Not done |
| m | Sensor data integration | Data models support sensor data, no IoT ingestion yet | ❌ Not done |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    DATA SOURCES                          │
│  IMD API │ NASA GLC │ Sentinel-2 │ Soil Sensors │ GEE   │
└──────────────┬───────────────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────────────┐
│         BACKEND (Node.js + Express + MongoDB)            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │ Weather API │  │ ML Predict  │  │ GIS Service │      │
│  │  Service    │  │   Service   │  │ (GeoJSON)   │      │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘      │
│         └────────┬───────┘                 │             │
│              ┌───▼────┐             ┌──────▼──────┐      │
│              │ MongoDB │             │  Socket.IO  │      │
│              │  +GIS   │             │  Real-time  │      │
│              └─────────┘             └──────┬──────┘      │
└─────────────────────────────────────────────┼────────────┘
               │                              │
    ┌──────────▼──────────┐    ┌──────────────▼────────────┐
    │  ADMIN DASHBOARD    │    │    MOBILE APP              │
    │  React + Leaflet.js │    │    React Native            │
    │  GIS Heatmap        │    │    Field Reporting         │
    │  Risk Visualization │    │    Offline Sync            │
    │  Alert Management   │    │    Geo-tagged Uploads      │
    └─────────────────────┘    └───────────────────────────┘
               │
    ┌──────────▼──────────┐
    │  ML MICROSERVICE    │
    │  Python + FastAPI   │
    │  XGBoost Model      │
    │  80% Accuracy       │
    └─────────────────────┘
```

---

## Target Users

| User Type | Role | What They Do |
|---|---|---|
| **Super Admin** | National/state-level oversight | View all districts, manage users, issue region-wide alerts |
| **District Admin** | District disaster management | Monitor district risk zones, issue local alerts, view reports |
| **Field Officer** | On-ground assessment | Visit reported sites, upload photos, update event status |
| **Villager/Citizen** | Community member | Report cracks, slope movements; receive alerts on phone |

---

## MVP Scope (Time-Constrained)

Given the tight SIH deadline, the MVP focuses on **demonstrating the core loop**:

1. **Data → Prediction**: Show the ML model analyzing terrain + weather data and outputting risk scores
2. **Prediction → Visualization**: Show risk scores on a GIS heatmap that admins can interact with
3. **Prediction → Alerting**: Show the system generating and distributing alerts when risk is high
4. **Citizen → System → Admin**: Show a villager submitting a geo-tagged report that appears on the admin dashboard in real-time

**The MVP does NOT need:**
- Real-time IMD API integration (demo data works)
- Live satellite feeds (pre-computed NDVI works)
- SMS delivery (in-app alerts sufficient for demo)
- Cloud deployment (local Docker is fine)
- IoT sensor ingestion (synthetic data works)
- 100% ML accuracy (80% is good enough to demonstrate the concept)

---

## Data Pipeline

```
Raw Data (Kaggle)          Processed Data              Model
─────────────────          ────────────────            ─────
NASA GLC catalog    ──►    nasa_glc_prepared.csv      
                          india_rainfall_ner.csv   ──►  XGBoost
                          ner_training_data.csv    ──►  Classifier
NDVI (MODIS)        ──►    ndvi_modis_ner.csv      ──►  (80% acc)
Risk Factors        ──►    ner_training_data_      ──►
                              with_ndvi.csv
```

---

## Key Design Decisions

1. **Microservice architecture** — ML service is separate (Python) from the backend (Node.js). This lets us use XGBoost/scikit-learn without cross-language issues.

2. **Rule-based fallback** — If the ML model isn't loaded or trained, the backend falls back to a weighted scoring formula. The system always works, even without ML.

3. **GeoJSON-first** — All spatial data uses MongoDB's GeoJSON and 2dsphere indexes. Risk zones, alerts, and events are all geospatially queryable.

4. **District-scoped real-time** — Socket.IO events are broadcast per district, not globally. An admin in Assam doesn't get flooded with Manipur alerts.

5. **Offline-first mobile** — Reports are queued in AsyncStorage and synced when network returns. Essential for remote NER villages with patchy connectivity.

6. **Multilingual from day one** — The Alert model stores translations in Assamese, Bengali, Hindi, Manipuri, and Mizo. Not an afterthought.

---

## License

MIT

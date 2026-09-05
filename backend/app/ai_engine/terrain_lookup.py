"""
GeoShield Terrain Lookup Service
Provides nearest-neighbor lookup against real terrain datasets to enrich
predictions with location-specific slope, elevation, NDVI, and soil moisture.
Uses:
- NER Training Data (12,000 samples with real terrain features)
- Real elevation, slope, NDVI, soil moisture data from actual NER coordinates
"""
import os
import numpy as np
import pandas as pd
from typing import Dict, Optional

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "datasets", "processed")


class TerrainLookup:
    """Nearest-neighbor terrain data enrichment for NER region."""

    def __init__(self):
        self.ner_terrain = None
        self._loaded = False

    def _ensure_loaded(self):
        """Lazy-load datasets on first use."""
        if self._loaded:
            return

        ner_path = os.path.join(DATA_DIR, "real_ner_training_data.csv")
        if os.path.exists(ner_path):
            try:
                self.ner_terrain = pd.read_csv(ner_path)
                print(f"[TerrainLookup] Loaded NER terrain data: {len(self.ner_terrain)} points")
            except Exception as e:
                print(f"[TerrainLookup] Failed to load NER terrain: {e}")

        if self.ner_terrain is None:
            demo_path = os.path.join(DATA_DIR, "demo_ner_data.csv")
            if os.path.exists(demo_path):
                try:
                    self.ner_terrain = pd.read_csv(demo_path)
                    print(f"[TerrainLookup] Loaded demo NER data: {len(self.ner_terrain)} points")
                except Exception as e:
                    print(f"[TerrainLookup] Failed to load demo data: {e}")

        self._loaded = True

    def _haversine_km(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance in km between two lat/lng points using Haversine."""
        R = 6371  # Earth radius in km
        lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
        return R * 2 * np.arcsin(np.sqrt(a))

    def get_nearest_terrain(self, lat: float, lng: float, k: int = 5) -> Dict:
        """
        Find the k nearest terrain data points and return weighted-average features.
        Returns dict with: slope, elevation, ndvi, soil_moisture, distance_to_road, aspect
        """
        self._ensure_loaded()

        defaults = {
            "slope": 25.0,
            "elevation": 800.0,
            "ndvi": 0.55,
            "soil_moisture": 0.35,
            "distance_to_road": 1500.0,
            "aspect": 180.0,
            "source": "defaults",
        }

        if self.ner_terrain is None or len(self.ner_terrain) == 0:
            return defaults

        ner = self.ner_terrain
        distances = ner.apply(
            lambda row: self._haversine_km(lat, lng, row["latitude"], row["longitude"]),
            axis=1,
        )

        nearest_idx = distances.nsmallest(k).index
        nearest = ner.iloc[nearest_idx]
        nearest_dists = distances.iloc[nearest_idx]

        weights = 1.0 / (nearest_dists.values + 0.01)
        weights = weights / weights.sum()

        result = {}
        feature_cols = {
            "slope": "slope",
            "elevation": "elevation",
            "ndvi": "ndvi",
            "soil_moisture": "soil_moisture",
            "distance_to_road": "distance_to_road",
            "aspect": "aspect",
        }

        for feature, col in feature_cols.items():
            if col in nearest.columns:
                values = nearest[col].fillna(nearest[col].median()).values
                result[feature] = float(np.average(values, weights=weights))
            else:
                result[feature] = defaults[feature]

        result["source"] = "terrain_lookup"
        result["nearest_distance_km"] = float(nearest_dists.min())
        result["nearest_points"] = k

        # Clamp values to reasonable ranges
        result["slope"] = max(0, min(90, result["slope"]))
        result["ndvi"] = max(0, min(1, result["ndvi"]))
        result["soil_moisture"] = max(0, min(1, result["soil_moisture"]))
        result["elevation"] = max(0, min(8000, result["elevation"]))

        return result

    def enrich_features(self, lat: float, lng: float, provided_features: Dict = None) -> Dict:
        """
        Enrich a prediction request with real terrain data.
        Takes user-provided features and replaces missing/zero values with nearest-neighbor lookups.
        """
        provided = provided_features or {}
        terrain = self.get_nearest_terrain(lat, lng)

        enriched = {
            "latitude": lat,
            "longitude": lng,
            "slope": provided.get("slope") if provided.get("slope") and provided["slope"] != 25 else terrain["slope"],
            "aspect": provided.get("aspect") if provided.get("aspect") and provided["aspect"] != 180 else terrain["aspect"],
            "elevation": provided.get("elevation") if provided.get("elevation") and provided["elevation"] != 500 else terrain["elevation"],
            "rainfall_current": provided.get("rainfall_current", 0),
            "rainfall_24hr": provided.get("rainfall_24hr", 0),
            "rainfall_7days": provided.get("rainfall_7days", provided.get("rainfall_24hr", 0)),
            "ndvi": (
                provided.get("ndvi")
                if provided.get("ndvi") and provided["ndvi"] != 0.5
                else terrain["ndvi"]
            ),
            "soil_moisture": (
                provided.get("soil_moisture")
                if provided.get("soil_moisture") and provided["soil_moisture"] != 0.3
                else terrain["soil_moisture"]
            ),
            "distance_to_road": (
                provided.get("distance_to_road")
                if provided.get("distance_to_road") and provided["distance_to_road"] != 1000
                else terrain["distance_to_road"]
            ),
        }

        enriched["_terrain_source"] = terrain["source"]
        enriched["_nearest_distance_km"] = terrain.get("nearest_distance_km", 0)
        return enriched


# Singleton
terrain_lookup = TerrainLookup()

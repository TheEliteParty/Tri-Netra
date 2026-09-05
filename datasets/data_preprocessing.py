"""
Data preprocessing utilities for NASA Global Landslide Catalog
and terrain/rainfall datasets.
"""
import os
import pandas as pd
import numpy as np
from typing import Optional


def load_nasa_glc(csv_path: str) -> pd.DataFrame:
    """
    Load and preprocess NASA Global Landslide Catalog.
    Expected columns: event_date, location_latitude, location_longitude,
    landslide_category, landslide_trigger, storm_peak, dist_trigger_val, etc.
    """
    df = pd.read_csv(csv_path, low_memory=False)

    # Standardize column names
    df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')

    # Filter for NER region (approximate bounding box)
    ner_bounds = {
        'lat_min': 21.0, 'lat_max': 30.0,
        'lon_min': 88.0, 'lon_max': 98.0,
    }

    if 'location_latitude' in df.columns and 'location_longitude' in df.columns:
        ner_df = df[
            (df['location_latitude'] >= ner_bounds['lat_min']) &
            (df['location_latitude'] <= ner_bounds['lat_max']) &
            (df['location_longitude'] >= ner_bounds['lon_min']) &
            (df['location_longitude'] <= ner_bounds['lon_max'])
        ].copy()
        print(f"📊 Filtered to {len(ner_df)} NER events from {len(df)} total")
    else:
        ner_df = df.copy()
        print(f"⚠️  No lat/lng columns found, using all {len(ner_df)} records")

    return ner_df


def preprocess_for_training(df: pd.DataFrame) -> tuple:
    """
    Prepare features and labels for model training.
    Returns (X, y, feature_names)
    """
    feature_cols = []

    # Map available columns to feature names
    col_mapping = {
        'location_latitude': 'latitude',
        'latitude': 'latitude',
        'location_longitude': 'longitude',
        'longitude': 'longitude',
        'slope': 'slope',
        'aspect': 'aspect',
        'elevation': 'elevation',
        'dem': 'elevation',
        'ndvi': 'ndvi',
        'soil_moisture': 'soil_moisture',
        'dist_trigger_val': 'rainfall_24hr',
        'storm_peak': 'rainfall_current',
        'dist_road': 'distance_to_road',
        'distance_road': 'distance_to_road',
    }

    available_features = {}
    for src, tgt in col_mapping.items():
        if src in df.columns:
            available_features[tgt] = df[src].values

    # Fill missing features with defaults
    defaults = {
        'latitude': 0, 'longitude': 0, 'slope': 20, 'aspect': 180,
        'elevation': 500, 'rainfall_24hr': 0, 'rainfall_7days': 0,
        'ndvi': 0.5, 'soil_moisture': 0.3, 'distance_to_road': 1000,
    }

    feature_names = list(defaults.keys())
    X = np.zeros((len(df), len(feature_names)))

    for i, fname in enumerate(feature_names):
        if fname in available_features:
            X[:, i] = available_features[fname]
        else:
            X[:, i] = defaults[fname]

    # Handle NaN
    for i in range(X.shape[1]):
        col = X[:, i]
        nan_mask = np.isnan(col)
        if nan_mask.any():
            col[nan_mask] = np.nanmedian(col[~nan_mask]) if (~nan_mask).any() else defaults[feature_names[i]]
            X[:, i] = col

    # Create labels
    if 'landslide_category' in df.columns:
        y = (~df['landslide_category'].isna()).astype(int).values
    elif 'landslide_trigger' in df.columns:
        y = (~df['landslide_trigger'].isna()).astype(int).values
    else:
        # Synthetic labels based on feature thresholds
        y = np.zeros(len(df))
        for i in range(len(df)):
            risk_factors = 0
            if X[i, feature_names.index('rainfall_24hr')] > 50:
                risk_factors += 1
            if X[i, feature_names.index('slope')] > 30:
                risk_factors += 1
            if X[i, feature_names.index('ndvi')] < 0.4:
                risk_factors += 1
            y[i] = 1 if risk_factors >= 2 else 0

    return X, y.astype(int), feature_names


def generate_demo_ner_data(n_samples: int = 500) -> pd.DataFrame:
    """
    Generate synthetic demo data for NER region when real datasets aren't available.
    Creates realistic-looking terrain and rainfall data for testing.
    """
    np.random.seed(42)

    # NER district centers
    districts = {
        'Guwahati': (26.14, 91.74),
        'Dibrugarh': (27.47, 94.91),
        'Jorhat': (26.75, 94.22),
        'Tezpur': (26.65, 92.80),
        'Shillong': (25.58, 91.89),
        'Imphal': (24.81, 93.94),
        'Aizawl': (23.73, 92.72),
        'Kohima': (25.66, 94.11),
        'Itanagar': (27.10, 93.62),
        'Agartala': (23.83, 91.28),
    }

    data = []
    for _ in range(n_samples):
        district = np.random.choice(list(districts.keys()))
        base_lat, base_lng = districts[district]

        lat = base_lat + np.random.normal(0, 0.3)
        lng = base_lng + np.random.normal(0, 0.3)

        # NER terrain characteristics
        elevation = np.random.uniform(100, 2500)
        slope = np.clip(np.random.beta(2, 5) * 60, 0, 70)
        aspect = np.random.uniform(0, 360)

        # Monsoon rainfall patterns
        month = np.random.choice(range(6, 10))  # Jun-Sep
        base_rainfall = {6: 200, 7: 350, 8: 300, 9: 200}[month]
        rainfall_24hr = np.random.exponential(base_rainfall / 30)
        rainfall_7days = rainfall_24hr * np.random.uniform(3, 10)

        ndvi = np.clip(np.random.normal(0.55, 0.2), 0.05, 0.95)
        soil_moisture = np.clip(np.random.beta(3, 2), 0, 1)
        distance_to_road = np.random.exponential(2000)

        # Binary landslide label based on realistic triggers
        landslide_prob = (
            0.1 * (rainfall_24hr > 100) +
            0.15 * (slope > 35) +
            0.1 * (ndvi < 0.3) +
            0.1 * (soil_moisture > 0.7) +
            0.05 * (rainfall_7days > 500) +
            0.05 * (distance_to_road < 500)  # Human activity near roads
        )
        is_landslide = int(np.random.random() < min(landslide_prob, 0.8))

        data.append({
            'latitude': round(lat, 4),
            'longitude': round(lng, 4),
            'district': district,
            'state': 'NER',
            'elevation': round(elevation, 1),
            'slope': round(slope, 1),
            'aspect': round(aspect, 1),
            'rainfall_24hr': round(rainfall_24hr, 1),
            'rainfall_7days': round(rainfall_7days, 1),
            'ndvi': round(ndvi, 3),
            'soil_moisture': round(soil_moisture, 3),
            'distance_to_road': round(distance_to_road, 1),
            'month': month,
            'landslide': is_landslide,
        })

    return pd.DataFrame(data)

"""
Landslide Risk Prediction Model

Uses XGBoost classifier trained on NASA Global Landslide Catalog + terrain features.
Falls back to rule-based scoring when the trained model is unavailable.
"""
import os
import numpy as np
import pandas as pd
from typing import Optional, Dict, Tuple

try:
    import xgboost as xgb
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import classification_report, accuracy_score
    from sklearn.preprocessing import LabelEncoder
    HAS_ML = True
except ImportError:
    HAS_ML = False

import joblib

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'models', 'trained')
MODEL_PATH = os.path.join(MODEL_DIR, 'landslide_model.pkl')
ENCODER_PATH = os.path.join(MODEL_DIR, 'label_encoder.pkl')


class LandslidePredictor:
    """Landslide susceptibility prediction engine."""

    def __init__(self):
        self.model = None
        self.label_encoder = None
        self.model_loaded = False
        self.feature_names = [
            'latitude', 'longitude', 'slope', 'aspect', 'elevation',
            'rainfall_7days', 'ndvi', 'soil_moisture',
            'distance_to_road'
        ]
        self._try_load_model()

    def _try_load_model(self):
        """Attempt to load a pre-trained model from disk."""
        if not HAS_ML:
            print("⚠️  scikit-learn/xgboost not installed — using rule-based fallback")
            return

        if os.path.exists(MODEL_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
                if os.path.exists(ENCODER_PATH):
                    self.label_encoder = joblib.load(ENCODER_PATH)
                self.model_loaded = True
                print("✅ ML model loaded successfully")
            except Exception as e:
                print(f"❌ Failed to load model: {e}")
        else:
            print("⚠️  No trained model found — using rule-based fallback")

    def train(self, csv_path: str) -> Dict:
        """Train the model on NASA GLC or similar dataset."""
        if not HAS_ML:
            return {"error": "scikit-learn/xgboost not installed"}

        print(f"📊 Loading training data from {csv_path}...")
        df = pd.read_csv(csv_path)

        # Expected columns (flexible mapping for NASA GLC format)
        column_map = self._detect_columns(df)
        df = df.rename(columns=column_map)

        # Drop rows with missing critical features
        required = ['latitude', 'longitude', 'slope', 'rainfall_24hr']
        available_required = [c for c in required if c in df.columns]
        df = df.dropna(subset=available_required)

        # Fill remaining NaN with median
        for col in self.feature_names:
            if col in df.columns:
                df[col] = df[col].fillna(df[col].median())
            else:
                df[col] = 0

        # Prepare features
        X = df[self.feature_names].values

        # Prepare labels — binary: landslide vs no landslide
        if 'label' in df.columns:
            y = df['label'].values
        elif 'landslide' in df.columns:
            y = (df['landslide'] > 0).astype(int).values
        else:
            # If no label column, create synthetic labels from risk scoring
            y = self._create_synthetic_labels(df)

        # Encode labels if categorical
        if y.dtype == object or len(np.unique(y)) > 2:
            self.label_encoder = LabelEncoder()
            y = self.label_encoder.fit_transform(y)
            joblib.dump(self.label_encoder, ENCODER_PATH)

        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y if len(np.unique(y)) > 1 else None
        )

        # Train XGBoost
        print(f"🏋️ Training XGBoost on {len(X_train)} samples...")
        n_pos = int((y_train == 1).sum())
        n_neg = int((y_train == 0).sum())
        self.model = xgb.XGBClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            eval_metric='logloss',
            random_state=42,
            scale_pos_weight=max(n_neg, 1) / max(n_pos, 1),
        )
        self.model.fit(X_train, y_train)

        # Evaluate
        y_pred = self.model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        report = classification_report(y_test, y_pred, output_dict=True)

        # Save model
        os.makedirs(MODEL_DIR, exist_ok=True)
        joblib.dump(self.model, MODEL_PATH)
        self.model_loaded = True

        print(f"✅ Model trained — Accuracy: {accuracy:.3f}")

        return {
            "accuracy": float(accuracy),
            "report": report,
            "training_samples": len(X_train),
            "test_samples": len(X_test),
            "features": self.feature_names,
        }

    def predict(self, features: Dict) -> Dict:
        """Predict landslide risk for a single location."""
        if self.model_loaded and self.model is not None:
            return self._ml_predict(features)
        return self._rule_based_predict(features)

    def _ml_predict(self, features: Dict) -> Dict:
        """Use the trained XGBoost model for prediction."""
        feature_vector = np.array([[
            features.get('latitude', 0),
            features.get('longitude', 0),
            features.get('slope', 20),
            features.get('aspect', 180),
            features.get('elevation', 500),
            features.get('rainfall_7days', features.get('rainfall_24hr', 0)),
            features.get('ndvi', 0.5),
            features.get('soil_moisture', 0.3),
            features.get('distance_to_road', 1000),
        ]])

        prediction = self.model.predict(feature_vector)[0]
        probabilities = self.model.predict_proba(feature_vector)[0]

        risk_score = float(probabilities[1] * 100) if len(probabilities) > 1 else float(prediction * 100)
        confidence = float(np.max(probabilities))

        return {
            "risk_score": round(min(100, max(0, risk_score)), 1),
            "risk_level": self._score_to_level(risk_score),
            "confidence": round(confidence, 3),
            "source": "ml_model",
            "factors": self._explain_factors(features),
        }

    def _rule_based_predict(self, features: Dict) -> Dict:
        """Rule-based fallback when ML model is not available."""
        score = 0.0

        # Rainfall contribution (0-35)
        rainfall = features.get('rainfall_24hr', 0) or features.get('rainfall_current', 0) or 0
        if rainfall > 100:
            score += 35
        elif rainfall > 60:
            score += 25
        elif rainfall > 30:
            score += 15
        elif rainfall > 10:
            score += 5

        # Cumulative rainfall bonus (0-10)
        rain_7d = features.get('rainfall_7days', 0) or 0
        if rain_7d > 300:
            score += 10
        elif rain_7d > 150:
            score += 5

        # Slope (0-25)
        slope = features.get('slope', 25) or 25
        if slope > 45:
            score += 25
        elif slope > 30:
            score += 18
        elif slope > 15:
            score += 10
        else:
            score += 3

        # Vegetation — low NDVI = high risk (0-20)
        ndvi = features.get('ndvi', 0.5)
        if ndvi is not None:
            score += max(0, (1 - max(0, ndvi)) * 20)
        else:
            score += 8  # Unknown vegetation = moderate risk

        # Soil moisture (0-10)
        moisture = features.get('soil_moisture', 0.3)
        if moisture is not None:
            score += moisture * 10

        # Base terrain risk for NER region (0-10)
        score += 8

        score = min(100, max(0, score))
        confidence = 0.55  # Low confidence for rule-based

        return {
            "risk_score": round(score, 1),
            "risk_level": self._score_to_level(score),
            "confidence": confidence,
            "source": "rule_based",
            "factors": self._explain_factors(features),
        }

    def _score_to_level(self, score: float) -> str:
        if score >= 80:
            return "critical"
        elif score >= 60:
            return "very_high"
        elif score >= 40:
            return "high"
        elif score >= 20:
            return "moderate"
        return "low"

    def _explain_factors(self, features: Dict) -> Dict:
        """Return human-readable factor contributions."""
        factors = {}
        rainfall = features.get('rainfall_24hr', 0) or features.get('rainfall_current', 0) or 0
        factors['rainfall_risk'] = 'high' if rainfall > 60 else 'moderate' if rainfall > 30 else 'low'

        slope = features.get('slope', 25) or 25
        factors['slope_risk'] = 'high' if slope > 35 else 'moderate' if slope > 15 else 'low'

        ndvi = features.get('ndvi', 0.5)
        factors['vegetation_risk'] = 'high' if ndvi is not None and ndvi < 0.3 else 'moderate' if ndvi is not None and ndvi < 0.6 else 'low'

        return factors

    def _create_synthetic_labels(self, df: pd.DataFrame) -> np.ndarray:
        """Create binary labels from feature thresholds (for demo training)."""
        labels = np.zeros(len(df))
        for i, row in df.iterrows():
            risk = 0
            if row.get('rainfall_24hr', 0) > 50:
                risk += 1
            if row.get('slope', 0) > 30:
                risk += 1
            if row.get('ndvi', 1) < 0.4:
                risk += 1
            labels[i] = 1 if risk >= 2 else 0
        return labels.astype(int)

    def _detect_columns(self, df: pd.DataFrame) -> Dict[str, str]:
        """Auto-detect column mapping for different dataset formats."""
        mapping = {}
        col_lower = {c.lower(): c for c in df.columns}

        # NASA GLC column names
        glc_map = {
            'latitude': 'latitude',
            'longitude': 'longitude',
            'location_latitude': 'latitude',
            'location_longitude': 'longitude',
            'dist_trigger_val': 'rainfall_24hr',
            'storm_peak': 'rainfall_current',
            'humans_affected': None,
            'landslide_category': 'label',
            'landslide_trigger': None,
        }

        for source, target in glc_map.items():
            if source in col_lower and target:
                mapping[col_lower[source]] = target

        # Try common terrain column names
        terrain_map = {
            'slope': 'slope',
            'aspect': 'aspect',
            'elevation': 'elevation',
            'dem': 'elevation',
            'ndvi': 'ndvi',
            'soil_moisture': 'soil_moisture',
            'dist_road': 'distance_to_road',
            'distance_road': 'distance_to_road',
        }
        for source, target in terrain_map.items():
            if source in col_lower:
                mapping[col_lower[source]] = target

        return mapping

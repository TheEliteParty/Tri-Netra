"""
Spectral Preprocessor for Multispectral Satellite Imagery & Geomorphic Features.
Adapted from: https://github.com/Eb3ls/landslides_segmentation/blob/main/data_utils.py
"""
import numpy as np
from typing import Dict, Any, Tuple, Optional

class SpectralPreprocessor:
    """
    Handles multispectral band normalization, NDVI computation, and tensor preparation
    according to the landslides_segmentation methodology.
    """

    @staticmethod
    def normalize(data: np.ndarray, min_val: float, max_val: float) -> np.ndarray:
        """
        Normalize a numpy array based on physical feature range.
        Maps values within [min_val, max_val] to [0.0, 1.0].
        """
        if len(data.shape) < 2:
            data = data.reshape(1, -1)
        data = data.astype(np.float32, copy=True)
        mask = ~np.isnan(data)
        data[mask] = np.clip(data[mask], min_val, max_val)
        data[mask] = (data[mask] - min_val) / max(1e-6, (max_val - min_val))
        data[~mask] = 0.0
        return data

    @classmethod
    def process_sentinel_bands(
        cls,
        red: np.ndarray,
        green: np.ndarray,
        blue: np.ndarray,
        nir: np.ndarray,
        slope: Optional[np.ndarray] = None,
        ndvi: Optional[np.ndarray] = None,
    ) -> np.ndarray:
        """
        Prepare a 6-channel normalized tensor:
        Channel 0: Red (B4) [0, 10000] -> [0, 1]
        Channel 1: Green (B3) [0, 10000] -> [0, 1]
        Channel 2: Blue (B2) [0, 10000] -> [0, 1]
        Channel 3: Near-Infrared (B8) [0, 10000] -> [0, 1]
        Channel 4: NDVI [-1, 1] -> [0, 1]
        Channel 5: DEM Slope [0, 90 deg] -> [0, 1]
        """
        r_norm = cls.normalize(red, 0, 10000)
        g_norm = cls.normalize(green, 0, 10000)
        b_norm = cls.normalize(blue, 0, 10000)
        nir_norm = cls.normalize(nir, 0, 10000)

        if ndvi is None:
            denom = nir.astype(np.float32) + red.astype(np.float32) + 1e-6
            computed_ndvi = (nir.astype(np.float32) - red.astype(np.float32)) / denom
            ndvi_norm = cls.normalize(computed_ndvi, -1, 1)
        else:
            ndvi_norm = cls.normalize(ndvi, -1, 1)

        if slope is None:
            # Default slope plane if not provided
            slope_norm = np.full_like(r_norm, fill_value=0.35)
        else:
            slope_norm = cls.normalize(slope, 0, 90)

        # Stack into shape (6, H, W)
        return np.stack([r_norm, g_norm, b_norm, nir_norm, ndvi_norm, slope_norm], axis=0)

    @classmethod
    def generate_synthetic_patch_from_station(
        cls,
        station_name: str,
        lat: float,
        lng: float,
        slope_angle: float,
        ndvi_val: float,
        soil_moisture: float,
        rainfall_24h: float,
        patch_size: int = 64
    ) -> Dict[str, Any]:
        """
        Generate a realistic multispectral Sentinel-2 patch (RGB, NIR, Slope, NDVI)
        calibrated for a specific NER station using its terrain and meteorological attributes.
        """
        np.random.seed(int((abs(lat) * 1000 + abs(lng) * 100 + slope_angle * 10) % 100000))

        # Spatial grid coordinates
        y, x = np.mgrid[0:patch_size, 0:patch_size]
        cx, cy = patch_size / 2.0, patch_size / 2.0
        dist_center = np.sqrt((x - cx)**2 + (y - cy)**2) / (patch_size / 2.0)

        # Base terrain texture (perlin-like noise with hill gradients)
        slope_rad = np.radians(slope_angle)
        gradient = (y / patch_size) * np.sin(slope_rad) + (x / patch_size) * np.cos(slope_rad)
        texture = np.random.normal(0, 0.05, (patch_size, patch_size)) + gradient * 0.3

        # Simulated multispectral reflectance values (Sentinel-2 L2A BOA reflectance scaled 0-10000)
        # Vegetation has high NIR (~4000-8000), low Red (~300-800)
        # Bare soil / scar has high Red (~1500-3000), moderate NIR (~2000-3500)
        # Higher rainfall/moisture darkens visible reflectance
        moisture_factor = 1.0 - (soil_moisture / 100.0) * 0.25

        base_red = (800 * (1 - ndvi_val) + 350 * ndvi_val + texture * 400) * moisture_factor
        base_green = (950 * (1 - ndvi_val) + 600 * ndvi_val + texture * 300) * moisture_factor
        base_blue = (600 * (1 - ndvi_val) + 300 * ndvi_val + texture * 200) * moisture_factor
        base_nir = (1500 * (1 - ndvi_val) + 5500 * ndvi_val + texture * 600) * moisture_factor

        # Add simulated geological fault / slope disturbance patch for high risk stations
        if slope_angle > 35 or rainfall_24h > 40:
            # Fault scar zone
            scar_mask = (dist_center < 0.45) & (texture > 0.08)
            base_red[scar_mask] += 1200  # Exposed sediment / bare soil
            base_nir[scar_mask] -= 1800  # Depleted canopy
            slope_grid = slope_angle + texture * 12
            slope_grid[scar_mask] += 8.0
        else:
            slope_grid = slope_angle + texture * 6

        red_band = np.clip(base_red, 100, 9500)
        green_band = np.clip(base_green, 100, 9500)
        blue_band = np.clip(base_blue, 100, 9500)
        nir_band = np.clip(base_nir, 200, 9800)
        slope_band = np.clip(slope_grid, 0, 85)

        # Compute accurate NDVI
        denom = nir_band + red_band + 1e-6
        ndvi_grid = (nir_band - red_band) / denom
        ndvi_grid = np.clip(ndvi_grid, -1.0, 1.0)

        tensor_6ch = cls.process_sentinel_bands(
            red=red_band,
            green=green_band,
            blue=blue_band,
            nir=nir_band,
            slope=slope_band,
            ndvi=ndvi_grid
        )

        return {
            "station_name": station_name,
            "lat": lat,
            "lng": lng,
            "patch_size": patch_size,
            "bands": {
                "red": red_band.tolist(),
                "green": green_band.tolist(),
                "blue": blue_band.tolist(),
                "nir": nir_band.tolist(),
                "slope": slope_band.tolist(),
                "ndvi": ndvi_grid.tolist()
            },
            "tensor": tensor_6ch
        }

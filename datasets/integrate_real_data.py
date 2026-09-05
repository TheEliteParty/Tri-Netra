"""
GeoShield Real Data Integration Script
Processes SRTM DEM and Sentinel-2 NDVI data to replace simulated values.

Usage:
1. Download SRTM DEM GeoTIFF from USGS EarthExplorer
2. Download Sentinel-2 NDVI from Copernicus Data Space
3. Place files in datasets/satellite/dem/ and datasets/satellite/ndvi/
4. Run: python3 integrate_real_data.py
"""
import os
import json
import csv
import math

# NER sensor station coordinates
NER_STATIONS = [
    {"station_id": "NER-001", "name": "Gangtok North Slope", "lat": 27.3389, "lng": 88.6065, "state": "Sikkim", "district": "Gangtok"},
    {"station_id": "NER-002", "name": "Mangan Hill Monitor", "lat": 27.5124, "lng": 88.5281, "state": "Sikkim", "district": "Mangan"},
    {"station_id": "NER-003", "name": "Namchi Valley Watch", "lat": 27.1684, "lng": 88.5510, "state": "Sikkim", "district": "Namchi"},
    {"station_id": "NER-004", "name": "Guwahati Foothills", "lat": 26.1445, "lng": 91.7362, "state": "Assam", "district": "Kamrup"},
    {"station_id": "NER-005", "name": "Karbi Anglong Slope", "lat": 25.8440, "lng": 93.4300, "state": "Assam", "district": "Karbi Anglong"},
    {"station_id": "NER-006", "name": "Imphal Valley Edge", "lat": 24.8170, "lng": 93.9368, "state": "Manipur", "district": "Imphal East"},
    {"station_id": "NER-007", "name": "Churachandpur Hills", "lat": 24.3322, "lng": 93.6825, "state": "Manipur", "district": "Churachandpur"},
    {"station_id": "NER-008", "name": "Aizawl Ridge Monitor", "lat": 23.7271, "lng": 92.7176, "state": "Mizoram", "district": "Aizawl"},
    {"station_id": "NER-009", "name": "Lunglei Slope Watch", "lat": 22.9000, "lng": 92.7500, "state": "Mizoram", "district": "Lunglei"},
    {"station_id": "NER-010", "name": "Shillong Plateau Edge", "lat": 25.5788, "lng": 91.8933, "state": "Meghalaya", "district": "East Khasi Hills"},
    {"station_id": "NER-011", "name": "Cherrapunji Monitor", "lat": 25.2838, "lng": 91.7344, "state": "Meghalaya", "district": "East Khasi Hills"},
    {"station_id": "NER-012", "name": "Tura Hills Watch", "lat": 25.5140, "lng": 90.2200, "state": "Meghalaya", "district": "West Garo Hills"},
    {"station_id": "NER-013", "name": "Kohima Ridge", "lat": 25.6586, "lng": 94.1086, "state": "Nagaland", "district": "Kohima"},
    {"station_id": "NER-014", "name": "Dimapur Lowlands", "lat": 25.9000, "lng": 93.7266, "state": "Nagaland", "district": "Dimapur"},
    {"station_id": "NER-015", "name": "Agartala Slope Monitor", "lat": 23.8315, "lng": 91.2868, "state": "Tripura", "district": "West Tripura"},
    {"station_id": "NER-016", "name": "Itanagar Foothills", "lat": 27.0844, "lng": 93.6920, "state": "Arunachal Pradesh", "district": "Papum Pare"},
    {"station_id": "NER-017", "name": "Ziro Valley Watch", "lat": 27.5887, "lng": 93.8492, "state": "Arunachal Pradesh", "district": "Lower Subansiri"},
    {"station_id": "NER-018", "name": "Pasighat Monitor", "lat": 28.0700, "lng": 95.3300, "state": "Arunachal Pradesh", "district": "East Siang"},
    {"station_id": "NER-019", "name": "Tawang Ridge", "lat": 27.5860, "lng": 91.8800, "state": "Arunachal Pradesh", "district": "Tawang"},
    {"station_id": "NER-020", "name": "Dima Hasao Watch", "lat": 25.4500, "lng": 93.1800, "state": "Assam", "district": "Dima Hasao"},
]


def extract_from_dem(lat, lng, dem_file):
    """Extract elevation and slope from SRTM DEM GeoTIFF."""
    try:
        import rasterio
        import numpy as np

        with rasterio.open(dem_file) as src:
            row, col = src.index(lng, lat)
            band = src.read(1)

            # Get elevation
            elevation = float(band[row, col])

            # Compute slope using numpy gradient
            dy, dx = np.gradient(band)
            slope = np.arctan(np.sqrt(dx**2 + dy**2)) * (180 / math.pi)
            slope_angle = float(slope[row, col])

            return elevation, slope_angle
    except ImportError:
        print("  ⚠️  rasterio not installed. Install with: pip install rasterio")
        return None, None
    except Exception as e:
        print(f"  ❌ Error reading DEM: {e}")
        return None, None


def extract_from_ndvi(lat, lng, ndvi_file):
    """Extract NDVI from Sentinel-2 GeoTIFF."""
    try:
        import rasterio
        import numpy as np

        with rasterio.open(ndvi_file) as src:
            row, col = src.index(lng, lat)
            band = src.read(1)
            ndvi = float(band[row, col])
            return ndvi
    except ImportError:
        print("  ⚠️  rasterio not installed. Install with: pip install rasterio")
        return None
    except Exception as e:
        print(f"  ❌ Error reading NDVI: {e}")
        return None


def compute_slope_from_elevation(elevation_data, lat, lng, dem_src):
    """Compute slope angle from elevation data using gradient."""
    try:
        import numpy as np

        row, col = dem_src.index(lng, lat)

        # Get 3x3 window around the point
        window_size = 3
        window = elevation_data[
            max(0, row-1):min(elevation_data.shape[0], row+2),
            max(0, col-1):min(elevation_data.shape[1], col+2)
        ]

        if window.shape[0] < 2 or window.shape[1] < 2:
            return 0.0

        dy, dx = np.gradient(window)
        slope = np.arctan(np.sqrt(dx**2 + dy**2)) * (180 / math.pi)
        return float(slope[window_size//2, window_size//2])
    except Exception:
        return 0.0


def main():
    print("=" * 60)
    print("  GeoShield Real Data Integration")
    print("=" * 60)
    print()

    # Check for DEM files
    dem_dir = "satellite/dem"
    ndvi_dir = "satellite/ndvi"

    dem_files = []
    ndvi_files = []

    if os.path.exists(dem_dir):
        dem_files = [f for f in os.listdir(dem_dir) if f.endswith('.tif')]

    if os.path.exists(ndvi_dir):
        ndvi_files = [f for f in os.listdir(ndvi_dir) if f.endswith('.tif')]

    print(f"📂 Found {len(dem_files)} DEM files in {dem_dir}/")
    print(f"📂 Found {len(ndvi_files)} NDVI files in {ndvi_dir}/")
    print()

    if not dem_files and not ndvi_files:
        print("📋 No satellite data found. To integrate real data:")
        print()
        print("  1. SRTM DEM (terrain/elevation):")
        print("     Sign up: https://earthexplorer.usgs.gov/")
        print("     Download: SRTM 1 Arc-Second Global for NER region")
        print("     Place .tif files in: datasets/satellite/dem/")
        print()
        print("  2. Sentinel-2 NDVI (vegetation):")
        print("     Sign up: https://dataspace.copernicus.eu/")
        print("     Download: NDVI visualization for NER region")
        print("     Place .tif files in: datasets/satellite/ndvi/")
        print()
        print("  Then run this script again.")
        print()
        print("  Both accounts are FREE — no credit card needed.")
        return

    # Process available data
    results = []

    for station in NER_STATIONS:
        print(f"📍 Processing {station['station_id']}: {station['name']}...")

        elevation = None
        slope_angle = None
        ndvi = None

        # Extract from DEM
        if dem_files:
            for dem_file in dem_files:
                dem_path = os.path.join(dem_dir, dem_file)
                elev, slope = extract_from_dem(station['lat'], station['lng'], dem_path)
                if elev is not None:
                    elevation = elev
                    slope_angle = slope
                    print(f"  🏔️  DEM: Elevation={elevation:.1f}m, Slope={slope_angle:.1f}°")
                    break

        # Extract from NDVI
        if ndvi_files:
            for ndvi_file in ndvi_files:
                ndvi_path = os.path.join(ndvi_dir, ndvi_file)
                ndvi_val = extract_from_ndvi(station['lat'], station['lng'], ndvi_path)
                if ndvi_val is not None:
                    ndvi = ndvi_val
                    print(f"  🛰️  NDVI: {ndvi:.3f} (vegetation cover: {ndvi*100:.1f}%)")
                    break

        results.append({
            "station_id": station['station_id'],
            "name": station['name'],
            "lat": station['lat'],
            "lng": station['lng'],
            "state": station['state'],
            "district": station['district'],
            "elevation": elevation,
            "slope_angle": slope_angle,
            "ndvi": ndvi,
        })

    # Save results
    output_file = "processed/real_terrain_data.csv"
    os.makedirs("processed", exist_ok=True)

    with open(output_file, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "station_id", "name", "lat", "lng", "state", "district",
            "elevation", "slope_angle", "ndvi"
        ])
        writer.writeheader()
        writer.writerows(results)

    print()
    print(f"✅ Results saved to {output_file}")
    print()

    # Summary
    valid_elev = sum(1 for r in results if r['elevation'] is not None)
    valid_ndvi = sum(1 for r in results if r['ndvi'] is not None)

    print("📊 Summary:")
    print(f"  Stations processed: {len(results)}")
    print(f"  With real elevation: {valid_elev}/{len(results)}")
    print(f"  With real NDVI: {valid_ndvi}/{len(results)}")
    print()

    if valid_elev > 0 or valid_ndvi > 0:
        print("🔄 Next steps:")
        print("  1. Update seed_data.py with real terrain values")
        print("  2. Retrain AI model with real features")
        print("  3. Restart backend server")
        print("  4. Push updated data to GitHub")


if __name__ == "__main__":
    main()

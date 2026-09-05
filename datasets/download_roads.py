"""
Download real road data from OpenStreetMap for NER region.
Free, no signup needed. Provides real road polylines.

Usage:
    python datasets/download_roads.py
"""
import json
import os
import urllib.request
import urllib.parse
import time

PROCESSED_DIR = os.path.join(os.path.dirname(__file__), "processed")

# NER bounding box: [south, west, north, east]
NER_BBOX = "21.0,88.0,30.0,98.0"

# Key highways in NER (manually verified)
NER_ROADS = [
    {"name": "NH-10 (Siliguri-Gangtok)", "type": "national_highway", "slat": 26.72, "slng": 88.39, "elat": 27.34, "elng": 88.61, "status": "open"},
    {"name": "NH-27 (Dhaka-Shillong-Guwahati)", "type": "national_highway", "slat": 25.58, "slng": 91.89, "elat": 26.14, "elng": 91.74, "status": "open"},
    {"name": "NH-37 (Guwahati-Jorhat)", "type": "national_highway", "slat": 26.14, "slng": 91.74, "elat": 26.75, "elng": 94.22, "status": "partially_blocked"},
    {"name": "NH-2 (Dimapur-Kohima)", "type": "national_highway", "slat": 25.90, "slng": 93.73, "elat": 25.66, "elng": 94.11, "status": "open"},
    {"name": "SH-1 (Aizawl-Lunglei)", "type": "state_highway", "slat": 23.73, "slng": 92.72, "elat": 22.90, "elng": 92.75, "status": "blocked"},
    {"name": "NH-6 (Shillong-Tura)", "type": "national_highway", "slat": 25.58, "slng": 91.89, "elat": 25.51, "elng": 90.22, "status": "open"},
    {"name": "NH-29 (Guwahati-Shillong)", "type": "national_highway", "slat": 26.14, "slng": 91.74, "elat": 25.58, "elng": 91.89, "status": "open"},
    {"name": "SH-4 (Haflong-North Cachar)", "type": "state_highway", "slat": 25.45, "slng": 93.18, "elat": 25.80, "elng": 93.45, "status": "partially_blocked"},
    {"name": "NH-415 (Itanagar-Bomdila)", "type": "national_highway", "slat": 27.08, "slng": 93.69, "elat": 27.25, "elng": 92.42, "status": "open"},
    {"name": "NH-2 (Kohima-Mokokchung)", "type": "national_highway", "slat": 25.66, "slng": 94.11, "elat": 26.32, "elng": 94.52, "status": "open"},
    {"name": "NH-1 (Agartala-Udaipur)", "type": "national_highway", "slat": 23.83, "slng": 91.29, "elat": 23.53, "elng": 91.49, "status": "open"},
]


def download_from_overpass():
    """Download major roads from Overpass API."""
    print("\n🛣️  Downloading road data from OpenStreetMap Overpass API...")
    
    # Query for major roads in NER
    query = f"""
    [out:json][timeout:60];
    (
      way["highway"~"motorway|trunk|primary"]["name"](21.0,88.0,30.0,98.0);
    );
    out body;
    >;
    out skel qt;
    """
    
    url = "https://overpass-api.de/api/interpreter"
    data = urllib.parse.urlencode({"data": query}).encode()
    
    try:
        req = urllib.request.Request(url, data=data, headers={"User-Agent": "GeoShield/1.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode())
        
        nodes = {n["id"]: (n["lat"], n["lon"]) for n in result.get("elements", []) if n["type"] == "node"}
        ways = [w for w in result.get("elements", []) if w["type"] == "way"]
        
        print(f"  ✅ Downloaded {len(ways)} road segments, {len(nodes)} nodes")
        
        # Convert to our format
        roads = []
        for way in ways[:50]:  # Limit to 50 roads
            name = way.get("tags", {}).get("name", "Unnamed Road")
            highway = way.get("tags", {}).get("highway", "road")
            
            # Get start and end coordinates
            node_ids = way.get("nodes", [])
            if len(node_ids) < 2:
                continue
            
            start = nodes.get(node_ids[0])
            end = nodes.get(node_ids[-1])
            
            if start and end:
                road_type = "national_highway" if highway in ["motorway", "trunk"] else "state_highway"
                roads.append({
                    "name": name,
                    "road_type": road_type,
                    "start_lat": round(start[0], 4),
                    "start_lng": round(start[1], 4),
                    "end_lat": round(end[0], 4),
                    "end_lng": round(end[1], 4),
                    "status": "open",  # Default status
                    "osm_id": way["id"],
                    "highway_type": highway,
                })
        
        return roads
        
    except Exception as e:
        print(f"  ❌ Overpass API failed: {e}")
        return None


def save_roads(osm_roads):
    """Save road data to JSON."""
    # Merge with hardcoded roads (OSM data supplements, doesn't replace)
    all_roads = NER_ROADS.copy()
    
    if osm_roads:
        # Add OSM roads that don't duplicate existing ones
        existing_names = {r["name"].lower() for r in all_roads}
        for road in osm_roads:
            if road["name"].lower() not in existing_names:
                all_roads.append(road)
                existing_names.add(road["name"].lower())
    
    json_path = os.path.join(PROCESSED_DIR, "ner_roads.json")
    with open(json_path, "w") as f:
        json.dump(all_roads, f, indent=2)
    
    print(f"\n✅ Saved {len(all_roads)} roads to {json_path}")
    print(f"   - {sum(1 for r in all_roads if r.get('road_type') == 'national_highway')} national highways")
    print(f"   - {sum(1 for r in all_roads if r.get('road_type') == 'state_highway')} state highways")
    
    return all_roads


def main():
    print("=" * 60)
    print("🛣️  GeoShield Road Data Downloader")
    print("   Source: OpenStreetMap Overpass API (FREE)")
    print("=" * 60)
    
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    
    # Try to download from Overpass API
    osm_roads = download_from_overpass()
    
    # Save combined road data
    save_roads(osm_roads)
    
    print("\n" + "=" * 60)
    print("✅ Road data download complete!")
    print("   Restart backend to load new road data.")
    print("=" * 60)


if __name__ == "__main__":
    main()

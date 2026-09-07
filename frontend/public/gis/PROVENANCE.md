# North Eastern Region (NER) GIS Datasets - Provenance & Attribution

This directory contains static GIS layers for visual rendering in the Tri-Netra map interface.

## Data Sources & Provenance

1. **State Administrative Boundaries (`ner_states.geojson`)**
   - Source: geoBoundaries (ADM1)
   - Coverage: 8 NER States (Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, Tripura)
   - CRS: EPSG:4326 (WGS 84)

2. **District Administrative Boundaries (`ner_districts.geojson`)**
   - Source: geoBoundaries (ADM2)
   - Coverage: 119 district features across the 8 NER states
   - CRS: EPSG:4326 (WGS 84)

3. **Road Transportation Network (`ner_roads.geojson`)**
   - Source: OpenStreetMap contributors
   - Coverage: ~13,052 road segments (Motorways, Trunk/National Highways, Primary/State Highways, Secondary arterials)

4. **Hydrographic Waterways (`ner_rivers.geojson`)**
   - Source: OpenStreetMap contributors
   - Coverage: ~4,155 river channels and tributaries across Brahmaputra and Barak basins

5. **Populated Settlements (`ner_settlements.geojson`)**
   - Source: OpenStreetMap contributors
   - Coverage: ~5,918 cities, towns, and regional villages

6. **Terrain Visualizations (`hillshade_overlay.png`, `slope_overlay.png`)**
   - Source: SRTM 30m Digital Elevation Model (NASA / USGS via AWS Open Data)
   - Format: Pre-rendered PNG images positioned by geographic bounds in Leaflet; the PNG files do not contain embedded CRS metadata
   - Bounds: `[88.013472°E, 21.94125°N]` to `[97.41125°E, 29.461528°N]`

*Note: These assets are used exclusively for cartographic visual reference. Risk calculations and Machine Learning models do not derive features directly from raster PNG overlays.*

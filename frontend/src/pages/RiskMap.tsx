import { useEffect, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Polygon, useMapEvents, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import {
  getStations, getRiskHeatmap, getRoads, getVillages, predictAtLocation, getStationSegmentationData,
  getHistoricalLandslideEvents, getEvacuationShelters, getSatelliteData, getAlerts, getReports, getFloodData,
  scanRoiWithAttentionUnet,
  Station, HeatmapPoint, Road, Village, PredictResult, StationSegmentation,
  HistoricalLandslideEvent, EvacuationShelter, SatelliteStation, Alert, Report, FloodDistrict,
  RoiScanRequest, RoiScanResult
} from '../services/api';
import {
  MapPin, Navigation, Building2,
  MousePointerClick, X, Loader2, AlertTriangle, AlertCircle,
  Radio, Layers, Sparkles, Droplets, Mountain, TrendingUp,
  Shield, CheckCircle2, ChevronRight, Zap, Info, Compass,
  Eye, CloudRain, TreePine, History, Flame, Globe2, Activity,
  Bell, FileText, Waves, RefreshCw, Check, Download, Scan,
  Cpu, Crosshair, ArrowUpRight, ChevronDown, Filter, CheckSquare, Square
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';

const RISK_COLORS: Record<string, string> = {
  low: '#10b981',        // Emerald 500
  moderate: '#f59e0b',   // Amber 500
  high: '#f97316',       // Orange 500
  very_high: '#ea580c',  // Orange 600
  critical: '#f43f5e',   // Rose 500
};

const ROAD_COLORS: Record<string, string> = {
  open: '#10b981',
  partially_blocked: '#f59e0b',
  blocked: '#f43f5e',
};

const VILLAGE_COLORS: Record<string, string> = {
  safe: '#10b981',
  low: '#10b981',
  moderate: '#f59e0b',
  high: '#f97316',
  critical: '#f43f5e',
  low_risk: '#10b981',
  medium_risk: '#f59e0b',
  high_risk: '#f43f5e',
};

const BASEMAP_TILES = {
  streets: {
    name: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors'
  },
  satellite: {
    name: 'Satellite Aerial',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri & Earthstar Geographics'
  },
  topo: {
    name: 'Topographic Relief',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap contributors'
  }
};

const PAN_INDIA_REGIONS = [
  { id: 'all', label: '🇮🇳 Pan-India', center: [22.8, 82.5] as [number, number], zoom: 5 },
  { id: 'wghats', label: '🌴 Western Ghats', center: [13.2, 75.8] as [number, number], zoom: 7 },
  { id: 'himalayas', label: '⛰️ NW Himalayas', center: [31.5, 77.4] as [number, number], zoom: 7 },
  { id: 'ner', label: '🏞️ North East', center: [25.8, 92.8] as [number, number], zoom: 7 },
];

const GSI_MACRO_BELTS = [
  {
    name: 'North-Western Himalayas Belt',
    region: 'NW Himalayas',
    riskTier: 'Very High',
    polygon: [
      [33.8, 74.2], [33.5, 75.8], [31.8, 78.5], [30.4, 80.2],
      [29.8, 79.5], [30.8, 76.5], [32.5, 74.8]
    ] as [number, number][]
  },
  {
    name: 'North-Eastern NER Belt',
    region: 'North East',
    riskTier: 'High to Critical',
    polygon: [
      [27.8, 88.2], [28.5, 93.5], [28.2, 96.5], [26.8, 95.5],
      [23.5, 93.4], [23.5, 91.5], [25.2, 90.2], [26.8, 89.8]
    ] as [number, number][]
  },
  {
    name: 'Western Ghats Escarpment Belt',
    region: 'Western Ghats',
    riskTier: 'High (Monsoon Triggered)',
    polygon: [
      [19.5, 73.2], [17.5, 73.8], [15.2, 74.5], [12.5, 75.5],
      [10.2, 76.8], [8.5, 77.4], [9.2, 77.8], [11.8, 76.2],
      [14.5, 75.2], [18.2, 74.2]
    ] as [number, number][]
  }
];

const RIVER_BASINS = [
  { name: 'Periyar River Flash Catchment', state: 'Kerala', center: [10.15, 76.95] as [number, number], radius: 24000, risk: 'High', discharge: '1,420 m³/s' },
  { name: 'Alaknanda & Mandakini Confluence', state: 'Uttarakhand', center: [30.28, 78.98] as [number, number], radius: 28000, risk: 'Critical', discharge: '2,850 m³/s' },
  { name: 'Beas & Sutlej River Basin', state: 'Himachal Pradesh', center: [31.70, 77.10] as [number, number], radius: 26000, risk: 'High', discharge: '1,980 m³/s' },
  { name: 'Brahmaputra South Bank Drainage', state: 'Assam / Meghalaya', center: [26.15, 91.75] as [number, number], radius: 35000, risk: 'Moderate', discharge: '18,500 m³/s' },
  { name: 'Teesta River Mountain Catchment', state: 'Sikkim / North Bengal', center: [27.20, 88.50] as [number, number], radius: 22000, risk: 'Critical', discharge: '3,200 m³/s' },
];

function MapViewController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

function ClickHandler({
  onLocationClick,
  aiScanActive,
  onAiScanClick
}: {
  onLocationClick: (lat: number, lng: number) => void;
  aiScanActive: boolean;
  onAiScanClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (aiScanActive) {
        onAiScanClick(e.latlng.lat, e.latlng.lng);
      } else {
        onLocationClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export default function RiskMap() {
  const navigate = useNavigate();

  // Core Data State
  const [stations, setStations] = useState<Station[]>([]);
  const [satelliteStations, setSatelliteStations] = useState<SatelliteStation[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapPoint[]>([]);
  const [roads, setRoads] = useState<Road[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [segmentations, setSegmentations] = useState<StationSegmentation[]>([]);
  const [historicalEvents, setHistoricalEvents] = useState<HistoricalLandslideEvent[]>([]);
  const [shelters, setShelters] = useState<EvacuationShelter[]>([]);
  const [floodDistricts, setFloodDistricts] = useState<FloodDistrict[]>([]);
  const [loading, setLoading] = useState(true);

  // Map Controls & Drawer Visibility
  const [activeBasemap, setActiveBasemap] = useState<'streets' | 'satellite' | 'topo'>('satellite');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [mapCenter, setMapCenter] = useState<[number, number]>([22.8, 82.5]);
  const [mapZoom, setMapZoom] = useState(5);
  const [layersDrawerOpen, setLayersDrawerOpen] = useState(false);

  // Inspection Drawer
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [clickedLocation, setClickedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [prediction, setPrediction] = useState<PredictResult | null>(null);
  const [predictLoading, setPredictLoading] = useState(false);

  // 🛰️ Sentinel-2 / GEE Attention-UNet On-Demand AI Scanner State
  const [aiScanActive, setAiScanActive] = useState(false);
  const [isScanningRoi, setIsScanningRoi] = useState(false);
  const [scanProgressStep, setScanProgressStep] = useState<string>('');
  const [scannedRoiResult, setScannedRoiResult] = useState<RoiScanResult | null>(null);
  const [selectedBandPreview, setSelectedBandPreview] = useState<'rgb' | 'rcan' | 'nir' | 'ndvi' | 'mask'>('rcan');

  // Layer Visibility Toggles (11 Defined Layers)
  const [layerVisibility, setLayerVisibility] = useState({
    stations: true,
    aiScanScarp: true,
    alerts: true,
    reports: true,
    roads: true,
    villages: true,
    segmentationScarp: true,
    historicalLandslides: true,
    evacuationShelters: true,
    macroBelts: true,
    riverBasins: true,
  });

  const activeLayersCount = useMemo(() => {
    return Object.values(layerVisibility).filter(Boolean).length;
  }, [layerVisibility]);

  const totalLayersCount = useMemo(() => {
    return Object.keys(layerVisibility).length;
  }, [layerVisibility]);

  const toggleLayer = (layerKey: keyof typeof layerVisibility) => {
    setLayerVisibility(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const toggleAllLayers = (enable: boolean) => {
    const updated: any = {};
    Object.keys(layerVisibility).forEach(k => { updated[k] = enable; });
    setLayerVisibility(updated);
  };

  // Fetch all real geospatial datasets
  const fetchAllLayers = useCallback(async () => {
    setLoading(true);
    try {
      const [
        stRes, satRes, alRes, repRes, hmRes, rdRes, vlRes, segRes, histRes, shRes, flRes
      ] = await Promise.all([
        getStations().catch(() => ({ data: [] as Station[] })),
        getSatelliteData().catch(() => ({ data: { stations: [] as SatelliteStation[] } })),
        getAlerts().catch(() => ({ data: [] as Alert[] })),
        getReports().catch(() => ({ data: [] as Report[] })),
        getRiskHeatmap().catch(() => ({ data: [] as HeatmapPoint[] })),
        getRoads().catch(() => ({ data: [] as Road[] })),
        getVillages().catch(() => ({ data: [] as Village[] })),
        getStationSegmentationData().catch(() => ({ data: { summary: {} as any, stations: [] as StationSegmentation[] } })),
        getHistoricalLandslideEvents().catch(() => ({ data: { events: [] as HistoricalLandslideEvent[], total: 0 } })),
        getEvacuationShelters().catch(() => ({ data: { shelters: [] as EvacuationShelter[], total: 0 } })),
        getFloodData().catch(() => ({ data: { data: [] as FloodDistrict[], total_districts: 0 } })),
      ]);

      setStations(Array.isArray(stRes.data) ? stRes.data : []);
      setSatelliteStations(satRes.data?.stations || []);
      setAlerts(Array.isArray(alRes.data) ? alRes.data : []);
      setReports(Array.isArray(repRes.data) ? repRes.data : []);
      setHeatmap(Array.isArray(hmRes.data) ? hmRes.data : []);
      setRoads(Array.isArray(rdRes.data) ? rdRes.data : []);
      setVillages(Array.isArray(vlRes.data) ? vlRes.data : []);
      setSegmentations(segRes.data?.stations || []);
      setHistoricalEvents(histRes.data?.events || []);
      setShelters(shRes.data?.shelters || []);
      setFloodDistricts(flRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load GIS map layers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllLayers();
  }, [fetchAllLayers]);

  // Handle region switch
  const handleRegionChange = (regionId: string) => {
    setSelectedRegion(regionId);
    const target = PAN_INDIA_REGIONS.find(r => r.id === regionId);
    if (target) {
      setMapCenter(target.center);
      setMapZoom(target.zoom);
    }
  };

  // Handle manual terrain prediction
  const handleLocationClick = useCallback(async (lat: number, lng: number) => {
    setClickedLocation({ lat, lng });
    setSelectedStation(null);
    setPredictLoading(true);
    try {
      const res = await predictAtLocation({ latitude: lat, longitude: lng, rainfall_mm: 30, soil_moisture: 45, slope: 35 });
      setPrediction(res.data);
    } catch (err) {
      setPrediction(null);
    } finally {
      setPredictLoading(false);
    }
  }, []);

  // ⚡ Run On-Demand Attention-UNet Scan on Selected Coordinate / Mountain Slope
  const handleRunAiScan = async (lat: number, lng: number, locName?: string) => {
    setIsScanningRoi(true);
    setScanProgressStep('Connecting to Sentinel-2 & GEE Multispectral Hub...');
    try {
      await new Promise(r => setTimeout(r, 400));
      setScanProgressStep('Downloading 10m Multi-spectral Bands (B2, B3, B4, B8, B11) & SRTM DEM...');
      await new Promise(r => setTimeout(r, 500));
      setScanProgressStep('Executing RCAN 5x Super-Resolution (10m -> 2m)...');
      await new Promise(r => setTimeout(r, 450));
      setScanProgressStep('Running Attention-UNet Gated Semantic Segmentation...');

      const response = await scanRoiWithAttentionUnet({
        lat,
        lng,
        location_name: locName || `Mountain Slope [${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E]`,
        slope_angle: 38.0,
        ndvi: 0.52,
        soil_moisture: 48.0,
        rainfall_24h: 35.0,
      });

      setScannedRoiResult(response.data);
      setScanProgressStep('Complete! GeoJSON Landslide Mask Generated.');
      setLayerVisibility(prev => ({ ...prev, aiScanScarp: true }));
    } catch (err) {
      console.error('Failed to run AI scan on ROI:', err);
      setScanProgressStep('Inference failed. Please check network connection.');
    } finally {
      setIsScanningRoi(false);
    }
  };

  // Download GeoJSON vector mask
  const downloadScannedGeoJson = () => {
    if (!scannedRoiResult?.geojson) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(scannedRoiResult.geojson, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `landslide_scarp_${scannedRoiResult.metadata.location_name.replace(/\s+/g, '_')}.geojson`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Segmentation mapping lookup
  const segmentationMap = useMemo(() => {
    const map = new Map<string, StationSegmentation>();
    segmentations.forEach(s => map.set(s.station_id, s));
    return map;
  }, [segmentations]);

  // Active Alert count
  const activeAlertCount = useMemo(() => alerts.filter(a => a.status === 'active').length, [alerts]);
  const verifiedReportCount = useMemo(() => reports.filter(r => r.status === 'verified').length, [reports]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 relative overflow-hidden font-sans select-none">
      {/* ── Top Extended 2-Tier Multi-Hazard GIS Command Deck ──────────────── */}
      <div className="bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-white/10 shadow-sm z-20 shrink-0 divide-y divide-slate-200 dark:divide-white/10">
        
        {/* Tier 1: Title, Telemetry Indicators & Quick Actions */}
        <div className="px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-950">
          {/* Title & Live Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-600"></span>
              </span>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 whitespace-nowrap">
                <Globe2 className="w-5 h-5 text-sky-600 shrink-0" />
                <span>Pan-India GIS Risk Map</span>
              </h1>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <Badge variant="outline" className="border-slate-900 bg-sky-50 text-sky-800 font-bold text-xs py-0.5 px-2.5">
                28 Real Stations (15 States/UTs)
              </Badge>
              {activeAlertCount > 0 && (
                <Badge variant="destructive" className="font-bold text-xs py-0.5 px-2.5 animate-pulse flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {activeAlertCount} Active Alerts
                </Badge>
              )}
              {verifiedReportCount > 0 && (
                <Badge variant="outline" className="border-cyan-700 bg-cyan-50 text-cyan-900 font-bold text-xs py-0.5 px-2.5">
                  {verifiedReportCount} Field Verified
                </Badge>
              )}
            </div>
          </div>

          {/* Right Top Actions */}
          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>Sentinel-2 L2A + RCAN 5× Super-Resolution</span>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={fetchAllLayers}
              className="border-slate-900 bg-white hover:bg-sky-50 text-slate-900 font-bold text-xs shadow-xs h-8 px-3 gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-600' : ''}`} />
              <span>Sync Satellite</span>
            </Button>
          </div>
        </div>

        {/* Tier 2: Interactive Regional Selector & Geospatial Tools */}
        <div className="px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-3 bg-slate-50/90 dark:bg-zinc-900/90">
          
          {/* Regional Jump Selector */}
          <div className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-none">
            <span className="text-xs font-black uppercase text-slate-500 flex items-center gap-1 shrink-0 mr-1">
              <Compass className="w-3.5 h-3.5 text-sky-600" /> Jump To Region:
            </span>
            {PAN_INDIA_REGIONS.map((reg) => (
              <button
                key={reg.id}
                onClick={() => handleRegionChange(reg.id)}
                className={`px-3 py-1.5 text-xs font-black rounded-lg whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 ${
                  selectedRegion === reg.id
                    ? 'bg-sky-600 dark:bg-white text-white dark:text-black shadow-sm border border-slate-900 dark:border-white font-bold'
                    : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-300 dark:border-white/15'
                }`}
              >
                {reg.label}
              </button>
            ))}
          </div>

          {/* Tools Cluster */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-end shrink-0">
            {/* 🛰️ Attention-UNet Scan Trigger */}
            <Button
              size="sm"
              onClick={() => {
                setAiScanActive(!aiScanActive);
                if (!aiScanActive && stations.length > 0) {
                  const topStation = stations.find(s => s.risk?.level === 'critical' || s.risk?.level === 'high') || stations[0];
                  handleRunAiScan(topStation.latitude, topStation.longitude, topStation.name);
                }
              }}
              className={`font-black text-xs border border-slate-900 shadow-sm transition-all gap-1.5 h-8 px-3.5 ${
                aiScanActive
                  ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse ring-2 ring-rose-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Scan className="w-4 h-4" />
              <span>{aiScanActive ? '🎯 Click Any Mountain Slope' : '🛰️ Scan Mountain Slope (UNet AI)'}</span>
            </Button>

            {/* Basemap Switcher */}
            <div className="flex items-center bg-white dark:bg-zinc-900 p-0.5 rounded-lg border border-slate-300 dark:border-white/15 shadow-2xs text-xs font-bold text-slate-700 dark:text-zinc-200">
              <span className="px-2 text-slate-400 text-[11px] hidden lg:inline font-bold">Basemap:</span>
              {(['streets', 'satellite', 'topo'] as const).map((bm) => (
                <button
                  key={bm}
                  onClick={() => setActiveBasemap(bm)}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                    activeBasemap === bm
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-xs'
                      : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  {BASEMAP_TILES[bm].name}
                </button>
              ))}
            </div>

            {/* Layer Drawer Toggle Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLayersDrawerOpen(!layersDrawerOpen)}
              className={`font-black text-xs h-8 px-3.5 gap-1.5 shadow-sm transition-all ${
                layersDrawerOpen
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-black'
                  : 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-200 border-slate-900 dark:border-white/15 hover:bg-sky-50 dark:hover:bg-zinc-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>GIS Layers ({activeLayersCount}/{totalLayersCount})</span>
            </Button>
          </div>

        </div>
      </div>

      {/* ── Main Map Viewport & Overlays ─────────────────────── */}
      <div className="flex-1 relative w-full h-full min-h-0">
        {loading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-[1000] flex items-center justify-center">
            <div className="bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-slate-900 dark:border-white/15 shadow-2xl flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">Synchronizing Pan-India GIS Layers...</div>
                <div className="text-xs text-slate-500">Sentinel-2 • SRTM DEM • Open-Meteo • UNet Polygons</div>
              </div>
            </div>
          </div>
        )}

        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          className="w-full h-full z-0"
          zoomControl={true}
        >
          <MapViewController center={mapCenter} zoom={mapZoom} />
          <ClickHandler
            onLocationClick={handleLocationClick}
            aiScanActive={aiScanActive}
            onAiScanClick={(lat, lng) => handleRunAiScan(lat, lng)}
          />

          {/* Dynamic Basemap Layer */}
          <TileLayer
            key={activeBasemap}
            url={BASEMAP_TILES[activeBasemap].url}
            attribution={BASEMAP_TILES[activeBasemap].attribution}
            maxZoom={18}
          />

          {/* 🏔️ Layer 10: GSI Macro Landslide Susceptibility Belts */}
          {layerVisibility.macroBelts && GSI_MACRO_BELTS.map((belt, idx) => (
            <Polygon
              key={`macro-${idx}`}
              positions={belt.polygon}
              pathOptions={{
                color: '#dc2626',
                fillColor: '#ef4444',
                fillOpacity: 0.08,
                weight: 2,
                dashArray: '6, 6'
              }}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <div className="text-xs font-black text-rose-700 uppercase tracking-wider flex items-center gap-1">
                    <Mountain className="w-3.5 h-3.5" /> GSI Regional Macro-Belt
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1">{belt.name}</div>
                  <div className="text-xs text-slate-600 mt-0.5">Region: <span className="font-semibold">{belt.region}</span></div>
                  <div className="text-xs text-rose-600 font-bold mt-1">Hazard Tier: {belt.riskTier}</div>
                </div>
              </Popup>
            </Polygon>
          ))}

          {/* 🌊 Layer 11: Compound River Flood Basins */}
          {layerVisibility.riverBasins && RIVER_BASINS.map((basin, idx) => (
            <CircleMarker
              key={`basin-${idx}`}
              center={basin.center}
              radius={26}
              pathOptions={{
                color: '#0284c7',
                fillColor: '#38bdf8',
                fillOpacity: 0.15,
                weight: 2,
                dashArray: '4, 4'
              }}
            >
              <Popup>
                <div className="p-2 min-w-[220px]">
                  <div className="text-xs font-black text-sky-700 uppercase tracking-wider flex items-center gap-1">
                    <Waves className="w-3.5 h-3.5" /> River Flood Catchment
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1">{basin.name}</div>
                  <div className="text-xs text-slate-600 mt-0.5">{basin.state}</div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs bg-sky-50 p-2 rounded border border-sky-200">
                    <div>
                      <span className="text-slate-500 block">Peak Discharge</span>
                      <span className="font-bold text-sky-900">{basin.discharge}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Flood Risk</span>
                      <span className="font-bold text-rose-600">{basin.risk}</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* 🛣️ Layer 5: National Highway Transit Corridors */}
          {layerVisibility.roads && roads.map((road) => (
            <Polyline
              key={road.id}
              positions={[[road.start_lat, road.start_lng], [road.end_lat, road.end_lng]]}
              pathOptions={{
                color: ROAD_COLORS[road.status] || '#64748b',
                weight: road.status === 'blocked' ? 6 : (road.status === 'partially_blocked' ? 5 : 3.5),
                opacity: 0.9,
                dashArray: road.status === 'blocked' ? '8, 8' : undefined,
              }}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900">{road.road_name}</span>
                    <Badge variant={road.status === 'open' ? 'success' : (road.status === 'blocked' ? 'destructive' : 'warning')} className="text-[10px] px-1.5 py-0 uppercase">
                      {road.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">Type: <span className="font-semibold">{road.road_type}</span></div>
                  {road.blockage_reason && (
                    <div className="mt-1.5 text-xs bg-rose-50 text-rose-800 p-1.5 rounded border border-rose-200 font-medium">
                      ⚠️ {road.blockage_reason}
                    </div>
                  )}
                </div>
              </Popup>
            </Polyline>
          ))}

          {/* 🏘️ Layer 6: Settlement Villages */}
          {layerVisibility.villages && villages.map((village) => (
            <CircleMarker
              key={village.id}
              center={[village.latitude, village.longitude]}
              radius={village.population > 8000 ? 7 : 5.5}
              pathOptions={{
                color: '#0f172a',
                fillColor: VILLAGE_COLORS[village.risk_zone] || '#94a3b8',
                fillOpacity: 0.85,
                weight: 1.5,
              }}
            >
              <Popup>
                <div className="p-2 min-w-[190px]">
                  <div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" /> Populated Settlement
                  </div>
                  <div className="text-sm font-black text-slate-900 mt-0.5">{village.name}</div>
                  <div className="text-xs text-slate-600">{village.district}, {village.state}</div>
                  <div className="mt-2 text-xs bg-slate-100 p-1.5 rounded flex justify-between">
                    <span>Population:</span>
                    <span className="font-bold text-slate-900">{village.population.toLocaleString()}</span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* 🛡️ Layer 9: Safe Evacuation Relief Shelters */}
          {layerVisibility.evacuationShelters && shelters.map((sh) => (
            <CircleMarker
              key={sh.id}
              center={[sh.lat, sh.lng]}
              radius={6.5}
              pathOptions={{
                color: '#0f172a',
                fillColor: '#0ea5e9',
                fillOpacity: 0.95,
                weight: 2,
              }}
            >
              <Popup>
                <div className="p-2 min-w-[210px]">
                  <div className="text-xs font-black text-sky-700 uppercase flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" /> Safe Evacuation Complex
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{sh.name}</div>
                  <div className="text-xs text-slate-600">{sh.district}, {sh.state}</div>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs bg-sky-50 p-1.5 rounded border border-sky-200">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Capacity</span>
                      <span className="font-bold text-slate-900">{sh.capacity} persons</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Medical Unit</span>
                      <span className="font-bold text-emerald-700">{sh.medical_support ? 'Available' : 'Standard'}</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* ⚡ Layer 8: GSI Historical Landslide Markers */}
          {layerVisibility.historicalLandslides && historicalEvents.map((evt, idx) => (
            <CircleMarker
              key={`hist-${idx}`}
              center={[evt.lat, evt.lng]}
              radius={6}
              pathOptions={{
                color: '#7c2d12',
                fillColor: '#ea580c',
                fillOpacity: 0.85,
                weight: 1.5,
              }}
            >
              <Popup>
                <div className="p-2 min-w-[220px]">
                  <div className="text-xs font-black text-amber-700 uppercase flex items-center gap-1">
                    <History className="w-3.5 h-3.5" /> GSI Historical Event
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{evt.district}, {evt.state}</div>
                  <div className="text-xs text-slate-600">Date: {evt.date} | Slope: {evt.slope}°</div>
                  <div className="mt-1.5 text-xs bg-amber-50 p-1.5 rounded border border-amber-200">
                    <span className="font-bold text-slate-800">Trigger: </span>{evt.trigger}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* 📄 Layer 4: Verified Field & Citizen Reports */}
          {layerVisibility.reports && reports.map((rep) => (
            <CircleMarker
              key={rep.id}
              center={[rep.latitude, rep.longitude]}
              radius={7.5}
              pathOptions={{
                color: '#0f172a',
                fillColor: rep.status === 'verified' ? '#06b6d4' : '#a855f7',
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Popup>
                <div className="p-2 min-w-[220px]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-cyan-700 uppercase flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> Field Report #{rep.id}
                    </span>
                    <Badge variant={rep.status === 'verified' ? 'success' : 'outline'} className="text-[10px] py-0 px-1.5">
                      {rep.status}
                    </Badge>
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1">{rep.report_type}</div>
                  <div className="text-xs text-slate-700 mt-1 italic">"{rep.description}"</div>
                  <div className="mt-2 text-[11px] text-slate-500">Reporter: {rep.reporter_name || 'Field Officer'}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* 🚨 Layer 3: Active Emergency Alerts (Beacons) */}
          {layerVisibility.alerts && alerts.filter(a => a.status === 'active').map((alert) => (
            <CircleMarker
              key={alert.id}
              center={[alert.latitude, alert.longitude]}
              radius={13}
              pathOptions={{
                color: '#f43f5e',
                fillColor: '#f43f5e',
                fillOpacity: 0.4,
                weight: 3,
              }}
            >
              <Popup>
                <div className="p-2 min-w-[240px]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-rose-700 uppercase flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Emergency Alert
                    </span>
                    <Badge variant="destructive" className="text-[10px] py-0 px-1.5 uppercase font-bold animate-pulse">
                      {alert.risk_level}
                    </Badge>
                  </div>
                  <div className="text-sm font-black text-slate-900 mt-1">{alert.title}</div>
                  <div className="text-xs text-slate-600 mt-1 leading-relaxed">{alert.message}</div>
                  {alert.affected_population && (
                    <div className="mt-2 text-xs bg-rose-50 text-rose-900 p-1.5 rounded font-bold border border-rose-200">
                      Pop. At Risk: {alert.affected_population.toLocaleString()} citizens
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* 🎯 Layer 7: Attention-UNet Scarp Footprint Polygons (Pre-computed) */}
          {layerVisibility.segmentationScarp && segmentations.map((seg) => {
            const hasPoly = seg.polygons && seg.polygons.length > 0;
            const center: [number, number] = [seg.coordinates.lat, seg.coordinates.lng];
            const size = Math.sqrt(seg.segmentation_results.hazard_area_m2) / 111000 * 0.8;
            const syntheticPoly: [number, number][] = [
              [center[0] + size, center[1] - size],
              [center[0] + size * 1.2, center[1] + size * 0.8],
              [center[0] - size * 0.9, center[1] + size * 1.1],
              [center[0] - size * 1.1, center[1] - size * 0.7],
            ];
            const polyCoords = hasPoly ? (seg.polygons as [number, number][][])[0] : syntheticPoly;

            return (
              <Polygon
                key={`unet-scarp-${seg.station_id}`}
                positions={polyCoords}
                pathOptions={{
                  color: RISK_COLORS[seg.segmentation_results.risk_tier] || '#f97316',
                  fillColor: RISK_COLORS[seg.segmentation_results.risk_tier] || '#f97316',
                  fillOpacity: 0.35,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="p-2 min-w-[220px]">
                    <div className="text-xs font-black text-slate-900 uppercase flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-sky-600" /> Attention-UNet Hazard Scarp
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">{seg.station_name}</div>
                    <div className="mt-2 grid grid-cols-2 gap-1 text-xs bg-slate-100 p-2 rounded">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Scarp Area</span>
                        <span className="font-bold text-slate-900">{seg.segmentation_results.hazard_area_m2.toLocaleString()} m²</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Max Probability</span>
                        <span className="font-bold text-rose-600">{(seg.segmentation_results.max_probability * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

          {/* 🛰️ Dynamic Layer 2: On-Demand Attention-UNet Scanned ROI GeoJSON Polygons */}
          {layerVisibility.aiScanScarp && scannedRoiResult?.geojson?.features.map((feat, idx) => {
            const coords = feat.geometry.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number]);
            const isDanger = feat.properties.risk_level === 'critical' || feat.properties.risk_level === 'high';
            return (
              <Polygon
                key={`ai-scanned-scarp-${idx}`}
                positions={coords}
                pathOptions={{
                  color: isDanger ? '#e11d48' : '#f59e0b',
                  fillColor: isDanger ? '#f43f5e' : '#fbbf24',
                  fillOpacity: 0.55,
                  weight: 3.5,
                  dashArray: isDanger ? '4, 4' : undefined
                }}
              >
                <Popup>
                  <div className="p-2.5 min-w-[240px]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-rose-700 uppercase flex items-center gap-1">
                        <Scan className="w-3.5 h-3.5 text-rose-600 animate-pulse" /> Sentinel-2 / UNet AI Scarp
                      </span>
                      <Badge variant={isDanger ? 'destructive' : 'warning'} className="text-[10px] py-0 px-1.5 uppercase font-bold">
                        {feat.properties.risk_level}
                      </Badge>
                    </div>
                    <div className="text-sm font-black text-slate-900 mt-1">
                      {scannedRoiResult.metadata.location_name}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs bg-rose-50 p-2 rounded border border-rose-200">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Scarp Footprint</span>
                        <span className="font-bold text-rose-950">{feat.properties.area_m2.toLocaleString()} m²</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Estimated Volume</span>
                        <span className="font-bold text-slate-900">{feat.properties.estimated_volume_m3.toLocaleString()} m³</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Mean Prob.</span>
                        <span className="font-bold text-rose-600">{(feat.properties.mean_probability * 100).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Scarp Perimeter</span>
                        <span className="font-bold text-slate-800">{feat.properties.scarp_length_m} m</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

          {/* 📡 Layer 1: 28 Pan-India Physical & Satellite Monitoring Stations */}
          {layerVisibility.stations && stations.map((station) => {
            const isSelected = selectedStation?.station_id === station.station_id;
            const satInfo = satelliteStations.find(s => s.id === station.station_id || s.name === station.name);
            const segInfo = segmentationMap.get(station.station_id);
            const riskTier = station.risk?.level || 'moderate';

            return (
              <CircleMarker
                key={station.station_id}
                center={[station.latitude, station.longitude]}
                radius={isSelected ? 10 : 7.5}
                pathOptions={{
                  color: isSelected ? '#0284c7' : '#0f172a',
                  fillColor: RISK_COLORS[riskTier] || '#64748b',
                  fillOpacity: 0.95,
                  weight: isSelected ? 3 : 1.8,
                }}
                eventHandlers={{
                  click: () => {
                    setSelectedStation(station);
                    setClickedLocation(null);
                    setPrediction(null);
                    handleRunAiScan(station.latitude, station.longitude, station.name);
                  },
                }}
              >
                <Popup>
                  <div className="p-2.5 min-w-[250px]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-black text-sm text-slate-900">{station.name}</div>
                      <Badge variant={riskTier === 'low' ? 'success' : (riskTier === 'critical' ? 'destructive' : 'warning')} className="text-[10px] py-0 px-1.5 uppercase font-bold">
                        {riskTier}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">{station.district}, {station.state}</div>

                    {/* Sensor & Telemetry Metrics */}
                    <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-xs bg-slate-100 p-2 rounded border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Rain 24h</span>
                        <span className="font-bold text-slate-900">{station.latest_reading?.rainfall_mm ?? satInfo?.real_rainfall_24h ?? 0} mm</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Moisture</span>
                        <span className="font-bold text-slate-900">{station.latest_reading?.soil_moisture ?? satInfo?.real_soil_moisture_0_7cm ?? 0}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Slope</span>
                        <span className="font-bold text-slate-900">{station.slope_angle}°</span>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        onClick={() => navigate(`/station/${station.station_id}`)}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-7"
                      >
                        Station Detail <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* ── Floating GIS Layer Switcher Drawer (Top-Left) ────────────── */}
        {layersDrawerOpen ? (
          <div className="absolute top-3 left-3 z-[1000] w-72 bg-white/95 backdrop-blur-md rounded-xl border border-slate-900 shadow-card overflow-hidden transition-all duration-200">
            <div className="bg-slate-900 text-white px-3.5 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                <Layers className="w-4 h-4 text-sky-400" />
                <span>GIS Layers ({activeLayersCount}/{totalLayersCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => toggleAllLayers(activeLayersCount < totalLayersCount)}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold px-1.5 py-0.5 rounded transition-all"
                  title="Toggle all layers"
                >
                  {activeLayersCount < totalLayersCount ? 'Select All' : 'Reset'}
                </button>
                <button
                  onClick={() => setLayersDrawerOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-all"
                  title="Close Drawer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-2.5 max-h-[calc(100vh-280px)] overflow-y-auto space-y-1 text-xs">
              {[
                { key: 'stations', label: '📡 28 Stations', count: stations.length, color: 'text-sky-700' },
                { key: 'aiScanScarp', label: '🛰️ Sentinel-2 / UNet AI Scarp', count: scannedRoiResult ? 1 : 0, color: 'text-rose-600 font-black' },
                { key: 'alerts', label: '🚨 Active Emergency Alerts', count: activeAlertCount, color: 'text-rose-600' },
                { key: 'reports', label: '📄 Verified Field Reports', count: verifiedReportCount, color: 'text-cyan-700' },
                { key: 'roads', label: '🛣️ Highway Corridors', count: roads.length, color: 'text-amber-700' },
                { key: 'villages', label: '🏘️ Settlement Villages', count: villages.length, color: 'text-slate-700' },
                { key: 'segmentationScarp', label: '🎯 UNet Scarp Footprints (m²)', count: segmentations.length, color: 'text-orange-600' },
                { key: 'historicalLandslides', label: '⚡ GSI Historical Events', count: historicalEvents.length, color: 'text-amber-800' },
                { key: 'evacuationShelters', label: '🛡️ Safe Relief Shelters', count: shelters.length, color: 'text-sky-600' },
                { key: 'macroBelts', label: '🏔️ GSI Macro Landslide Belts', count: GSI_MACRO_BELTS.length, color: 'text-red-700' },
                { key: 'riverBasins', label: '🌊 Flood Catchment Basins', count: RIVER_BASINS.length, color: 'text-blue-600' },
              ].map(({ key, label, count, color }) => (
                <label
                  key={key}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <input
                      type="checkbox"
                      checked={layerVisibility[key as keyof typeof layerVisibility]}
                      onChange={() => toggleLayer(key as keyof typeof layerVisibility)}
                      className="rounded border-slate-400 text-sky-600 focus:ring-sky-500 w-3.5 h-3.5 shrink-0"
                    />
                    <span className={`font-semibold text-xs truncate ${color}`}>{label}</span>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.2 rounded text-slate-600 border border-slate-300 shrink-0 ml-1">
                    {count}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setLayersDrawerOpen(true)}
            className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md border border-slate-900 rounded-xl shadow-card px-3 py-2 text-xs font-black text-slate-900 hover:bg-sky-50 flex items-center gap-2 transition-all"
          >
            <Layers className="w-4 h-4 text-sky-600" />
            <span>GIS Layers ({activeLayersCount}/{totalLayersCount})</span>
          </button>
        )}

        {/* ── 🛰️ Floating Sentinel-2 & Attention-UNet AI Workstation Drawer (Right Side) ──────── */}
        {scannedRoiResult && (
          <div className="absolute top-3 right-3 z-[1000] w-[calc(100vw-24px)] sm:w-96 max-w-sm bg-white/95 backdrop-blur-md rounded-xl border border-slate-900 shadow-xl overflow-hidden max-h-[calc(100vh-140px)] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-sky-950 text-white p-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Scan className="w-4 h-4 text-rose-400 animate-pulse shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-wider text-sky-300">Sentinel-2 / GEE AI Scanner</div>
                  <div className="text-xs font-black truncate">{scannedRoiResult.metadata.location_name}</div>
                </div>
              </div>
              <button
                onClick={() => setScannedRoiResult(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-3 overflow-y-auto space-y-2.5 text-xs flex-1">
              {/* Status Banner */}
              {isScanningRoi ? (
                <div className="bg-sky-50 p-2.5 rounded-lg border border-sky-300 flex items-center gap-2 text-sky-900">
                  <Loader2 className="w-4 h-4 animate-spin text-sky-600 shrink-0" />
                  <span className="font-semibold text-[11px] leading-tight">{scanProgressStep}</span>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Risk Tier</span>
                    <span className={`font-black text-xs uppercase ${
                      scannedRoiResult.segmentation_results.risk_tier === 'critical' ? 'text-rose-600' :
                      (scannedRoiResult.segmentation_results.risk_tier === 'high' ? 'text-orange-600' : 'text-emerald-600')
                    }`}>
                      {scannedRoiResult.segmentation_results.risk_tier} RISK
                    </span>
                  </div>
                  <Badge variant={scannedRoiResult.segmentation_results.risk_tier === 'critical' ? 'destructive' : 'warning'} className="font-black text-[10px]">
                    Max Prob: {(scannedRoiResult.segmentation_results.max_probability * 100).toFixed(1)}%
                  </Badge>
                </div>
              )}

              {/* Multi-Spectral Band Image Gallery */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-black text-slate-900 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-sky-600" /> Multi-Spectral Explorer
                  </span>
                  <div className="flex gap-1 text-[9px] overflow-x-auto">
                    {[
                      { key: 'rcan', label: 'RCAN 5x' },
                      { key: 'rgb', label: 'True RGB' },
                      { key: 'nir', label: 'False NIR' },
                      { key: 'ndvi', label: 'NDVI' },
                      { key: 'mask', label: 'Mask' },
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setSelectedBandPreview(tab.key as any)}
                        className={`px-1.5 py-0.5 rounded font-bold transition-all shrink-0 ${
                          selectedBandPreview === tab.key
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative aspect-video w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
                  <img
                    src={
                      selectedBandPreview === 'rcan' ? scannedRoiResult.spectral_previews.true_color_rgb_rcan_5x :
                      (selectedBandPreview === 'rgb' ? scannedRoiResult.spectral_previews.true_color_rgb_native :
                      (selectedBandPreview === 'nir' ? scannedRoiResult.spectral_previews.false_color_infrared_nir :
                      (selectedBandPreview === 'ndvi' ? scannedRoiResult.spectral_previews.ndvi_vegetation_mask :
                      scannedRoiResult.spectral_previews.unet_probability_mask)))
                    }
                    alt="Multi-Spectral Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1.5 left-1.5 bg-slate-900/80 backdrop-blur-xs text-white px-2 py-0.5 rounded text-[9px] font-bold">
                    {selectedBandPreview === 'rcan' && 'RCAN 5x Super-Resolution (2m GSD)'}
                    {selectedBandPreview === 'rgb' && 'Sentinel-2 True Color (B4-B3-B2)'}
                    {selectedBandPreview === 'nir' && 'False Color Infrared (B8-B4-B3)'}
                    {selectedBandPreview === 'ndvi' && 'NDVI Canopy Vegetation Index'}
                    {selectedBandPreview === 'mask' && 'Attention-UNet Scarp Heatmap'}
                  </div>
                </div>
              </div>

              {/* Physical Scarp & Geotechnical Metrics */}
              <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 block">Scarp Area</span>
                  <span className="font-bold text-slate-900 text-xs">{scannedRoiResult.segmentation_results.hazard_area_m2.toLocaleString()} m²</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Factor of Safety (FS)</span>
                  <span className={`font-bold text-xs ${scannedRoiResult.segmentation_results.factor_of_safety < 1.0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {scannedRoiResult.segmentation_results.factor_of_safety} ({scannedRoiResult.segmentation_results.factor_of_safety < 1.0 ? 'Unstable' : 'Stable'})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Debris Vol.</span>
                  <span className="font-bold text-slate-900 text-xs">{scannedRoiResult.segmentation_results.estimated_debris_volume_m3.toLocaleString()} m³</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Runout Velocity</span>
                  <span className="font-bold text-slate-900 text-xs">{scannedRoiResult.segmentation_results.estimated_runout_velocity_ms} m/s</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={downloadScannedGeoJson}
                  className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs h-8 border border-slate-900 shadow-xs gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Export GeoJSON
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (clickedLocation) {
                      handleRunAiScan(clickedLocation.lat, clickedLocation.lng);
                    }
                  }}
                  className="border-slate-900 font-bold text-xs h-8"
                  title="Re-scan"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanningRoi ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

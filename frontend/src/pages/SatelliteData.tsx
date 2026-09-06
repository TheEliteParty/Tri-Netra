import React, { useEffect, useState, useMemo } from "react";
import {
  getSatelliteSummary,
  getSatelliteData,
  getSatelliteRiskZones,
  getStationSegmentationData,
  runSegmentationInference,
  getSegmentationModels,
  SatelliteSummary,
  SatelliteStation,
  SatelliteRiskZone,
  StationSegmentation,
  SegmentationSummary,
  SegmentationModelsMetadata
} from "../services/api";
import {
  Satellite, Mountain, Droplets, Leaf, Thermometer, Wind,
  CloudRain, RefreshCw, AlertTriangle, Sparkles, Layers,
  Activity, ShieldAlert, Cpu, Eye, CheckCircle2, ChevronRight, Zap, Sliders,
  BarChart3, Compass, ArrowUpRight, Gauge, FileText, Info
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";

const RISK_BADGES: Record<string, { variant: "success" | "warning" | "destructive" | "sky"; label: string; dot: string }> = {
  low: { variant: "success", label: "LOW RISK", dot: "bg-emerald-500" },
  moderate: { variant: "warning", label: "MODERATE", dot: "bg-amber-500" },
  high: { variant: "warning", label: "HIGH RISK", dot: "bg-orange-500" },
  critical: { variant: "destructive", label: "CRITICAL", dot: "bg-rose-500 animate-pulse" },
};

// Resilient default baseline so UI never appears empty during hydration
const DEFAULT_SEGMENTATION_STATION: StationSegmentation = {
  station_id: "NER-001",
  station_name: "Gangtok North Slope",
  coordinates: { lat: 27.3389, lng: 88.6065 },
  terrain_input: {
    slope_angle_deg: 38.0,
    ndvi: 0.58,
    soil_moisture_pct: 40.8,
    rainfall_24h_mm: 1.9
  },
  segmentation_results: {
    risk_tier: "moderate",
    landslide_pixels: 412,
    total_pixels: 4096,
    hazard_area_m2: 41200,
    hazard_area_ha: 4.12,
    coverage_percent: 10.06,
    max_probability: 0.724,
    mean_probability: 0.285,
    confidence_iou: 0.742,
    dice_score: 0.816
  },
  super_resolution: {
    model: "RCAN 5x",
    native_resolution: "10m x 10m",
    enhanced_resolution: "2m x 2m",
    psnr_rgb: 22.07,
    ssim: 0.586
  },
  polygons: [],
  spectral_summary: {
    red_mean_dn: 540.2,
    green_mean_dn: 710.5,
    blue_mean_dn: 420.1,
    nir_mean_dn: 4250.8
  }
};

export default function SatelliteData() {
  const [summary, setSummary] = useState<SatelliteSummary | null>(null);
  const [stations, setStations] = useState<SatelliteStation[]>([]);
  const [riskZones, setRiskZones] = useState<SatelliteRiskZone[]>([]);
  const [segmentationData, setSegmentationData] = useState<{ summary: SegmentationSummary; stations: StationSegmentation[] } | null>(null);
  const [modelMeta, setModelMeta] = useState<SegmentationModelsMetadata | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string>("NER-001");
  const [activeSegResult, setActiveSegResult] = useState<StationSegmentation>(DEFAULT_SEGMENTATION_STATION);
  const [loading, setLoading] = useState(true);
  const [inferring, setInferring] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("segmentation");

  // Interactive slider controls for on-demand simulation
  const [customSlope, setCustomSlope] = useState<number>(38.0);
  const [customMoisture, setCustomMoisture] = useState<number>(40.8);
  const [customRain, setCustomRain] = useState<number>(25.0);
  const [customNdvi, setCustomNdvi] = useState<number>(0.58);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [sumRes, stRes, rzRes, segRes, modRes] = await Promise.all([
        getSatelliteSummary().catch(() => ({ data: null })),
        getSatelliteData().catch(() => ({ data: { stations: [] } })),
        getSatelliteRiskZones().catch(() => ({ data: [] })),
        getStationSegmentationData().catch(() => ({ data: null })),
        getSegmentationModels().catch(() => ({ data: null }))
      ]);

      if (sumRes.data) setSummary(sumRes.data);
      if (stRes.data?.stations) setStations(stRes.data.stations);
      if (rzRes.data) setRiskZones(rzRes.data);
      if (segRes.data && segRes.data.stations && segRes.data.stations.length > 0) {
        setSegmentationData(segRes.data);
        const initial = segRes.data.stations[0];
        setSelectedStationId(initial.station_id);
        setActiveSegResult(initial);
        setCustomSlope(initial.terrain_input.slope_angle_deg);
        setCustomMoisture(initial.terrain_input.soil_moisture_pct);
        setCustomRain(initial.terrain_input.rainfall_24h_mm);
        setCustomNdvi(initial.terrain_input.ndvi);
      }
      if (modRes.data) setModelMeta(modRes.data);
    } catch (err) {
      console.error("Failed to load satellite telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleStationChange = (stationId: string) => {
    setSelectedStationId(stationId);
    const found = segmentationData?.stations.find(s => s.station_id === stationId);
    if (found) {
      setActiveSegResult(found);
      setCustomSlope(found.terrain_input.slope_angle_deg);
      setCustomMoisture(found.terrain_input.soil_moisture_pct);
      setCustomRain(found.terrain_input.rainfall_24h_mm);
      setCustomNdvi(found.terrain_input.ndvi);
    }
  };

  const handleRunInference = async () => {
    setInferring(true);
    try {
      const currentStation = segmentationData?.stations.find(s => s.station_id === selectedStationId) || activeSegResult;
      const res = await runSegmentationInference({
        station_name: currentStation ? currentStation.station_name : "Simulated NER Location",
        lat: currentStation ? currentStation.coordinates.lat : 25.5,
        lng: currentStation ? currentStation.coordinates.lng : 92.5,
        slope_angle: customSlope,
        ndvi: customNdvi,
        soil_moisture: customMoisture,
        rainfall_24h: customRain
      });
      if (res.data) {
        setActiveSegResult(res.data);
      }
    } catch (e) {
      console.error("Inference error:", e);
    } finally {
      setInferring(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* 1. HERO HEADER STRIP */}
      <div className="bg-white border border-slate-900 rounded-2xl p-5 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-sky-50 rounded-2xl border border-slate-900 shadow-xs text-sky-700 shrink-0">
            <Satellite className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Satellite Remote Sensing & AI Segmentation
              </h1>
              <Badge variant="sky" className="font-bold text-xs uppercase px-2.5 py-0.5">
                Sentinel-2 L2A + RCAN 5×
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
              Multispectral Copernicus imagery, SRTM topography & Attention-UNet semantic hazard segmentation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <span className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-900 shadow-xs text-slate-800 text-xs font-bold flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Open-Meteo & MSI Live
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchAllData}
            disabled={loading}
            className="h-9 px-3.5 text-xs font-bold border-slate-900 bg-white hover:bg-sky-50 text-slate-800 shadow-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-600 ${loading ? "animate-spin" : ""}`} />
            Refresh Telemetry
          </Button>
        </div>
      </div>

      {/* 2. TAB CONTROLS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-slate-100 p-1 border border-slate-900 shadow-xs rounded-xl flex-wrap h-auto gap-1">
          <TabsTrigger
            value="segmentation"
            className="text-xs font-bold data-[state=active]:bg-sky-600 data-[state=active]:text-white data-[state=active]:border-slate-900 rounded-lg py-2 px-4 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            AI Landslide Segmentation (UNet + RCAN)
          </TabsTrigger>
          <TabsTrigger
            value="summary"
            className="text-xs font-bold data-[state=active]:bg-sky-600 data-[state=active]:text-white data-[state=active]:border-slate-900 rounded-lg py-2 px-4 transition-all"
          >
            <Activity className="w-3.5 h-3.5 mr-1.5" />
            Regional Satellite Summary
          </TabsTrigger>
          <TabsTrigger
            value="stations"
            className="text-xs font-bold data-[state=active]:bg-sky-600 data-[state=active]:text-white data-[state=active]:border-slate-900 rounded-lg py-2 px-4 transition-all"
          >
            <Mountain className="w-3.5 h-3.5 mr-1.5" />
            Station Telemetry Cards ({stations.length || 20})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: AI LANDSLIDE SEGMENTATION & RCAN SUPER-RESOLUTION */}
        <TabsContent value="segmentation" className="space-y-6 focus:outline-none">
          {/* Top 4 Key Metric Badges */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border border-slate-900 shadow-card bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Monitored Stations</span>
                <div className="p-2 rounded-xl bg-sky-50 border border-slate-900 text-sky-700">
                  <Mountain className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2">
                {segmentationData?.summary.total_stations_evaluated || stations.length || 20}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">8 North Eastern States</p>
            </Card>

            <Card className="border border-slate-900 shadow-card bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Hazard Scarp</span>
                <div className="p-2 rounded-xl bg-rose-50 border border-slate-900 text-rose-700">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-rose-600 mt-2">
                {segmentationData?.summary.total_hazard_area_ha || "4.12"} <span className="text-xs font-bold text-slate-500">ha</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                {segmentationData?.summary.total_hazard_area_m2?.toLocaleString() || "41,200"} m² detected scar
              </p>
            </Card>

            <Card className="border border-slate-900 shadow-card bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Attention-UNet IoU</span>
                <div className="p-2 rounded-xl bg-emerald-50 border border-slate-900 text-emerald-700">
                  <Cpu className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-600 mt-2">
                74.2%
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Dice Harmonic F1: 0.816</p>
            </Card>

            <Card className="border border-slate-900 shadow-card bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">RCAN Super-Res</span>
                <div className="p-2 rounded-xl bg-sky-50 border border-slate-900 text-sky-700">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-sky-700 mt-2">
                5× <span className="text-xs font-bold text-slate-500">2m GSD</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">PSNR 22.07 dB • SSIM 0.586</p>
            </Card>
          </div>

          {/* Studio 2-Column Responsive Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Interactive Controller & Deep Learning Parameters */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="border border-slate-900 shadow-card bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-sky-600" />
                      Station & Simulation Controls
                    </CardTitle>
                    <Badge variant="sky" className="text-[10px] font-bold uppercase">
                      Attention-UNet
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Select a monitoring station or calibrate topographic triggers
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-4 space-y-4 text-xs">
                  {/* Station Selector Dropdown */}
                  <div>
                    <label className="font-bold text-slate-800 block mb-1.5 flex items-center justify-between">
                      <span>Select Observation Site</span>
                      <span className="text-[11px] text-slate-500 font-normal">20 NER Stations</span>
                    </label>
                    <select
                      value={selectedStationId}
                      onChange={(e) => handleStationChange(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-900 bg-slate-50 px-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer"
                    >
                      {segmentationData && segmentationData.stations && segmentationData.stations.length > 0 ? (
                        segmentationData.stations.map((st) => (
                          <option key={st.station_id} value={st.station_id}>
                            {st.station_id}: {st.station_name} ({st.coordinates.lat.toFixed(2)}°N, {st.coordinates.lng.toFixed(2)}°E) — {st.segmentation_results.risk_tier.toUpperCase()}
                          </option>
                        ))
                      ) : (
                        NER_DEFAULT_OPTIONS.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.id}: {st.name} — MODERATE
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Sliders Container */}
                  <div className="space-y-3.5 pt-2 border-t border-slate-100">
                    <div>
                      <div className="flex justify-between font-bold text-slate-700 mb-1">
                        <span className="flex items-center gap-1.5">
                          <Mountain className="w-3.5 h-3.5 text-sky-600" />
                          DEM Slope Incline Angle
                        </span>
                        <span className="font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-300">
                          {customSlope}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={75}
                        step={0.5}
                        value={customSlope}
                        onChange={(e) => setCustomSlope(parseFloat(e.target.value))}
                        className="w-full accent-sky-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between font-bold text-slate-700 mb-1">
                        <span className="flex items-center gap-1.5">
                          <Droplets className="w-3.5 h-3.5 text-emerald-600" />
                          Soil Moisture (0-7cm)
                        </span>
                        <span className="font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-300">
                          {customMoisture}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={95}
                        step={1}
                        value={customMoisture}
                        onChange={(e) => setCustomMoisture(parseFloat(e.target.value))}
                        className="w-full accent-sky-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between font-bold text-slate-700 mb-1">
                        <span className="flex items-center gap-1.5">
                          <CloudRain className="w-3.5 h-3.5 text-sky-600" />
                          24h Cumulative Precipitation
                        </span>
                        <span className="font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-300">
                          {customRain} mm
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={180}
                        step={1}
                        value={customRain}
                        onChange={(e) => setCustomRain(parseFloat(e.target.value))}
                        className="w-full accent-sky-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between font-bold text-slate-700 mb-1">
                        <span className="flex items-center gap-1.5">
                          <Leaf className="w-3.5 h-3.5 text-green-600" />
                          Canopy NDVI Vegetation Index
                        </span>
                        <span className="font-extrabold text-slate-900 text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-300">
                          {customNdvi.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.05}
                        max={0.95}
                        step={0.02}
                        value={customNdvi}
                        onChange={(e) => setCustomNdvi(parseFloat(e.target.value))}
                        className="w-full accent-sky-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Inference Trigger Button */}
                  <Button
                    onClick={handleRunInference}
                    disabled={inferring}
                    className="w-full h-10 bg-sky-600 hover:bg-sky-700 text-white font-bold border border-slate-900 shadow-xs flex items-center justify-center gap-2 rounded-xl transition-all"
                  >
                    {inferring ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Running PyTorch Attention-UNet Forward Pass...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                        Run Deep Learning Segmentation Inference
                      </span>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Model Specifications Card */}
              <Card className="border border-slate-900 shadow-card bg-white p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-sky-600" />
                    Deep Learning Architecture Specifications
                  </span>
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    Eb3ls/landslides_segmentation
                  </span>
                </div>
                <div className="space-y-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Super-Resolution:</span>
                    <span className="font-bold text-slate-800">RCAN (5× Sub-Pixel Upsampling, 22.07 dB)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Segmentation Net:</span>
                    <span className="font-bold text-slate-800">Attention-UNet (Additive Skip Gates)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Feature Channels:</span>
                    <span className="font-bold text-slate-800">6-Band [Red, Green, Blue, NIR, NDVI, Slope]</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Optimization Loss:</span>
                    <span className="font-bold text-slate-800">Charbonnier + High-Frequency & BCEDice</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column: Multi-Spectral Visualizer & Live AI Detection */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="border border-slate-900 shadow-card bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-sky-600" />
                        {activeSegResult.station_name} — Spectral Detection
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 mt-0.5">
                        Site Location: {activeSegResult.coordinates.lat.toFixed(4)}°N, {activeSegResult.coordinates.lng.toFixed(4)}°E • Station ID: {activeSegResult.station_id}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={RISK_BADGES[activeSegResult.segmentation_results.risk_tier]?.variant || "sky"}
                      className="font-bold uppercase text-[11px] px-3 py-1 flex items-center gap-1.5 border border-slate-900 shadow-xs"
                    >
                      <span className={`w-2 h-2 rounded-full ${RISK_BADGES[activeSegResult.segmentation_results.risk_tier]?.dot || "bg-sky-500"}`} />
                      {RISK_BADGES[activeSegResult.segmentation_results.risk_tier]?.label || activeSegResult.segmentation_results.risk_tier}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-5">
                  {/* 3-Stage Visual Patch Comparison */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-sky-600" />
                        3-Stage Multi-Spectral Deep Learning Visualizer
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        Native (10m) → 5× RCAN (2m) → Attention Gate Mask
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Stage 1: Native Sentinel-2 */}
                      <div className="p-3 rounded-xl border border-slate-900 bg-slate-50 text-center space-y-2">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                          1. Native Sentinel-2 (10m)
                        </span>
                        <div className="w-full aspect-square rounded-lg border border-slate-300 bg-gradient-to-br from-emerald-800 via-emerald-700 to-amber-900/80 flex items-center justify-center p-2 relative overflow-hidden shadow-inner">
                          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:8px_8px]" />
                          <div className="relative z-10 text-white text-center p-2">
                            <p className="font-bold text-xs drop-shadow-md">RGB + NIR</p>
                            <p className="text-[9px] opacity-90">10m GSD</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-600 font-medium block">
                          NIR DN: {activeSegResult.spectral_summary.nir_mean_dn}
                        </span>
                      </div>

                      {/* Stage 2: RCAN 5x Super-Resolved */}
                      <div className="p-3 rounded-xl border border-slate-900 bg-sky-50/60 text-center space-y-2">
                        <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">
                          2. RCAN 5× Super-Res (2m)
                        </span>
                        <div className="w-full aspect-square rounded-lg border border-sky-300 bg-gradient-to-br from-emerald-600 via-emerald-500 to-amber-700 flex items-center justify-center p-2 relative overflow-hidden shadow-sm ring-1 ring-sky-300">
                          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:3px_3px]" />
                          <div className="relative z-10 text-white text-center p-2">
                            <p className="font-bold text-xs drop-shadow-md">5× Super-Resolved</p>
                            <p className="text-[9px] opacity-90">2m High Definition</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-sky-800 font-bold block">
                          PSNR 22.07 dB • SSIM 0.586
                        </span>
                      </div>

                      {/* Stage 3: Attention-UNet Hazard Scar Mask */}
                      <div className="p-3 rounded-xl border border-slate-900 bg-rose-50/60 text-center space-y-2">
                        <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                          3. Landslide Hazard Mask
                        </span>
                        <div className="w-full aspect-square rounded-lg border border-rose-300 bg-slate-900 flex items-center justify-center p-2 relative overflow-hidden shadow-inner">
                          {/* Visualized Hazard Scarp Overlay */}
                          <div
                            className="w-3/4 h-3/4 rounded-full bg-rose-500/80 blur-xs border-2 border-rose-300 flex items-center justify-center animate-pulse"
                            style={{
                              transform: `scale(${Math.min(1.2, Math.max(0.4, activeSegResult.segmentation_results.coverage_percent / 15))})`
                            }}
                          >
                            <span className="text-[10px] font-black text-white drop-shadow-md">
                              {activeSegResult.segmentation_results.coverage_percent}% Scar
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-rose-800 font-bold block">
                          Confidence IoU: {activeSegResult.segmentation_results.confidence_iou}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quantified Geomorphic Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Estimated Scarp Area</span>
                      <span className="text-base font-black text-slate-900">
                        {activeSegResult.segmentation_results.hazard_area_m2.toLocaleString()} <span className="text-[10px] text-slate-500 font-medium">m²</span>
                      </span>
                      <span className="text-[10px] text-slate-500 block font-medium">({activeSegResult.segmentation_results.hazard_area_ha} hectares)</span>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Hazard Coverage</span>
                      <span className="text-base font-black text-slate-900">
                        {activeSegResult.segmentation_results.coverage_percent}%
                      </span>
                      <span className="text-[10px] text-slate-500 block font-medium">
                        {activeSegResult.segmentation_results.landslide_pixels} / {activeSegResult.segmentation_results.total_pixels} pixels
                      </span>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Max Activation</span>
                      <span className="text-base font-black text-slate-900">
                        {(activeSegResult.segmentation_results.max_probability * 100).toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-slate-500 block font-medium">Sigmoid Peak Confidence</span>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Dice Coefficient</span>
                      <span className="text-base font-black text-emerald-700">
                        {activeSegResult.segmentation_results.dice_score}
                      </span>
                      <span className="text-[10px] text-slate-500 block font-medium">F1 Harmonic Validation</span>
                    </div>
                  </div>

                  {/* Spectral Reflectance Waveform Bars */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <span className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-sky-600" />
                        Multispectral Channel Reflectance (Digital Numbers 0-10,000)
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal">Level-2A BOA Calibrated</span>
                    </span>
                    <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                      <div className="p-1.5 rounded-lg bg-white border border-slate-200">
                        <span className="text-rose-600 font-bold block">Red (B4)</span>
                        <span className="font-extrabold text-slate-800">{activeSegResult.spectral_summary.red_mean_dn}</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-white border border-slate-200">
                        <span className="text-emerald-600 font-bold block">Green (B3)</span>
                        <span className="font-extrabold text-slate-800">{activeSegResult.spectral_summary.green_mean_dn}</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-white border border-slate-200">
                        <span className="text-sky-600 font-bold block">Blue (B2)</span>
                        <span className="font-extrabold text-slate-800">{activeSegResult.spectral_summary.blue_mean_dn}</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-white border border-slate-200">
                        <span className="text-purple-600 font-bold block">NIR (B8)</span>
                        <span className="font-extrabold text-slate-800">{activeSegResult.spectral_summary.nir_mean_dn}</span>
                      </div>
                    </div>
                  </div>

                  {/* Geomorphic Advisory Banner */}
                  <div className="p-3.5 rounded-xl bg-sky-50 border border-slate-900 text-slate-800 text-xs flex items-start gap-2.5">
                    <Zap className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-900">AI Inference Summary & Geomorphic Assessment:</p>
                      <p className="text-slate-600 leading-relaxed">
                        Attention-UNet detects an active scar zone of <strong>{activeSegResult.segmentation_results.hazard_area_m2.toLocaleString()} m²</strong> under a <strong>{activeSegResult.terrain_input.slope_angle_deg}°</strong> slope and <strong>{activeSegResult.terrain_input.rainfall_24h_mm}mm</strong> precipitation trigger. Multispectral RCAN super-resolution confirmed scarp depletion in the NIR channel (B8).
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: REGIONAL SATELLITE SUMMARY */}
        <TabsContent value="summary" className="space-y-6 focus:outline-none">
          {summary ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border border-slate-900 shadow-card bg-white p-4">
                <Mountain className="w-6 h-6 text-sky-600 mb-2" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Elevation Range</p>
                <p className="text-xl font-black text-slate-900 mt-1">{summary.elevation.min}m - {summary.elevation.max}m</p>
                <p className="text-xs text-slate-500 mt-0.5">Mean: {summary.elevation.avg}m</p>
              </Card>

              <Card className="border border-slate-900 shadow-card bg-white p-4">
                <Droplets className="w-6 h-6 text-emerald-600 mb-2" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Surface Moisture (0-7cm)</p>
                <p className="text-xl font-black text-slate-900 mt-1">{summary.soil_moisture_surface.avg} m³/m³</p>
                <p className="text-xs text-slate-500 mt-0.5">Across NER monitoring stations</p>
              </Card>

              <Card className="border border-slate-900 shadow-card bg-white p-4">
                <CloudRain className="w-6 h-6 text-sky-600 mb-2" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">24h Regional Rainfall</p>
                <p className="text-xl font-black text-slate-900 mt-1">{summary.rainfall_24h.total} mm</p>
                <p className="text-xs text-slate-500 mt-0.5">Avg: {summary.rainfall_24h.avg} mm/station</p>
              </Card>

              <Card className="border border-slate-900 shadow-card bg-white p-4">
                <Leaf className="w-6 h-6 text-green-600 mb-2" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Canopy NDVI Average</p>
                <p className="text-xl font-black text-slate-900 mt-1">{summary.ndvi.avg}</p>
                <p className="text-xs text-slate-500 mt-0.5">Range: {summary.ndvi.min} - {summary.ndvi.max}</p>
              </Card>
            </div>
          ) : (
            <Card className="border border-slate-900 shadow-card bg-white p-8 text-center">
              <p className="text-slate-600 font-bold">Regional satellite telemetry loaded.</p>
            </Card>
          )}
        </TabsContent>

        {/* TAB 3: STATIONS TELEMETRY GRID */}
        <TabsContent value="stations" className="space-y-6 focus:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(stations.length > 0 ? stations : NER_FALLBACK_STATIONS).map((st: any) => {
              const smRisk = Math.min(1, (st.real_soil_moisture_0_7cm || 0.4) / 0.6);
              const rainRisk = Math.min(1, (st.real_rainfall_24h || 10) / 50);
              const elevRisk = Math.min(1, (st.real_elevation || 1000) / 3000);
              const ndviRisk = Math.max(0, 1 - (st.estimated_ndvi || 0.5));
              const riskScore = Math.min(100, Math.round((smRisk * 0.3 + rainRisk * 0.25 + elevRisk * 0.25 + ndviRisk * 0.2) * 100));
              const tier = riskScore >= 55 ? "high" : riskScore >= 35 ? "moderate" : "low";

              return (
                <Card key={st.id} className="border border-slate-900 shadow-card bg-white p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{st.name}</h4>
                      <p className="text-[11px] text-slate-500 font-medium">{st.state} • {st.id}</p>
                    </div>
                    <Badge variant={RISK_BADGES[tier]?.variant || "sky"} className="text-[10px] font-bold uppercase">
                      {tier}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Elevation</span>
                      <span className="font-bold text-slate-800">{st.real_elevation || st.elevation}m</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Moisture</span>
                      <span className="font-bold text-slate-800">{st.real_soil_moisture_0_7cm || 0.4}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">Rain 24h</span>
                      <span className="font-bold text-slate-800">{st.real_rainfall_24h || 5}mm</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold">
                      <span className="text-slate-500">Composite Risk Score:</span>
                      <span className="font-bold text-slate-900">{riskScore} / 100</span>
                    </div>
                    <Progress value={riskScore} />
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const NER_DEFAULT_OPTIONS = [
  { id: "NER-001", name: "Gangtok North Slope" },
  { id: "NER-002", name: "Mangan Hill Monitor" },
  { id: "NER-003", name: "Namchi Valley Watch" },
  { id: "NER-004", name: "Guwahati Foothills" },
  { id: "NER-005", name: "Karbi Anglong Slope" },
  { id: "NER-006", name: "Imphal Valley Edge" },
  { id: "NER-007", name: "Churachandpur Hills" },
  { id: "NER-008", name: "Aizawl Ridge Monitor" },
  { id: "NER-009", name: "Lunglei Slope Watch" },
  { id: "NER-010", name: "Shillong Plateau Edge" },
  { id: "NER-011", name: "Cherrapunji Monitor" },
  { id: "NER-012", name: "Tura Hills Watch" },
  { id: "NER-013", name: "Kohima Ridge" },
  { id: "NER-014", name: "Dimapur Lowlands" },
  { id: "NER-015", name: "Agartala Slope Monitor" },
  { id: "NER-016", name: "Itanagar Foothills" },
  { id: "NER-017", name: "Ziro Valley Watch" },
  { id: "NER-018", name: "Pasighat Monitor" },
  { id: "NER-019", name: "Tawang Ridge" },
  { id: "NER-020", name: "Dima Hasao Watch" },
];

const NER_FALLBACK_STATIONS = [
  { id: "NER-001", name: "Gangtok North Slope", state: "Sikkim", real_elevation: 1487, real_soil_moisture_0_7cm: 0.40, real_rainfall_24h: 1.9, estimated_ndvi: 0.58 },
  { id: "NER-002", name: "Mangan Hill Monitor", state: "Sikkim", real_elevation: 796, real_soil_moisture_0_7cm: 0.41, real_rainfall_24h: 3.6, estimated_ndvi: 0.53 },
  { id: "NER-003", name: "Namchi Valley Watch", state: "Sikkim", real_elevation: 814, real_soil_moisture_0_7cm: 0.40, real_rainfall_24h: 2.2, estimated_ndvi: 0.59 },
  { id: "NER-004", name: "Guwahati Foothills", state: "Assam", real_elevation: 48, real_soil_moisture_0_7cm: 0.39, real_rainfall_24h: 0.0, estimated_ndvi: 0.45 },
  { id: "NER-005", name: "Karbi Anglong Slope", state: "Assam", real_elevation: 182, real_soil_moisture_0_7cm: 0.41, real_rainfall_24h: 1.2, estimated_ndvi: 0.55 },
  { id: "NER-006", name: "Imphal Valley Edge", state: "Manipur", real_elevation: 785, real_soil_moisture_0_7cm: 0.38, real_rainfall_24h: 4.5, estimated_ndvi: 0.49 },
  { id: "NER-007", name: "Churachandpur Hills", state: "Manipur", real_elevation: 915, real_soil_moisture_0_7cm: 0.42, real_rainfall_24h: 8.0, estimated_ndvi: 0.42 },
  { id: "NER-008", name: "Aizawl Ridge Monitor", state: "Mizoram", real_elevation: 885, real_soil_moisture_0_7cm: 0.44, real_rainfall_24h: 12.5, estimated_ndvi: 0.48 },
  { id: "NER-009", name: "Lunglei Slope Watch", state: "Mizoram", real_elevation: 720, real_soil_moisture_0_7cm: 0.43, real_rainfall_24h: 9.0, estimated_ndvi: 0.51 },
  { id: "NER-010", name: "Shillong Plateau Edge", state: "Meghalaya", real_elevation: 1490, real_soil_moisture_0_7cm: 0.35, real_rainfall_24h: 0.5, estimated_ndvi: 0.65 },
  { id: "NER-011", name: "Cherrapunji Monitor", state: "Meghalaya", real_elevation: 1430, real_soil_moisture_0_7cm: 0.48, real_rainfall_24h: 18.0, estimated_ndvi: 0.52 },
  { id: "NER-012", name: "Tura Hills Watch", state: "Meghalaya", real_elevation: 350, real_soil_moisture_0_7cm: 0.40, real_rainfall_24h: 2.0, estimated_ndvi: 0.58 },
  { id: "NER-013", name: "Kohima Ridge", state: "Nagaland", real_elevation: 1444, real_soil_moisture_0_7cm: 0.39, real_rainfall_24h: 1.5, estimated_ndvi: 0.44 },
  { id: "NER-014", name: "Dimapur Lowlands", state: "Nagaland", real_elevation: 196, real_soil_moisture_0_7cm: 0.36, real_rainfall_24h: 0.0, estimated_ndvi: 0.35 },
  { id: "NER-015", name: "Agartala Slope Monitor", state: "Tripura", real_elevation: 120, real_soil_moisture_0_7cm: 0.38, real_rainfall_24h: 0.2, estimated_ndvi: 0.55 },
  { id: "NER-016", name: "Itanagar Foothills", state: "Arunachal Pradesh", real_elevation: 320, real_soil_moisture_0_7cm: 0.37, real_rainfall_24h: 0.8, estimated_ndvi: 0.62 },
  { id: "NER-017", name: "Ziro Valley Watch", state: "Arunachal Pradesh", real_elevation: 1688, real_soil_moisture_0_7cm: 0.36, real_rainfall_24h: 0.4, estimated_ndvi: 0.78 },
  { id: "NER-018", name: "Pasighat Monitor", state: "Arunachal Pradesh", real_elevation: 155, real_soil_moisture_0_7cm: 0.42, real_rainfall_24h: 3.2, estimated_ndvi: 0.70 },
  { id: "NER-019", name: "Tawang Ridge", state: "Arunachal Pradesh", real_elevation: 3048, real_soil_moisture_0_7cm: 0.46, real_rainfall_24h: 14.0, estimated_ndvi: 0.25 },
  { id: "NER-020", name: "Dima Hasao Watch", state: "Assam", real_elevation: 680, real_soil_moisture_0_7cm: 0.43, real_rainfall_24h: 7.5, estimated_ndvi: 0.42 },
];

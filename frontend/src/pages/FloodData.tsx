import { useEffect, useState, useMemo } from 'react';
import { getFloodData, getFloodSummary, getFloodCorrelation, FloodDistrict, FloodSummary, FloodLandslideCorrelation } from '../services/api';
import { t } from '../i18n/translations';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, Line, ComposedChart, Area
} from 'recharts';
import {
  Droplets, AlertTriangle, TrendingUp, Waves, MapPin, Activity, Search,
  Filter, ShieldAlert, Compass, Layers, ArrowUpRight, CheckCircle2,
  Info, Sparkles, SlidersHorizontal, RefreshCw, X, Radio, ArrowRight,
  BarChart3, LifeBuoy, AlertCircle, FileText
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const RISK_COLOR = (score: number) => {
  if (score >= 70) return '#f43f5e'; // rose-500
  if (score >= 50) return '#f97316'; // orange-500
  if (score >= 30) return '#eab308'; // amber-500
  return '#10b981'; // emerald-500
};

const RISK_BADGE = (score: number) => {
  if (score >= 70) return { label: 'CRITICAL', bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
  if (score >= 50) return { label: 'HIGH RISK', bg: 'bg-orange-500/15 text-orange-400 border-orange-500/30' };
  if (score >= 30) return { label: 'MODERATE', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
  return { label: 'LOW RISK', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
};

export default function FloodData() {
  const [data, setData] = useState<FloodDistrict[]>([]);
  const [summary, setSummary] = useState<FloodSummary | null>(null);
  const [correlation, setCorrelation] = useState<FloodLandslideCorrelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW'>('ALL');
  const [activeTab, setActiveTab] = useState<'scatter' | 'barchart' | 'basins'>('scatter');
  const [selectedDistrict, setSelectedDistrict] = useState<FloodDistrict | null>(null);
  const [cwcAlertDispatched, setCwcAlertDispatched] = useState(false);

  const fetchData = async () => {
    try {
      const [floodRes, summaryRes, corrRes] = await Promise.all([
        getFloodData(),
        getFloodSummary(),
        getFloodCorrelation(),
      ]);
      setData(floodRes.data.data || []);
      setSummary(summaryRes.data);
      setCorrelation(corrRes.data.correlation || []);
    } catch (e) {
      console.error('Flood data fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Filtered district list
  const filteredDistricts = useMemo(() => {
    return data.filter(d => {
      const matchesSearch =
        d.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.river_systems.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesRisk = true;
      if (riskFilter === 'CRITICAL') matchesRisk = d.flood_risk_score >= 70;
      else if (riskFilter === 'HIGH') matchesRisk = d.flood_risk_score >= 50 && d.flood_risk_score < 70;
      else if (riskFilter === 'MODERATE') matchesRisk = d.flood_risk_score >= 30 && d.flood_risk_score < 50;
      else if (riskFilter === 'LOW') matchesRisk = d.flood_risk_score < 30;

      return matchesSearch && matchesRisk;
    });
  }, [data, searchQuery, riskFilter]);

  // River Basins aggregation
  const riverBasins = useMemo(() => {
    const basins: { [river: string]: { districts: string[]; maxRisk: number; avgDays: number; events: number } } = {};
    data.forEach(d => {
      d.river_systems.forEach(river => {
        if (!basins[river]) {
          basins[river] = { districts: [], maxRisk: 0, avgDays: 0, events: 0 };
        }
        basins[river].districts.push(d.district);
        basins[river].maxRisk = Math.max(basins[river].maxRisk, d.flood_risk_score);
        basins[river].avgDays += d.annual_flood_days;
        basins[river].events += d.historical_events;
      });
    });

    return Object.entries(basins).map(([river, stats]) => ({
      river,
      districtsCount: stats.districts.length,
      districts: stats.districts,
      maxRisk: stats.maxRisk,
      totalEvents: stats.events,
      avgDays: Math.round(stats.avgDays / stats.districts.length),
    })).sort((a, b) => b.maxRisk - a.maxRisk);
  }, [data]);

  // Find correlation for selected district
  const selectedCorr = useMemo(() => {
    if (!selectedDistrict) return null;
    return correlation.find(c => c.district === selectedDistrict.district);
  }, [selectedDistrict, correlation]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
          <Droplets className="w-6 h-6 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="text-sm font-semibold tracking-wide text-slate-400 dark:text-zinc-400">
          Syncing Asia Flood Atlas & CWC Hydrological Telemetry...
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── 1. Top Command Header ───────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Droplets className="w-3.5 h-3.5" />
              CWC • IMD • Asia Flood Atlas
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              Multi-Hazard Live Feed
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span>Hydro-Meteorological & Flood Risk Hub</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-3xl mt-1 leading-relaxed">
            Illustrative multi-hazard vulnerability matrix combining stored flood history, river context, and prototype geological slope indicators across North-Eastern India.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0 self-start md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="border-slate-200 dark:border-white/15 dark:bg-zinc-900/90 text-slate-800 dark:text-zinc-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white px-3.5 py-2 gap-2 whitespace-nowrap shrink-0 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${refreshing ? 'animate-spin text-cyan-400' : 'text-slate-400 dark:text-zinc-400'}`} />
            <span>Sync Hydro-Data</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setCwcAlertDispatched(true);
              setTimeout(() => setCwcAlertDispatched(false), 5000);
            }}
            className="bg-cyan-600 hover:bg-cyan-500 text-white dark:bg-cyan-600 dark:hover:bg-cyan-500 dark:text-white dark:border dark:border-cyan-400/40 text-xs font-bold shadow-lg shadow-cyan-600/20 dark:shadow-[0_0_15px_rgba(6,182,212,0.35)] px-3.5 py-2 gap-2 whitespace-nowrap shrink-0"
          >
            <Radio className="w-3.5 h-3.5 shrink-0 text-cyan-200 animate-pulse" />
            <span>Broadcast CWC Advisory</span>
          </Button>
        </div>
      </div>

      {/* CWC Advisory Toast Banner */}
      {cwcAlertDispatched && (
        <div className="p-4 rounded-2xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-200 flex items-center justify-between shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Central Water Commission (CWC) Inundation Advisory Dispatched</p>
              <p className="text-[11px] text-cyan-300">Synchronized with State Disaster Management Authorities (SDMA) & IMD Doppler Radar stations.</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-cyan-500/20 text-cyan-300 border-cyan-400/30 text-[10px] font-mono">
            CAP v1.2 SENT
          </Badge>
        </div>
      )}

      {/* ── 2. Top Executive KPI Metric Pods ───────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1 */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-950/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-card hover:border-slate-300 dark:hover:border-white/20 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Districts Monitored
              </span>
              <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200/60 dark:border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <MapPin className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                {summary.total_districts}
              </span>
              <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">Across 8 States</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1">
              <span>{riverBasins.length} Primary river catchment basins</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-950/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-card hover:border-slate-300 dark:hover:border-white/20 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Average Flood Index
              </span>
              <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200/60 dark:border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                <Droplets className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                {summary.avg_risk_score}
              </span>
              <span className="text-xs text-slate-400 dark:text-zinc-500 font-semibold">/ 100</span>
            </div>
            <div className="mt-2 w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full"
                style={{ width: `${summary.avg_risk_score}%` }}
              />
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-950/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-card hover:border-slate-300 dark:hover:border-white/20 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Severe Inundation Hotspots
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200/60 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
                {summary.high_risk_districts}
              </span>
              <span className="text-[11px] font-semibold text-rose-500 dark:text-rose-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                Score ≥ 60
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 dark:text-zinc-400">
              Peak: <strong>{summary.max_risk_district}</strong> ({summary.max_risk_score}/100)
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-950/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-card hover:border-slate-300 dark:hover:border-white/20 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Historical Outbursts
              </span>
              <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200/60 dark:border-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <Waves className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                {summary.total_historical_events}
              </span>
              <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400">2011–2024</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 dark:text-zinc-400">
              Avg <strong>{summary.avg_annual_flood_days} days/year</strong> inundation rate
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Visual Analytics Command Deck (Tabs) ─────────────── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-950/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-card space-y-5">
        {/* Navigation & Tab Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/10">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-500" />
              <span>Hydrological & Multi-Hazard Analytical Decks</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Switch between Compound Risk Quadrants, District Inundation Metrics, and River Catchment Basins.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('scatter')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'scatter'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>4-Quadrant Compound Scatter</span>
            </button>

            <button
              onClick={() => setActiveTab('barchart')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'barchart'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>District Rankings</span>
            </button>

            <button
              onClick={() => setActiveTab('basins')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'basins'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>River Basins ({riverBasins.length})</span>
            </button>
          </div>
        </div>

        {/* Tab 1: 4-Quadrant Scatter Matrix */}
        {activeTab === 'scatter' && (
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/60 dark:border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="font-semibold text-slate-800 dark:text-zinc-200">
                  Formula: <strong>Compound Risk = 0.40 × Flood Risk + 0.60 × Landslide Slope Risk</strong>
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                Dot color indicates overall compound hazard severity
              </span>
            </div>

            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis
                    type="number"
                    dataKey="flood_risk"
                    name="Flood Risk"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    label={{ value: 'Flood Risk Index (0 → 100)', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="landslide_risk"
                    name="Landslide Risk"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    label={{ value: 'Landslide Risk Index (0 → 100)', angle: -90, position: 'insideLeft', offset: 10, fill: '#94a3b8', fontSize: 11 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload as FloodLandslideCorrelation;
                        const badge = RISK_BADGE(d.compound_risk);
                        return (
                          <div className="p-3.5 rounded-xl bg-slate-900/95 dark:bg-black/95 backdrop-blur-xl border border-white/15 text-white shadow-2xl space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-black text-sm text-white">{d.district}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${badge.bg}`}>
                                {badge.label}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-white/10 font-mono">
                              <div>
                                <span className="text-[9px] text-cyan-400 block font-sans">Flood</span>
                                <span className="text-xs font-bold">{d.flood_risk}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-amber-400 block font-sans">Landslide</span>
                                <span className="text-xs font-bold">{d.landslide_risk}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-rose-400 block font-sans">Compound</span>
                                <span className="text-xs font-bold text-rose-300">{d.compound_risk}</span>
                              </div>
                            </div>
                            <div className="text-[10px] text-zinc-400 font-sans">
                              Rivers: <span className="text-zinc-200">{d.river_systems.join(', ')}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter
                    name="Districts"
                    data={correlation.filter(c => c.has_landslide_data)}
                    shape="circle"
                  >
                    {correlation.filter(c => c.has_landslide_data).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={RISK_COLOR(entry.compound_risk)}
                        stroke="#ffffff"
                        strokeWidth={1.5}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          const dist = data.find(d => d.district === entry.district);
                          if (dist) setSelectedDistrict(dist);
                        }}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* 4 Quadrant Explanatory Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 block">Quadrant I • Top-Right</span>
                <span className="text-xs font-bold text-slate-800 dark:text-white block mt-0.5">High Flood + High Landslide</span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400">Critical multi-hazard zone requiring combined CWC & EWS SOP.</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">Quadrant II • Top-Left</span>
                <span className="text-xs font-bold text-slate-800 dark:text-white block mt-0.5">High Landslide Dominant</span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400">Steep slope instability driven by intense localized precipitation.</span>
              </div>
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 block">Quadrant III • Bottom-Right</span>
                <span className="text-xs font-bold text-slate-800 dark:text-white block mt-0.5">Alluvial Flood Inundation</span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400">River basin overflow & prolonged water stagnation risk.</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">Quadrant IV • Bottom-Left</span>
                <span className="text-xs font-bold text-slate-800 dark:text-white block mt-0.5">Stable Baseline</span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400">Low immediate hazard profile under current baseline parameters.</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: District Comparative Bar Chart */}
        {activeTab === 'barchart' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
              <span>Comparing Top 12 Districts by Flood Risk Index vs Annual Flood Days</span>
              <span className="font-mono text-[11px]">Sorted Descending</span>
            </div>

            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.slice(0, 12)} margin={{ top: 20, right: 30, bottom: 40, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis
                    dataKey="district"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    angle={-30}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} domain={[0, 100]} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#38bdf8' }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="p-3 rounded-xl bg-slate-900/95 dark:bg-black/95 backdrop-blur-xl border border-white/15 text-white shadow-2xl text-xs space-y-1">
                            <span className="font-bold text-sm block">{label}</span>
                            <div className="flex items-center justify-between gap-4 text-cyan-300">
                              <span>Flood Risk:</span>
                              <span className="font-mono font-bold">{payload[0]?.value}/100</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-sky-400">
                              <span>Annual Flood Days:</span>
                              <span className="font-mono font-bold">{payload[1]?.value} days/yr</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="flood_risk_score"
                    name="Flood Risk Score"
                    radius={[6, 6, 0, 0]}
                  >
                    {data.slice(0, 12).map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={RISK_COLOR(entry.flood_risk_score)} />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="annual_flood_days"
                    name="Annual Flood Days"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    dot={{ fill: '#38bdf8', r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab 3: River Basin Vulnerability Matrix */}
        {activeTab === 'basins' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {riverBasins.map((basin, idx) => {
              const badge = RISK_BADGE(basin.maxRisk);
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/70 border border-slate-200/80 dark:border-white/10 hover:border-cyan-500/50 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                        <Waves className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {basin.river} River
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 border-t border-slate-200/60 dark:border-white/5 font-mono">
                    <div>
                      <span className="text-[9px] font-sans text-slate-400 dark:text-zinc-500 block">Districts</span>
                      <span className="font-bold text-slate-800 dark:text-zinc-200">{basin.districtsCount}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-sans text-slate-400 dark:text-zinc-500 block">Peak Risk</span>
                      <span className="font-bold text-rose-500 dark:text-rose-400">{basin.maxRisk}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-sans text-slate-400 dark:text-zinc-500 block">Outbursts</span>
                      <span className="font-bold text-amber-500 dark:text-amber-400">{basin.totalEvents}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Catchment: <span className="text-slate-700 dark:text-zinc-300 font-medium">{basin.districts.join(', ')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 4. District Hydro-Telemetry & Surveillance Matrix ──── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-950/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-card space-y-4">
        {/* Table Filter & Search Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-500" />
              <span>District Hydro-Vulnerability Telemetry ({filteredDistricts.length})</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Prototype multi-hazard view cross-referencing stored flood days, historical events, and river networks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search district or river..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9 bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
              />
            </div>

            {/* Risk Filters */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/10">
              {(['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map(tier => (
                <button
                  key={tier}
                  onClick={() => setRiskFilter(tier)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all uppercase ${
                    riskFilter === tier
                      ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-white/10 text-left">
                <th className="py-3 px-3 font-bold uppercase tracking-wider">District</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider">Flood Risk Index</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider">Compound Threat</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider">Annual Flood Days</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider">Historical Outbursts</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider">Connected River Systems</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredDistricts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 dark:text-zinc-500 text-xs">
                    No districts matched your filter query.
                  </td>
                </tr>
              ) : (
                filteredDistricts.map((d, i) => {
                  const badge = RISK_BADGE(d.flood_risk_score);
                  const corr = correlation.find(c => c.district === d.district);

                  return (
                    <tr
                      key={i}
                      className="hover:bg-slate-50/60 dark:hover:bg-zinc-900/60 transition-colors cursor-pointer group"
                      onClick={() => setSelectedDistrict(d)}
                    >
                      {/* District Name */}
                      <td className="py-3 px-3">
                        <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{d.district}</span>
                          <ArrowUpRight className="w-3 h-3 text-slate-400 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </td>

                      {/* Flood Risk Score Bar */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-20 bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${d.flood_risk_score}%`,
                                backgroundColor: RISK_COLOR(d.flood_risk_score),
                              }}
                            />
                          </div>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{d.flood_risk_score}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </div>
                      </td>

                      {/* Compound Risk */}
                      <td className="py-3 px-3">
                        {corr?.has_landslide_data ? (
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="font-bold text-slate-800 dark:text-zinc-200">{corr.compound_risk}</span>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                              (L: {corr.landslide_risk})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-zinc-500 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* Annual Flood Days */}
                      <td className="py-3 px-3 font-mono font-semibold text-cyan-600 dark:text-cyan-400">
                        {d.annual_flood_days} days/yr
                      </td>

                      {/* Historical Outbursts */}
                      <td className="py-3 px-3 font-mono font-semibold text-amber-600 dark:text-amber-400">
                        {d.historical_events} events
                      </td>

                      {/* River Systems */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {d.river_systems.map((river, rIdx) => (
                            <span
                              key={rIdx}
                              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-900 text-[10px] font-medium text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-white/10"
                            >
                              {river}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-white font-bold"
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedDistrict(d);
                          }}
                        >
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. District Deep-Dive Modal / Drawer ───────────────── */}
      {selectedDistrict && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/15 rounded-3xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{selectedDistrict.district} Hydro-Analysis</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    River Catchment & Disaster Response Protocol
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDistrict(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metric Pods */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-white/10">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 block">Flood Risk</span>
                <span className="text-lg font-black text-slate-900 dark:text-white font-mono">{selectedDistrict.flood_risk_score}</span>
                <span className="text-[10px] text-cyan-500 block font-semibold">Score / 100</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-white/10">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 block">Landslide Risk</span>
                <span className="text-lg font-black text-slate-900 dark:text-white font-mono">{selectedCorr?.landslide_risk || '—'}</span>
                <span className="text-[10px] text-amber-500 block font-semibold">Geotechnical Index</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-white/10">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 block">Compound Risk</span>
                <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">{selectedCorr?.compound_risk || '—'}</span>
                <span className="text-[10px] text-rose-500 block font-semibold">0.4F + 0.6L</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-white/10">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 block">Flood Days</span>
                <span className="text-lg font-black text-slate-900 dark:text-white font-mono">{selectedDistrict.annual_flood_days}</span>
                <span className="text-[10px] text-slate-400 block font-semibold">Days / Year</span>
              </div>
            </div>

            {/* River Basins & Vulnerability Details */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Active River Networks & Catchments
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedDistrict.river_systems.map((r, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Waves className="w-3.5 h-3.5" />
                    {r} River Basin
                  </span>
                ))}
              </div>
            </div>

            {/* Standard Operating Disaster Response Checklist */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-white/10 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 text-cyan-400" />
                <span>NDMA & CWC Multi-Hazard SOP Protocol</span>
              </h4>
              <ul className="text-xs text-slate-600 dark:text-zinc-300 space-y-1.5">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Cross-verify soil moisture saturation thresholds prior to dam spillway discharge.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Issue automated CAP alert broadcasts to riverside villages within a 15 km radius.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Pre-position State Disaster Response Force (SDRF) inflatable watercraft at district staging posts.</span>
                </li>
              </ul>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDistrict(null)}
                className="text-xs font-semibold"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedDistrict(null);
                  setCwcAlertDispatched(true);
                  setTimeout(() => setCwcAlertDispatched(false), 5000);
                }}
                className="bg-cyan-600 hover:bg-cyan-500 text-white dark:bg-cyan-600 dark:hover:bg-cyan-500 dark:text-white dark:border dark:border-cyan-400/40 text-xs font-bold shadow-lg shadow-cyan-600/20 dark:shadow-[0_0_15px_rgba(6,182,212,0.35)]"
              >
                Dispatch District Advisory
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStations, Station } from '../services/api';
import { t } from '../i18n/translations';
import {
  Radio, Search, MapPin, Mountain, Droplets, TrendingUp,
  ChevronRight, Activity, Filter, AlertTriangle, ShieldCheck,
  Sparkles, Layers, SlidersHorizontal, ArrowUpDown, RefreshCw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

export default function Stations() {
  const navigate = useNavigate();
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'critical' | 'high' | 'moderate' | 'low'>('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'risk_desc' | 'risk_asc' | 'rain_desc' | 'slope_desc' | 'name'>('risk_desc');

  const fetchStations = async () => {
    setLoading(true);
    try {
      const res = await getStations();
      setStations(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Stations fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  // Get unique states for filter
  const states = useMemo(() => {
    return [...new Set(stations.map(s => s.state).filter(Boolean))].sort();
  }, [stations]);

  // Statistics
  const stats = useMemo(() => {
    const total = stations.length;
    const critical = stations.filter(s => s.risk?.level === 'critical').length;
    const high = stations.filter(s => s.risk?.level === 'high').length;
    const moderate = stations.filter(s => s.risk?.level === 'moderate').length;
    const low = stations.filter(s => s.risk?.level === 'low').length;
    const avgRisk = total > 0
      ? (stations.reduce((sum, s) => sum + (s.risk?.score || 0), 0) / total).toFixed(1)
      : '0.0';

    return { total, critical, high, moderate, low, avgRisk };
  }, [stations]);

  // Filtered & Sorted Stations
  const filteredStations = useMemo(() => {
    let result = stations.filter(s => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = s.name?.toLowerCase().includes(q);
        const matchId = s.station_id?.toLowerCase().includes(q);
        const matchDistrict = s.district?.toLowerCase().includes(q);
        const matchState = s.state?.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchDistrict && !matchState) return false;
      }
      if (riskFilter !== 'all' && s.risk?.level !== riskFilter) return false;
      if (stateFilter !== 'all' && s.state !== stateFilter) return false;
      return true;
    });

    result.sort((a, b) => {
      const scoreA = a.risk?.score || 0;
      const scoreB = b.risk?.score || 0;
      const rainA = a.latest_reading?.rainfall_mm || 0;
      const rainB = b.latest_reading?.rainfall_mm || 0;
      const slopeA = a.slope_angle || 0;
      const slopeB = b.slope_angle || 0;

      if (sortBy === 'risk_desc') return scoreB - scoreA;
      if (sortBy === 'risk_asc') return scoreA - scoreB;
      if (sortBy === 'rain_desc') return rainB - rainA;
      if (sortBy === 'slope_desc') return slopeB - slopeA;
      return (a.name || '').localeCompare(b.name || '');
    });

    return result;
  }, [stations, search, riskFilter, stateFilter, sortBy]);

  if (loading && !stations.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 max-w-sm rounded-3xl bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-white/10 shadow-xl">
          <div className="relative w-14 h-14 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-sky-100 dark:border-zinc-800" />
            <div className="absolute inset-0 rounded-full border-4 border-sky-600 dark:border-white border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Radio className="w-5 h-5 text-sky-600 dark:text-white animate-pulse" />
            </div>
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">Connecting IoT Network...</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Synchronizing 28 Pan-India telemetry nodes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto animate-fade-in min-w-0">
      {/* ── Top Header Banner ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-950/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 shadow-card">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-sky-400 text-white flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {t('stations')}
                </h1>
                <Badge variant="sky" size="md" className="font-bold">
                  Pan-India Grid
                </Badge>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>28 Seeded Stations</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
                Prototype geotechnical records • 15 States & UTs • No live InSAR feed
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStations}
            className="text-xs h-9 px-3.5 gap-1.5 font-bold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Grid</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate('/map')}
            className="text-xs h-9 px-3.5 gap-1.5 font-bold"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>View on GIS Map</span>
          </Button>
        </div>
      </div>

      {/* ── 5 Interactive KPI Metric Filter Pods ─────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            key: 'all',
            label: 'Total Stations',
            value: stats.total,
            icon: Radio,
            activeColor: 'border-sky-500 text-sky-600 dark:text-white',
            badge: 'Pan-India',
            gradient: 'from-sky-500 to-blue-600',
          },
          {
            key: 'critical',
            label: 'Critical Risk',
            value: stats.critical,
            icon: AlertTriangle,
            activeColor: 'border-rose-500 text-rose-600 dark:text-rose-400',
            badge: 'Immediate Action',
            gradient: 'from-rose-600 to-red-500',
            pulse: stats.critical > 0,
          },
          {
            key: 'high',
            label: 'High Risk',
            value: stats.high,
            icon: TrendingUp,
            activeColor: 'border-orange-500 text-orange-600 dark:text-orange-400',
            badge: 'Warning Watch',
            gradient: 'from-orange-500 to-amber-500',
          },
          {
            key: 'moderate',
            label: 'Moderate Risk',
            value: stats.moderate,
            icon: Activity,
            activeColor: 'border-amber-500 text-amber-600 dark:text-amber-300',
            badge: 'Advisory',
            gradient: 'from-amber-500 to-yellow-500',
          },
          {
            key: 'low',
            label: 'Low / Nominal',
            value: stats.low,
            icon: ShieldCheck,
            activeColor: 'border-emerald-500 text-emerald-600 dark:text-emerald-400',
            badge: 'Stable Slope',
            gradient: 'from-emerald-500 to-green-600',
          },
        ].map((card) => {
          const isSelected = riskFilter === card.key;
          return (
            <div
              key={card.key}
              onClick={() => setRiskFilter(card.key as any)}
              className={`p-4 rounded-2xl transition-all cursor-pointer select-none group border relative overflow-hidden backdrop-blur-xl ${
                isSelected
                  ? 'bg-white dark:bg-zinc-900 border-2 ' + card.activeColor + ' shadow-lg shadow-black/30 ring-2 ring-sky-200/50 dark:ring-white/10'
                  : 'bg-white dark:bg-zinc-950/80 border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-card hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${card.gradient} text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform`}>
                  <card.icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 border border-slate-200/80 dark:border-white/10">
                  {card.badge}
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {card.value}
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                {card.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Search, Filter & Sorting Bar ─────────────────────── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-card space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Station Name, ID (e.g. UK-001, KL-001), District, or State..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-sky-500 dark:focus:border-white focus:ring-2 focus:ring-sky-100 dark:focus:ring-white/10 transition-all"
            />
          </div>

          {/* State Filter Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-zinc-200">
              <MapPin className="w-3.5 h-3.5 text-sky-600 dark:text-white shrink-0" />
              <span className="hidden sm:inline text-slate-500 dark:text-zinc-400">State:</span>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-white font-bold focus:outline-none cursor-pointer pr-2 text-xs"
              >
                <option value="all" className="dark:bg-zinc-950">All States & UTs ({states.length})</option>
                {states.map((st) => (
                  <option key={st} value={st} className="dark:bg-zinc-950">{st}</option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-zinc-200">
              <ArrowUpDown className="w-3.5 h-3.5 text-sky-600 dark:text-white shrink-0" />
              <span className="hidden sm:inline text-slate-500 dark:text-zinc-400">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-slate-900 dark:text-white font-bold focus:outline-none cursor-pointer pr-2 text-xs"
              >
                <option value="risk_desc" className="dark:bg-zinc-950">Highest Risk First</option>
                <option value="risk_asc" className="dark:bg-zinc-950">Lowest Risk First</option>
                <option value="rain_desc" className="dark:bg-zinc-950">Peak Rainfall (24h)</option>
                <option value="slope_desc" className="dark:bg-zinc-950">Steepest Slope</option>
                <option value="name" className="dark:bg-zinc-950">Alphabetical (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Counter Strip */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 font-medium pt-2 border-t border-slate-100 dark:border-white/10">
          <div>
            Showing <strong className="text-slate-900 dark:text-white font-bold">{filteredStations.length}</strong> of {stations.length} active monitoring nodes
          </div>
          {riskFilter !== 'all' || stateFilter !== 'all' || search ? (
            <button
              onClick={() => { setRiskFilter('all'); setStateFilter('all'); setSearch(''); }}
              className="text-[11px] font-bold text-sky-600 dark:text-white hover:underline cursor-pointer"
            >
              Clear Filters
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Station Command Grid ─────────────────────────────── */}
      {filteredStations.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-950/80 rounded-2xl border border-slate-200/90 dark:border-white/10 p-8 shadow-card">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-zinc-900 flex items-center justify-center mx-auto mb-3">
            <Radio className="w-8 h-8 text-slate-400 dark:text-zinc-600" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No monitoring stations match your search</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            Try adjusting your keyword filter or switch state/risk level selector back to All.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStations.map((station) => {
            const risk = station.risk;
            const riskLevel = risk?.level || 'low';
            const riskScore = risk?.score || 0;

            const isCritical = riskLevel === 'critical';
            const isHigh = riskLevel === 'high';
            const isModerate = riskLevel === 'moderate';

            const tierBadge = isCritical
              ? { bg: 'bg-rose-500 text-white', label: 'CRITICAL', border: 'border-rose-500/40' }
              : isHigh
              ? { bg: 'bg-orange-500 text-white', label: 'HIGH RISK', border: 'border-orange-500/40' }
              : isModerate
              ? { bg: 'bg-amber-500 text-white', label: 'MODERATE', border: 'border-amber-500/40' }
              : { bg: 'bg-emerald-500 text-white', label: 'LOW / STABLE', border: 'border-emerald-500/40' };

            const progressColor = isCritical
              ? 'bg-rose-500'
              : isHigh
              ? 'bg-orange-500'
              : isModerate
              ? 'bg-amber-500'
              : 'bg-emerald-500';

            const rainfallVal = station.latest_reading?.rainfall_mm ?? 0;
            const slopeVal = station.slope_angle ?? 35;
            const elevationVal = station.elevation ?? 1200;

            return (
              <div
                key={station.station_id}
                onClick={() => navigate(`/station/${station.station_id}`)}
                className="group p-5 rounded-2xl bg-white dark:bg-zinc-950/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 hover:border-sky-400 dark:hover:border-white/30 shadow-card hover:shadow-xl dark:hover:shadow-black/70 hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${progressColor} ${isCritical ? 'animate-ping' : ''}`} />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors truncate">
                          {station.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 shrink-0" />
                        <span className="truncate">{station.district}, {station.state}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-white/10">
                        {station.station_id}
                      </span>
                      <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${tierBadge.bg}`}>
                        {tierBadge.label}
                      </span>
                    </div>
                  </div>

                  {/* 3 Telemetry Data Pods */}
                  <div className="grid grid-cols-3 gap-2 my-3.5">
                    <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-100 dark:border-white/10">
                      <Droplets className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 mx-auto mb-1" />
                      <p className="text-xs font-black text-slate-900 dark:text-white">{rainfallVal} mm</p>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">Rain 24h</p>
                    </div>

                    <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-100 dark:border-white/10">
                      <Mountain className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
                      <p className="text-xs font-black text-slate-900 dark:text-white">{elevationVal} m</p>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">Elevation</p>
                    </div>

                    <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-100 dark:border-white/10">
                      <TrendingUp className="w-3.5 h-3.5 text-orange-600 dark:text-amber-400 mx-auto mb-1" />
                      <p className="text-xs font-black text-slate-900 dark:text-white">{slopeVal}°</p>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">Slope</p>
                    </div>
                  </div>
                </div>

                {/* Risk Progress Bar & Action Link */}
                <div className="pt-3 border-t border-slate-100 dark:border-white/10">
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-500 dark:text-zinc-400 text-[11px]">AI Risk Score</span>
                    <span className={`text-xs font-black ${isCritical ? 'text-rose-600 dark:text-rose-400' : (isHigh ? 'text-orange-600 dark:text-orange-400' : 'text-slate-900 dark:text-white')}`}>
                      {riskScore.toFixed(1)} / 100
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-zinc-900 overflow-hidden mb-2.5">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${progressColor}`}
                      style={{ width: `${Math.min(100, Math.max(5, riskScore))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-bold text-sky-600 dark:text-zinc-300 group-hover:text-sky-700 dark:group-hover:text-white">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-sky-500" />
                      <span>Latest Database Record</span>
                    </span>
                    <span className="flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      Details <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

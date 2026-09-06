import { useEffect, useState, useMemo } from 'react';
import {
  getDashboardStats, getRainfallTrend, getRiskTrend, getStateSummary,
  getStations, getAlerts, acknowledgeAlert, resolveAlert,
  DashboardStats, Station, Alert,
} from '../services/api';
import { t } from '../i18n/translations';
import { useAuth } from '../App';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import {
  Activity, AlertTriangle, Users, FileText, TrendingUp,
  Radio, Droplets, Mountain, MapPin, Clock, Shield, Zap,
  ChevronRight, Building2, Car, Eye, Cloud, Sun, Wind,
  Thermometer, BarChart3, Layers, Target, Bell, Map,
  Navigation, AlertCircle, CheckCircle, XCircle, Info, RefreshCw, Sparkles,
  ArrowUpRight, ArrowDownRight, Compass, ShieldAlert, CheckCircle2
} from 'lucide-react';

const FALLBACK_STATS: DashboardStats = {
  total_stations: 20,
  active_stations: 20,
  risk_distribution: { low: 12, moderate: 5, high: 2, critical: 1 },
  active_alerts: 2,
  pending_reports: 3,
  recent_reports_24h: 8,
  road_status: { open: 37, partially_blocked: 9, blocked: 2 },
  affected_population: 14500,
  total_villages: 85,
  high_risk_villages: 14,
  average_risk_score: 34.2,
  last_updated: new Date().toISOString(),
};

const FALLBACK_STATES = [
  { state: 'Manipur', stations: 3, avg_risk_score: 49.0, critical_count: 1 },
  { state: 'Sikkim', stations: 3, avg_risk_score: 26.8, critical_count: 0 },
  { state: 'Mizoram', stations: 2, avg_risk_score: 19.0, critical_count: 0 },
  { state: 'Nagaland', stations: 3, avg_risk_score: 18.5, critical_count: 0 },
  { state: 'Arunachal Pradesh', stations: 3, avg_risk_score: 16.4, critical_count: 0 },
  { state: 'Assam', stations: 2, avg_risk_score: 14.2, critical_count: 0 },
  { state: 'Meghalaya', stations: 2, avg_risk_score: 12.0, critical_count: 0 },
  { state: 'Tripura', stations: 2, avg_risk_score: 10.5, critical_count: 0 },
];

const RISK_COLORS: Record<string, string> = {
  low: '#10b981',        // Emerald 500
  moderate: '#f59e0b',   // Amber 500
  high: '#f97316',       // Orange 500
  very_high: '#ea580c',  // Orange 600
  critical: '#f43f5e',   // Rose 500
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [rainfall, setRainfall] = useState<{ timestamp: string; avg_rainfall: number }[]>([]);
  const [riskTrend, setRiskTrend] = useState<{ timestamp: string; avg_risk: number }[]>([]);
  const [stateData, setStateData] = useState<{ state: string; stations: number; avg_risk_score: number; critical_count: number }[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [alertsData, setAlertsData] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'stations' | 'alerts'>('overview');

  // Interactive Graph Controls
  const [rainfallChartType, setRainfallChartType] = useState<'area' | 'bar'>('area');
  const [rainfallTimeframe, setRainfallTimeframe] = useState<24 | 48>(48);
  const [riskChartType, setRiskChartType] = useState<'line' | 'bar'>('line');

  // Active Safe Data Fallbacks
  const activeStats = stats || FALLBACK_STATS;
  const activeStateData = stateData.length ? stateData : FALLBACK_STATES;

  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const settle = <T,>(p: Promise<T>): Promise<T | null> => p.catch(() => null);
      const [statsRes, rainRes, riskRes, stateRes, stationsRes, alertsRes] = await Promise.all([
        settle(getDashboardStats()),
        settle(getRainfallTrend()),
        settle(getRiskTrend()),
        settle(getStateSummary()),
        settle(getStations()),
        settle(getAlerts({ status: 'active' })),
      ]);
      if (statsRes?.data) {
        setStats(statsRes.data);
      } else {
        setStats(prev => prev || FALLBACK_STATS);
      }
      if (rainRes?.data && rainRes.data.length > 0) {
        setRainfall(rainRes.data);
      }
      if (riskRes?.data && riskRes.data.length > 0) {
        setRiskTrend(riskRes.data);
      }
      if (stateRes?.data && stateRes.data.length > 0) {
        setStateData(stateRes.data);
      } else {
        setStateData(prev => prev.length ? prev : FALLBACK_STATES);
      }
      if (stationsRes?.data && stationsRes.data.length > 0) {
        setStations(stationsRes.data);
      }
      if (alertsRes?.data) {
        setAlertsData(alertsRes.data);
      }
    } catch (e) {
      console.error('Dashboard fetch error:', e);
      setStats(prev => prev || FALLBACK_STATS);
      setStateData(prev => prev.length ? prev : FALLBACK_STATES);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, []);

  // Filtered rainfall data based on timeframe
  const displayRainfall = useMemo(() => {
    return rainfall.slice(-rainfallTimeframe);
  }, [rainfall, rainfallTimeframe]);

  // Rainfall summary metrics
  const rainfallMetrics = useMemo(() => {
    if (!displayRainfall.length) return { max: '0', avg: '0', latest: '0' };
    const values = displayRainfall.map(d => d.avg_rainfall);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const latest = values[values.length - 1];
    return {
      max: max.toFixed(1),
      avg: avg.toFixed(1),
      latest: latest.toFixed(1),
    };
  }, [displayRainfall]);

  // Risk Trend Metrics
  const { recentRisk, currentRiskScore, peakRiskScore, avgRiskScore } = useMemo(() => {
    const recent = riskTrend.slice(-48);
    if (!recent.length) return { recentRisk: [], currentRiskScore: '0', peakRiskScore: '0', avgRiskScore: '0' };
    const values = recent.map(r => r.avg_risk);
    const max = Math.max(...values);
    const avg = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
    const current = values[values.length - 1];
    return {
      recentRisk: recent,
      currentRiskScore: typeof current === 'number' ? current.toFixed(1) : String(current),
      peakRiskScore: typeof max === 'number' ? max.toFixed(1) : String(max),
      avgRiskScore: avg.toFixed(1),
    };
  }, [riskTrend]);

  // Road Status Metrics
  const roadMetrics = useMemo(() => {
    const o = activeStats.road_status.open || 0;
    const p = activeStats.road_status.partially_blocked || 0;
    const b = activeStats.road_status.blocked || 0;
    const total = o + p + b || 1;
    return {
      total,
      openPct: Math.round((o / total) * 100),
      partialPct: Math.round((p / total) * 100),
      blockedPct: Math.round((b / total) * 100),
    };
  }, [activeStats]);

  // Risk Distribution calculated data
  const { riskPieData, totalAssessments, elevatedRiskCount, elevatedRiskPct } = useMemo(() => {
    const low = activeStats.risk_distribution.low || 0;
    const mod = activeStats.risk_distribution.moderate || 0;
    const high = activeStats.risk_distribution.high || 0;
    const crit = activeStats.risk_distribution.critical || 0;
    const total = low + mod + high + crit || 1;
    const elevated = high + crit;
    const elevatedPct = Math.round((elevated / total) * 100);

    const data = [
      {
        name: t('lowRisk') || 'Low Risk',
        key: 'low',
        value: low,
        color: '#10b981',
        pct: Math.round((low / total) * 100),
        badgeClass: 'bg-emerald-50 dark:bg-zinc-900/90 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-500/30',
        barColor: 'bg-emerald-500',
        sub: 'Safe baseline telemetry',
      },
      {
        name: t('moderateRisk') || 'Moderate',
        key: 'moderate',
        value: mod,
        color: '#f59e0b',
        pct: Math.round((mod / total) * 100),
        badgeClass: 'bg-amber-50 dark:bg-zinc-900/90 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-500/30',
        barColor: 'bg-amber-500',
        sub: 'Watch status, increased rain',
      },
      {
        name: t('highRisk') || 'High Risk',
        key: 'high',
        value: high,
        color: '#f97316',
        pct: Math.round((high / total) * 100),
        badgeClass: 'bg-orange-50 dark:bg-zinc-900/90 text-orange-700 dark:text-orange-400 border-orange-200/80 dark:border-orange-500/30',
        barColor: 'bg-orange-500',
        sub: 'Slope stress detected',
      },
      {
        name: t('criticalRisk') || 'Critical',
        key: 'critical',
        value: crit,
        color: '#f43f5e',
        pct: Math.round((crit / total) * 100),
        badgeClass: 'bg-rose-50 dark:bg-zinc-900/90 text-rose-700 dark:text-rose-400 border-rose-200/80 dark:border-rose-500/30',
        barColor: 'bg-rose-500',
        sub: 'Immediate action required',
      },
    ];

    return {
      riskPieData: data,
      totalAssessments: total,
      elevatedRiskCount: elevated,
      elevatedRiskPct: elevatedPct,
    };
  }, [activeStats]);

  // Radar Data
  const radarData = useMemo(() => {
    return activeStateData.map(s => ({
      state: s.state.replace(' Pradesh', '').replace(' Islands', ''),
      risk: s.avg_risk_score,
      fullMark: 100,
    }));
  }, [activeStateData]);

  // State Radar Summary Stats
  const { topRadarState, lowestRadarState, avgRadarRisk } = useMemo(() => {
    if (!activeStateData.length) return { topRadarState: null, lowestRadarState: null, avgRadarRisk: '0' };
    const sorted = [...activeStateData].sort((a, b) => b.avg_risk_score - a.avg_risk_score);
    const avg = Math.round((activeStateData.reduce((acc, s) => acc + s.avg_risk_score, 0) / activeStateData.length) * 10) / 10;
    return {
      topRadarState: sorted[0],
      lowestRadarState: sorted[sorted.length - 1],
      avgRadarRisk: avg.toFixed(1),
    };
  }, [activeStateData]);

  // Top At-Risk Stations
  const topStations = useMemo(() => {
    return [...stations]
      .sort((a, b) => (b.risk?.score || 0) - (a.risk?.score || 0))
      .slice(0, 5);
  }, [stations]);

  // KPI Stat Cards
  const statCards = useMemo(() => [
    {
      label: t('activeSensors'),
      value: activeStats.total_stations,
      icon: Radio,
      badge: `${activeStats.active_stations} Online`,
      badgeVariant: 'sky' as const,
      sub: 'NER IoT Station Grid',
      iconColor: 'bg-sky-50 dark:bg-zinc-900/90 text-sky-600 dark:text-white border-sky-200/80 dark:border-white/20 shadow-xs dark:shadow-black/60',
    },
    {
      label: t('activeAlerts'),
      value: activeStats.active_alerts,
      icon: AlertTriangle,
      badge: activeStats.active_alerts > 0 ? `${activeStats.active_alerts} Urgent` : 'Nominal',
      badgeVariant: (activeStats.active_alerts > 0 ? 'destructive' : 'success') as any,
      sub: activeStats.active_alerts > 0 ? 'Urgent notifications' : 'No critical alerts',
      iconColor: activeStats.active_alerts > 0 ? 'bg-rose-50 dark:bg-zinc-900/90 text-rose-600 dark:text-rose-400 border-rose-200/80 dark:border-rose-500/40 shadow-xs dark:shadow-black/60' : 'bg-emerald-50 dark:bg-zinc-900/90 text-emerald-600 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-500/40 shadow-xs dark:shadow-black/60',
      pulse: activeStats.active_alerts > 0,
    },
    {
      label: t('peopleAtRisk'),
      value: activeStats.affected_population > 99999 ? `${Math.round(activeStats.affected_population / 1000)}K` : activeStats.affected_population.toLocaleString(),
      icon: Users,
      badge: 'NER Zone',
      badgeVariant: 'secondary' as const,
      sub: t('acrossNER'),
      iconColor: 'bg-indigo-50 dark:bg-zinc-900/90 text-indigo-600 dark:text-zinc-100 border-indigo-200/80 dark:border-white/20 shadow-xs dark:shadow-black/60',
    },
    {
      label: t('pendingReports'),
      value: activeStats.pending_reports,
      icon: FileText,
      badge: `+${activeStats.recent_reports_24h} (24h)`,
      badgeVariant: 'warning' as const,
      sub: 'Citizen ground reports',
      iconColor: 'bg-amber-50 dark:bg-zinc-900/90 text-amber-600 dark:text-amber-300 border-amber-200/80 dark:border-amber-500/40 shadow-xs dark:shadow-black/60',
    },
    {
      label: t('avgRiskScore'),
      value: activeStats.average_risk_score.toFixed(1),
      icon: TrendingUp,
      badge: activeStats.average_risk_score > 50 ? 'High' : 'Moderate',
      badgeVariant: (activeStats.average_risk_score > 50 ? 'destructive' : 'sky') as any,
      sub: 'Scale of 0 to 100',
      iconColor: 'bg-blue-50 dark:bg-zinc-900/90 text-blue-600 dark:text-sky-300 border-blue-200/80 dark:border-sky-500/40 shadow-xs dark:shadow-black/60',
    },
    {
      label: t('highRiskVillages'),
      value: activeStats.high_risk_villages,
      icon: MapPin,
      badge: `${activeStats.high_risk_villages}/${activeStats.total_villages}`,
      badgeVariant: 'secondary' as const,
      sub: 'Priority safety zones',
      iconColor: 'bg-violet-50 dark:bg-zinc-900/90 text-violet-600 dark:text-purple-300 border-violet-200/80 dark:border-purple-500/40 shadow-xs dark:shadow-black/60',
    },
  ], [activeStats]);

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch { return ts; }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border border-slate-200/90 dark:border-white/15 rounded-xl px-3 py-2 shadow-xl shadow-black/40 max-w-[200px]">
          <p className="text-[10px] font-medium text-slate-400 mb-1">{formatTime(label)}</p>
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color || p.stroke || p.fill }} />
              <span className="text-xs font-semibold text-slate-800 dark:text-white truncate">
                {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value} {p.unit || 'mm'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const RadarCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0];
      const stateObj = activeStateData.find(s => s.state.includes(d.payload.state) || d.payload.state.includes(s.state));
      return (
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 dark:border-white/10 rounded-xl px-3 py-2 shadow-lg shadow-slate-900/5">
          <p className="text-xs font-bold text-slate-900">{d.payload.state}</p>
          <div className="flex items-center gap-2 mt-1 text-xs">
            <span className="text-slate-500 font-medium">Risk Score:</span>
            <span className="font-bold text-sky-700">{d.value}</span>
          </div>
          {stateObj && (
            <p className="text-[10px] text-slate-400 mt-0.5">
              {stateObj.stations} stations • {stateObj.critical_count} critical
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const RiskDonutTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0];
      return (
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 dark:border-white/10 rounded-xl px-3 py-2 shadow-lg shadow-slate-900/5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.payload.color }} />
            <span className="text-xs font-bold text-slate-900">{d.name}</span>
          </div>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            <strong>{d.value}</strong> assessments ({d.payload.pct}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const handleAcknowledge = async (id: number) => {
    try {
      await acknowledgeAlert(id);
      setAlertsData(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      console.error('Acknowledge failed:', e);
    }
  };

  const handleResolve = async (id: number) => {
    try {
      await resolveAlert(id);
      setAlertsData(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      console.error('Resolve failed:', e);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 max-w-sm rounded-3xl bg-white border border-slate-200/90 dark:border-white/10 shadow-xl shadow-sky-950/5">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-sky-100" />
            <div className="absolute inset-0 rounded-full border-4 border-sky-600 border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Shield className="w-6 h-6 text-sky-600 animate-pulse" />
            </div>
          </div>
          <h3 className="text-base font-bold text-slate-800">{t('initializing')}</h3>
          <p className="text-xs text-slate-500 mt-1">{t('connectingSensorsShort')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto animate-fade-in min-w-0">
      {/* Top Banner & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-white border border-slate-200/90 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-card">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 tracking-tight truncate">
              {t('dashboard')}
            </h1>
            <Badge variant="sky" size="md">
              NER Live Grid
            </Badge>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1 truncate">
            Real-time geospatial landslide forecasting & multi-hazard AI telemetry
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
            <TabsList className="overflow-x-auto max-w-full">
              <TabsTrigger value="overview">
                Overview
              </TabsTrigger>
              <TabsTrigger value="stations">
                Stations ({stations.length})
              </TabsTrigger>
              <TabsTrigger value="alerts">
                Alerts ({alertsData.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="text-slate-600 hover:text-sky-600 shrink-0"
            title="Refresh dashboard telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-sky-600' : ''}`} />
            <span className="hidden md:inline ml-1.5">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid - Adaptive 2 -> 3 -> 6 cols */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3.5 lg:gap-4">
        {statCards.map((card, i) => (
          <Card key={i} className="p-3.5 sm:p-4 lg:p-5 flex flex-col justify-between group overflow-hidden">
            <div>
              <div className="flex items-start justify-between gap-1.5 mb-2.5">
                <div className={`w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs shrink-0 ${card.iconColor}`}>
                  <card.icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <Badge variant={card.badgeVariant} size="sm" className="text-[10px] px-1.5 py-0.2 shrink-0">
                  {card.badge}
                </Badge>
              </div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
                {card.value}
              </div>
              <div className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mt-1 truncate">
                {card.label}
              </div>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 dark:text-zinc-500 font-medium mt-2 pt-2 border-t border-slate-100 dark:border-white/10 truncate">
              {card.sub}
            </div>
          </Card>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Main Charts Row: Rainfall & Redesigned Risk Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 min-w-0">
            {/* Interactive Rainfall Graph */}
            <Card className="lg:col-span-2 min-w-0">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-zinc-900/90 border border-sky-200/80 dark:border-white/20 flex items-center justify-center text-sky-600 dark:text-white shrink-0 shadow-xs dark:shadow-black/60">
                    <Droplets className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm sm:text-base truncate">
                        {t('rainfallTrend')}
                      </CardTitle>
                      <Badge variant="sky" size="sm" className="hidden sm:inline-flex">
                        Live
                      </Badge>
                    </div>
                    <CardDescription className="truncate">
                      Precipitation telemetry across 20 sensor stations
                    </CardDescription>
                  </div>
                </div>

                {/* Graph Controls & Switchers */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Summary Metric Chips */}
                  <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/10 text-[11px] font-medium text-slate-600 dark:text-zinc-300">
                    <span>Peak: <strong className="text-sky-700">{rainfallMetrics.max}mm</strong></span>
                    <span className="text-slate-300">•</span>
                    <span>Avg: <strong className="text-slate-800">{rainfallMetrics.avg}mm</strong></span>
                  </div>

                  {/* 24h vs 48h Filter */}
                  <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/10 text-xs">
                    <button
                      onClick={() => setRainfallTimeframe(24)}
                      className={`px-2 py-1 rounded-md font-semibold text-[11px] transition-all select-none ${
                        rainfallTimeframe === 24
                          ? 'bg-white dark:bg-white text-sky-700 dark:text-black font-semibold shadow-xs'
                          : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      24h
                    </button>
                    <button
                      onClick={() => setRainfallTimeframe(48)}
                      className={`px-2 py-1 rounded-md font-semibold text-[11px] transition-all select-none ${
                        rainfallTimeframe === 48
                          ? 'bg-white dark:bg-white text-sky-700 dark:text-black font-semibold shadow-xs'
                          : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      48h
                    </button>
                  </div>

                  {/* Line vs Bar Graph Type Switcher */}
                  <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-zinc-900/90 border border-slate-200/80 dark:border-white/10 text-xs">
                    <button
                      onClick={() => setRainfallChartType('area')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all select-none ${
                        rainfallChartType === 'area'
                          ? 'bg-white dark:bg-white text-sky-700 dark:text-black font-semibold shadow-xs'
                          : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white'
                      }`}
                      title="Switch to Smooth Area/Line Chart"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Line</span>
                    </button>
                    <button
                      onClick={() => setRainfallChartType('bar')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all select-none ${
                        rainfallChartType === 'bar'
                          ? 'bg-white dark:bg-white text-sky-700 dark:text-black font-semibold shadow-xs'
                          : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white'
                      }`}
                      title="Switch to Column/Bar Chart"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Bar</span>
                    </button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-3 px-2 sm:px-6">
                <div className="w-full h-[210px] sm:h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {rainfallChartType === 'area' ? (
                      <AreaChart data={displayRainfall} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="skyRainfallGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#0284c7" stopOpacity={0.01} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                          dataKey="timestamp"
                          tick={{ fontSize: 9, fill: '#94a3b8' }}
                          tickFormatter={formatTime}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 9, fill: '#94a3b8' }}
                          axisLine={false}
                          tickLine={false}
                          unit="mm"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="avg_rainfall"
                          stroke="#0284c7"
                          fill="url(#skyRainfallGrad)"
                          strokeWidth={2.5}
                          name="Precipitation"
                          unit="mm"
                          dot={false}
                          activeDot={{ r: 5, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 2 }}
                        />
                      </AreaChart>
                    ) : (
                      <BarChart data={displayRainfall} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="skyBarGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0284c7" />
                            <stop offset="100%" stopColor="#38bdf8" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                          dataKey="timestamp"
                          tick={{ fontSize: 9, fill: '#94a3b8' }}
                          tickFormatter={formatTime}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 9, fill: '#94a3b8' }}
                          axisLine={false}
                          tickLine={false}
                          unit="mm"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                          dataKey="avg_rainfall"
                          fill="url(#skyBarGrad)"
                          radius={[4, 4, 0, 0]}
                          name="Precipitation"
                          unit="mm"
                        />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* ==================== REDESIGNED MINIMALIST RISK DISTRIBUTION CARD ==================== */}
            <Card className="min-w-0 flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-50 to-blue-50 dark:from-zinc-900 dark:to-zinc-950 border border-sky-200/80 dark:border-white/20 flex items-center justify-center text-sky-700 dark:text-white shrink-0 shadow-xs dark:shadow-black/60">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm sm:text-base truncate">
                        {t('riskDistribution')}
                      </CardTitle>
                      <CardDescription className="truncate">
                        AI regional telemetry index
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" size="sm" className="text-[10px] font-semibold text-slate-500 shrink-0">
                    Live
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-1 pb-4 flex flex-col justify-between flex-1">
                {/* Donut Chart with Centered Metric Callout */}
                <div className="relative w-full h-[140px] flex items-center justify-center my-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={riskPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={46}
                        outerRadius={64}
                        paddingAngle={3}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={800}
                      >
                        {riskPieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip content={<RiskDonutTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Center Overlay Label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Total
                    </span>
                    <span className="text-base font-bold text-slate-900 leading-tight">
                      {totalAssessments}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-500">
                      Assessments
                    </span>
                  </div>
                </div>

                {/* Minimalist 4-Pill Status Grid */}
                <div className="grid grid-cols-2 gap-1.5 w-full pt-2 border-t border-slate-100">
                  {riskPieData.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-1.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition-all min-w-0"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-[11px] font-semibold text-slate-700 truncate">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        <span className="text-xs font-bold text-slate-900">{d.value}</span>
                        <span className="text-[10px] text-slate-400">({d.pct}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Analytics Row: Risk Trend, Road Status, State Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 min-w-0">
            {/* Interactive 48h Risk Trend Chart (Line / Bar Toggle) */}
            <Card className="min-w-0 flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-50 to-pink-50 dark:from-zinc-900 dark:to-zinc-950 border border-rose-200/80 dark:border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 shadow-xs dark:shadow-black/60">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm sm:text-base truncate">
                        {t('riskTrend')}
                      </CardTitle>
                      <CardDescription className="truncate">
                        48h regional landslide index
                      </CardDescription>
                    </div>
                  </div>

                  {/* Line vs Bar Switcher */}
                  <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200/80 text-[10px] shrink-0">
                    <button
                      onClick={() => setRiskChartType('line')}
                      className={`flex items-center gap-1 px-2 py-1 rounded font-semibold transition-all select-none ${
                        riskChartType === 'line'
                          ? 'bg-white text-rose-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      title="Line Chart"
                    >
                      <Activity className="w-3 h-3" />
                      <span>Line</span>
                    </button>
                    <button
                      onClick={() => setRiskChartType('bar')}
                      className={`flex items-center gap-1 px-2 py-1 rounded font-semibold transition-all select-none ${
                        riskChartType === 'bar'
                          ? 'bg-white text-rose-600 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      title="Bar Chart"
                    >
                      <BarChart3 className="w-3 h-3" />
                      <span>Bar</span>
                    </button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-1 pb-4 flex flex-col justify-between flex-1">
                {/* Metric Summary Badges */}
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] mb-2 font-medium">
                  <span className="text-slate-500 truncate">
                    Current: <strong className="text-slate-900 font-bold">{currentRiskScore}</strong>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 truncate">
                    Peak: <strong className="text-rose-600 font-bold">{peakRiskScore}</strong>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 truncate">
                    Avg: <strong className="text-slate-700 font-bold">{avgRiskScore}</strong>
                  </span>
                </div>

                {/* Chart Area */}
                <div className="w-full h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {riskChartType === 'line' ? (
                      <AreaChart data={recentRisk} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="roseAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                          dataKey="timestamp"
                          tick={{ fontSize: 9, fill: '#94a3b8' }}
                          tickFormatter={formatTime}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 9, fill: '#94a3b8' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="avg_risk"
                          stroke="#f43f5e"
                          strokeWidth={2}
                          fill="url(#roseAreaGrad)"
                          name={t('riskScore') || 'Risk'}
                          unit=""
                          dot={false}
                          activeDot={{ r: 4, fill: '#f43f5e', stroke: '#ffffff', strokeWidth: 2 }}
                        />
                      </AreaChart>
                    ) : (
                      <BarChart data={recentRisk} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                          dataKey="timestamp"
                          tick={{ fontSize: 9, fill: '#94a3b8' }}
                          tickFormatter={formatTime}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 9, fill: '#94a3b8' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                          dataKey="avg_risk"
                          fill="#f43f5e"
                          radius={[3, 3, 0, 0]}
                          name={t('riskScore') || 'Risk'}
                          unit=""
                        />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Road Transit Status */}
            <Card className="min-w-0 flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-50 to-orange-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shrink-0 shadow-xs">
                      <Car className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm sm:text-base truncate">
                        {t('roadStatus')}
                      </CardTitle>
                      <CardDescription className="truncate">
                        Transit clearance across key corridors
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" size="sm" className="text-[10px] font-semibold text-slate-500 shrink-0">
                    {activeStats.road_status.open}/{roadMetrics.total} Open
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-1 pb-4 flex flex-col justify-between flex-1 space-y-2.5">
                {/* 3 Modern Status Rows */}
                <div className="space-y-2">
                  {[
                    { label: t('open'), count: activeStats.road_status.open, pct: roadMetrics.openPct, color: 'bg-emerald-500', text: 'text-emerald-700' },
                    { label: t('partiallyBlocked'), count: activeStats.road_status.partially_blocked, pct: roadMetrics.partialPct, color: 'bg-amber-500', text: 'text-amber-700' },
                    { label: t('blocked'), count: activeStats.road_status.blocked, pct: roadMetrics.blockedPct, color: 'bg-rose-500', text: 'text-rose-700' },
                  ].map((item, i) => (
                    <div key={i} className="p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition-all">
                      <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                        <span className="flex items-center gap-1.5 text-slate-700 truncate">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${item.color}`} />
                          <span className="truncate">{item.label}</span>
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0 ml-1">
                          <span className={`font-bold ${item.text}`}>{item.count} Roads</span>
                          <span className="text-[10px] text-slate-400 font-medium">({item.pct}%)</span>
                        </div>
                      </div>
                      <Progress value={item.pct} indicatorClassName={item.color} className="h-1.5" />
                    </div>
                  ))}
                </div>

                {/* Bottom Transit Banner */}
                <div className={`p-2 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                  activeStats.road_status.blocked > 0
                    ? 'bg-rose-50/80 border-rose-200/80 text-rose-800'
                    : 'bg-emerald-50/80 border-emerald-200/80 text-emerald-800'
                }`}>
                  <div className="flex items-center gap-1.5 truncate">
                    <Zap className={`w-3.5 h-3.5 shrink-0 ${activeStats.road_status.blocked > 0 ? 'text-rose-600' : 'text-emerald-600'}`} />
                    <span className="truncate">
                      {activeStats.road_status.blocked > 0
                        ? `${activeStats.road_status.blocked} critical routes obstructed`
                        : 'All major transit corridors cleared'}
                    </span>
                  </div>
                  <Badge variant={activeStats.road_status.blocked > 0 ? 'destructive' : 'success'} size="sm" className="text-[9px] px-1.5 py-0 shrink-0">
                    {activeStats.road_status.blocked > 0 ? 'Alert' : 'Clear'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* State Risk Summary */}
            <Card className="min-w-0 flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-50 to-sky-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
                      <Mountain className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm sm:text-base truncate">
                        {t('stateSummary')}
                      </CardTitle>
                      <CardDescription className="truncate">
                        8 North-Eastern states breakdown
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" size="sm" className="text-[10px] font-semibold text-slate-500 shrink-0">
                    {stateData.length} States
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-1 pb-4 flex flex-col justify-between flex-1">
                {/* States List */}
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {stateData.map((state, i) => {
                    const isCritical = state.avg_risk_score >= 50 || state.critical_count > 0;
                    const isModerate = state.avg_risk_score >= 25 && state.avg_risk_score < 50;
                    const statusColor = isCritical ? 'bg-rose-500' : isModerate ? 'bg-amber-500' : 'bg-emerald-500';
                    const textColor = isCritical ? 'text-rose-600' : isModerate ? 'text-amber-600' : 'text-emerald-600';
                    
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-sky-50/60 hover:border-sky-200/80 transition-all min-w-0"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${statusColor}`} />
                          <div className="truncate">
                            <p className="text-xs font-semibold text-slate-800 truncate">{state.state}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{state.stations} stations</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-1">
                          <div className="text-right">
                            <span className={`text-xs font-bold ${textColor}`}>
                              {state.avg_risk_score}
                            </span>
                            <span className="text-[10px] text-slate-400 block -mt-0.5">Score</span>
                          </div>
                          {state.critical_count > 0 && (
                            <Badge variant="destructive" size="sm" className="text-[9px] px-1.5 py-0 font-bold shrink-0">
                              {state.critical_count} CRIT
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* State Summary Footer Pill */}
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Coverage: 100% telemetry</span>
                  <span className="text-sky-700 font-semibold">{activeStats.total_stations} total stations</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row: State Radar vs Top At-Risk Stations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 min-w-0">
            {/* State Risk Radar */}
            <Card className="min-w-0 flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-50 to-indigo-50 border border-purple-200/80 flex items-center justify-center text-purple-600 shrink-0 shadow-xs">
                      <Target className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm sm:text-base truncate">
                        {t('stateRiskRadar')}
                      </CardTitle>
                      <CardDescription className="truncate">
                        Comparative vulnerability index across 8 states
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" size="sm" className="text-[10px] font-semibold text-slate-500 shrink-0">
                    Multivariate Index
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-1 pb-4 flex flex-col justify-between flex-1">
                {/* Metric Summary Strip */}
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] mb-1 font-medium">
                  <span className="text-slate-500 truncate">
                    Peak State: <strong className="text-rose-600 font-bold">{topRadarState?.state || 'N/A'} ({topRadarState?.avg_risk_score || 0})</strong>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 truncate">
                    Lowest: <strong className="text-emerald-600 font-bold">{lowestRadarState?.state || 'N/A'} ({lowestRadarState?.avg_risk_score || 0})</strong>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 truncate">
                    Mean: <strong className="text-slate-800 font-bold">{avgRadarRisk}</strong>
                  </span>
                </div>

                {/* Radar Chart Container */}
                <div className="w-full h-[210px] sm:h-[230px] my-1 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                      <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                      <PolarAngleAxis
                        dataKey="state"
                        tick={{ fontSize: 10, fill: '#334155', fontWeight: 600 }}
                      />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={{ fontSize: 8, fill: '#94a3b8' }}
                        axisLine={false}
                      />
                      <Radar
                        name="Risk Index"
                        dataKey="risk"
                        stroke="#0284c7"
                        fill="#0ea5e9"
                        fillOpacity={0.3}
                        strokeWidth={2}
                        dot={{ r: 3.5, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 1.5 }}
                      />
                      <Tooltip content={<RadarCustomTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Bottom Top States Quick Pill Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2 border-t border-slate-100">
                  {stateData.slice(0, 4).map((s, idx) => (
                    <div key={idx} className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-slate-700 truncate">{s.state.split(' ')[0]}</span>
                      <span className={`font-bold ml-1 ${s.avg_risk_score >= 50 ? 'text-rose-600' : s.avg_risk_score >= 25 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {s.avg_risk_score}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Highest Risk Stations */}
            <Card className="min-w-0 flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-50 to-pink-50 dark:from-zinc-900 dark:to-zinc-950 border border-rose-200/80 dark:border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 shadow-xs dark:shadow-black/60">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm sm:text-base truncate">
                        {t('topRiskStations')}
                      </CardTitle>
                      <CardDescription className="truncate">
                        Locations requiring proactive early intervention
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="destructive" size="sm" className="text-[10px] font-bold shrink-0">
                    Top 5 Priority
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-1 pb-4 flex flex-col justify-between flex-1">
                <div className="space-y-2">
                  {topStations.map((station, i) => {
                    const risk = station.risk;
                    const riskLevel = risk?.level || 'low';
                    const riskScore = risk?.score || 0;
                    
                    const rankStyle =
                      i === 0
                        ? 'bg-rose-50 text-rose-700 border-rose-200/80 font-bold'
                        : i === 1
                        ? 'bg-amber-50 text-amber-700 border-amber-200/80 font-bold'
                        : 'bg-slate-100 text-slate-700 border-slate-200 font-semibold';

                    const scoreColor =
                      riskLevel === 'critical'
                        ? 'text-rose-600'
                        : riskLevel === 'high'
                        ? 'text-orange-600'
                        : riskLevel === 'moderate'
                        ? 'text-amber-600'
                        : 'text-emerald-600';

                    const progressColor =
                      riskLevel === 'critical'
                        ? 'bg-rose-500'
                        : riskLevel === 'high'
                        ? 'bg-orange-500'
                        : riskLevel === 'moderate'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500';

                    return (
                      <div
                        key={i}
                        onClick={() => (window.location.href = `#/station/${station.station_id}`)}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 hover:border-sky-300 hover:bg-sky-50/50 hover:shadow-xs transition-all cursor-pointer group gap-2.5 min-w-0"
                      >
                        {/* Rank Badge */}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 border ${rankStyle}`}>
                          #{i + 1}
                        </div>

                        {/* Station Name & Subtitle */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-sky-700 transition-colors truncate">
                              {station.name}
                            </p>
                            {riskLevel === 'critical' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] text-slate-400 font-medium truncate">
                              {station.state} • {station.district}
                            </p>
                            <div className="hidden sm:block w-20 h-1 rounded-full bg-slate-200/80 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${progressColor}`}
                                style={{ width: `${Math.min(100, riskScore)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Risk Metric & Badge */}
                        <div className="flex items-center gap-2 shrink-0 ml-1">
                          <div className="text-right">
                            <span className={`text-xs sm:text-sm font-bold ${scoreColor}`}>
                              {riskScore}
                            </span>
                            <Badge
                              variant={
                                riskLevel === 'critical'
                                  ? 'destructive'
                                  : riskLevel === 'high'
                                  ? 'warning'
                                  : riskLevel === 'moderate'
                                  ? 'warning'
                                  : 'success'
                              }
                              size="sm"
                              className="text-[9px] uppercase px-1.5 py-0 block mt-0.5"
                            >
                              {riskLevel}
                            </Badge>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Station Quick Action */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span className="text-[11px]">Monitoring 20 automated NER stations</span>
                  <button
                    onClick={() => setActiveTab('stations')}
                    className="text-[11px] text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 hover:underline transition-colors"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Stations Tab View */}
      {activeTab === 'stations' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {stations.map((station) => {
            const risk = station.risk;
            const riskLevel = risk?.level || 'low';
            const riskScore = risk?.score || 0;
            return (
              <Card
                key={station.station_id}
                variant="interactive"
                onClick={() => window.location.href = `#/station/${station.station_id}`}
                className="p-4 sm:p-5 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors truncate">
                        {station.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium truncate">{station.state} • {station.district}</p>
                    </div>
                    <Badge
                      variant={
                        riskLevel === 'critical' ? 'destructive' :
                        riskLevel === 'high' ? 'warning' :
                        riskLevel === 'moderate' ? 'warning' : 'success'
                      }
                      size="sm"
                      className="shrink-0"
                    >
                      {riskLevel.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Telemetry Chips */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <Droplets className="w-3.5 h-3.5 text-sky-500 mx-auto mb-1" />
                      <p className="text-xs font-bold text-slate-800 truncate">{station.latest_reading?.rainfall_mm || 0}</p>
                      <p className="text-[10px] text-slate-400 truncate">mm rain</p>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <Mountain className="w-3.5 h-3.5 text-indigo-500 mx-auto mb-1" />
                      <p className="text-xs font-bold text-slate-800 truncate">{station.elevation}</p>
                      <p className="text-[10px] text-slate-400 truncate">elev. (m)</p>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-500 mx-auto mb-1" />
                      <p className="text-xs font-bold text-slate-800 truncate">{station.slope_angle}°</p>
                      <p className="text-[10px] text-slate-400 truncate">slope</p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-slate-500">{t('riskScoreLabel')}</span>
                    <span className="font-bold text-slate-800">{riskScore}/100</span>
                  </div>
                  <Progress
                    value={riskScore}
                    indicatorClassName={
                      riskLevel === 'critical' ? 'bg-rose-500' :
                      riskLevel === 'high' ? 'bg-orange-500' :
                      riskLevel === 'moderate' ? 'bg-amber-500' : 'bg-emerald-500'
                    }
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Alerts Tab View */}
      {activeTab === 'alerts' && (
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">{t('activeAlertsWarnings')}</h3>
                <p className="text-xs text-slate-500 truncate">Early warning telemetry stream</p>
              </div>
            </div>
            <Badge variant="destructive" size="md" className="shrink-0">
              {alertsData.length} Active
            </Badge>
          </div>

          {alertsData.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-slate-800 font-semibold text-sm">No Active Landslide Alerts</p>
              <p className="text-slate-400 text-xs mt-0.5">All monitored stations are reporting normal conditions.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              {alertsData.map((alert) => {
                const timeAgo = getTimeAgo(alert.created_at);
                return (
                  <Card
                    key={alert.id}
                    className={`p-4 border transition-all ${
                      alert.risk_level === 'critical' ? 'bg-rose-50/40 border-rose-200' :
                      alert.risk_level === 'high' ? 'bg-orange-50/40 border-orange-200' :
                      'bg-amber-50/40 border-amber-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{alert.title}</p>
                        <p className="text-xs text-slate-500 mt-1 font-medium truncate">
                          {t('stationLabel')}: <span className="font-mono text-slate-700">{alert.station_id}</span> • {timeAgo}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5 truncate">
                          👥 {alert.affected_population.toLocaleString()} {t('peopleAffected')}
                        </p>
                      </div>
                      <Badge
                        variant={alert.risk_level === 'critical' ? 'destructive' : 'warning'}
                        size="sm"
                        className="font-bold uppercase shrink-0"
                      >
                        {alert.risk_level}
                      </Badge>
                    </div>

                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-200/60">
                      {user && ['admin', 'field_officer', 'district_admin'].includes(user.role) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAcknowledge(alert.id)}
                          className="text-xs text-amber-800 border-amber-300 hover:bg-amber-50 flex-1 sm:flex-initial"
                        >
                          {t('acknowledge')}
                        </Button>
                      )}
                      {user?.role === 'admin' && (
                        <Button
                          size="sm"
                          variant="sky"
                          onClick={() => handleResolve(alert.id)}
                          className="text-xs text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 flex-1 sm:flex-initial"
                        >
                          {t('resolve')}
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Minimal Footer Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 bg-white border border-slate-200/90 dark:border-white/10 rounded-2xl px-4 sm:px-5 py-3 gap-2 shadow-card">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 font-medium text-slate-600">
            <Radio className="w-3.5 h-3.5 text-sky-600" />
            {activeStats.active_stations} Sensors Online
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-600">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            {activeStats.total_villages} Villages Monitored
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          Last telemetry sync: {new Date(activeStats.last_updated).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

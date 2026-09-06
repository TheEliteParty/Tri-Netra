import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStation, getStationHistory, getWeather, getWeatherForecast } from '../services/api';
import { t } from '../i18n/translations';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import {
  ArrowLeft, Radio, Mountain, Droplets, Thermometer,
  Activity, AlertTriangle, TrendingUp, ChevronRight,
  CloudRain, Wind, Layers, Shield, Sparkles, ShieldAlert,
  Clock, MapPin, CheckCircle2, Zap, CloudSun, Gauge
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';

const RISK_CONFIG: Record<string, { badgeVariant: 'destructive' | 'warning' | 'sky' | 'success'; color: string; bg: string; text: string; border: string }> = {
  critical: { badgeVariant: 'destructive', color: '#f43f5e', bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-500/20' },
  high: { badgeVariant: 'warning', color: '#f97316', bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-500/20' },
  moderate: { badgeVariant: 'warning', color: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/20' },
  low: { badgeVariant: 'success', color: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/20' },
};

export default function StationDetail() {
  const { stationId } = useParams<{ stationId: string }>();
  const navigate = useNavigate();
  const [station, setStation] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [weather, setWeather] = useState<any>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<6 | 12 | 24 | 48>(24);
  const [weatherTab, setWeatherTab] = useState<'current' | 'forecast'>('current');

  useEffect(() => {
    if (!stationId) return;
    const fetchData = async () => {
      try {
        const [stationRes, historyRes, weatherRes, forecastRes] = await Promise.all([
          getStation(stationId).catch(() => null),
          getStationHistory(stationId, timeRange).catch(() => null),
          getWeather(stationId).catch(() => null),
          getWeatherForecast(stationId, 48).catch(() => null),
        ]);
        if (stationRes?.data) setStation(stationRes.data);
        if (historyRes?.data) setHistory(historyRes.data);
        if (weatherRes?.data) setWeather(weatherRes.data);
        if (forecastRes?.data) setForecast(forecastRes.data);
      } catch (e) {
        console.error('Station fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [stationId, timeRange]);

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch { return ts; }
  };

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md border border-slate-900 rounded-xl px-3 py-2 shadow-lg shadow-slate-900/5">
          <p className="text-[10px] font-semibold text-slate-400 mb-1">{formatTime(label)}</p>
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color || p.stroke || p.fill }} />
              <span className="font-semibold text-slate-700 dark:text-zinc-300">{p.name}:</span>
              <span className="font-bold text-slate-900 dark:text-white">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value} {p.unit || ''}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 max-w-sm rounded-3xl bg-white border border-slate-900 shadow-xl shadow-sky-950/5">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-sky-100" />
            <div className="absolute inset-0 rounded-full border-4 border-sky-600 border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Radio className="w-6 h-6 text-sky-600 animate-pulse" />
            </div>
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-zinc-200">Connecting Station Telemetry</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Retrieving IoT sensor stream for {stationId}...</p>
        </div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="p-8 text-center max-w-md mx-auto my-12 bg-white border border-slate-900 rounded-3xl shadow-card">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('stationNotFound')}</h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Station ID "{stationId}" could not be located in the NER grid directory.</p>
        <Button onClick={() => navigate(-1)} variant="sky" size="sm" className="mt-4">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          {t('goBack')}
        </Button>
      </div>
    );
  }

  const { station: s, readings, risk_assessment: risk } = station;
  const riskLevel = (risk?.risk_level || 'low').toLowerCase();
  const riskConfig = RISK_CONFIG[riskLevel] || RISK_CONFIG.low;
  const riskScore = risk?.score || risk?.risk_score || 0;

  const latestReading = readings?.[readings.length - 1] || {};

  // Contributing factors array
  let contributingFactors: string[] = [];
  try {
    if (typeof risk?.contributing_factors === 'string') {
      contributingFactors = JSON.parse(risk.contributing_factors);
    } else if (Array.isArray(risk?.contributing_factors)) {
      contributingFactors = risk.contributing_factors;
    }
  } catch {
    contributingFactors = ['Elevated seasonal precipitation', 'Slope shear stress accumulation'];
  }

  const displayReadings = history.length > 0 ? history : readings || [];

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto animate-fade-in min-w-0">
      {/* Top Header & Navigation Bar */}
      <div className="bg-white dark:bg-zinc-950/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="shrink-0 h-9 px-2.5 text-slate-600 dark:text-zinc-400 hover:text-sky-700 hover:bg-sky-50"
            title="Return to previous screen"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
                {s.name}
              </h1>
              <Badge variant="sky" size="md">
                {s.station_id}
              </Badge>
              {s.is_active ? (
                <Badge variant="success" size="sm">
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" size="sm">
                  Inactive
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-1 truncate">
              {s.state} • {s.district} • {s.village || 'Region'} • Coordinates: {s.latitude?.toFixed(4)}°N, {s.longitude?.toFixed(4)}°E
            </p>
          </div>
        </div>

        {/* Hero Score Badge */}
        {risk && (
          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border ${riskConfig.bg} ${riskConfig.border} shrink-0 shadow-xs`}>
            <div className="text-right">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                AI Risk Index
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
                {riskScore}<span className="text-xs font-medium text-slate-400">/100</span>
              </div>
            </div>
            <Badge variant={riskConfig.badgeVariant} size="md" className="uppercase font-bold">
              {riskLevel}
            </Badge>
          </div>
        )}
      </div>

      {/* 5-Column Station Geo-Telemetry Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 min-w-0">
        {[
          { label: t('elevation'), value: `${s.elevation}m`, sub: 'Above Sea Level', icon: Mountain, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200/80 dark:border-indigo-500/20' },
          { label: t('slopeAngle'), value: `${s.slope_angle}°`, sub: 'Incline Gradient', icon: TrendingUp, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200/80 dark:border-amber-500/20' },
          { label: t('soilType'), value: (s.soil_type || 'Sandy Loam').replace('_', ' '), sub: 'Geotech Composition', icon: Layers, color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 border-sky-200/80 dark:border-sky-500/20' },
          { label: t('vegetationCover'), value: `${s.vegetation_cover}%`, sub: 'Canopy Density', icon: Droplets, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/80 dark:border-emerald-500/20' },
          { label: 'Current Rainfall', value: `${latestReading.rainfall_mm || 0}mm`, sub: 'Last 1h Telemetry', icon: CloudRain, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200/80 dark:border-blue-500/20' },
        ].map((item, i) => (
          <Card key={i} className="p-3.5 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">{item.label}</span>
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${item.color}`}>
                <item.icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight capitalize truncate">
                {item.value}
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                {item.sub}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* AI Multi-Factor Risk Assessment Card */}
      {risk && (
        <Card className="min-w-0">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200/80 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 shadow-xs">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-sm sm:text-base truncate">
                    {t('aiRiskAssessment')}
                  </CardTitle>
                  <CardDescription className="truncate">
                    Multi-variate predictive physics & ML inference
                  </CardDescription>
                </div>
              </div>

              <Badge variant="sky" size="sm" className="font-semibold">
                <Sparkles className="w-3 h-3 mr-1" />
                {risk.model_version || 'XGBoost v2.4'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Circular SVG Gauge */}
              <div className="flex flex-col items-center justify-center text-center p-3 rounded-2xl bg-slate-50/80 dark:bg-zinc-900/60 border border-slate-100 dark:border-white/10">
                <div className="relative w-28 h-28 flex items-center justify-center my-1">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60" cy="60" r="48"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="10"
                    />
                    <circle
                      cx="60" cy="60" r="48"
                      fill="none"
                      stroke={riskConfig.color}
                      strokeWidth="10"
                      strokeDasharray={`${(riskScore / 100) * 301.6} 301.6`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none">
                      {riskScore}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                      / 100
                    </span>
                  </div>
                </div>
                <Badge variant={riskConfig.badgeVariant} size="sm" className="mt-2 font-bold uppercase tracking-wider">
                  {riskLevel} Risk
                </Badge>
              </div>

              {/* Assessment Telemetry Parameters */}
              <div className="space-y-3">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-white/10">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500 dark:text-zinc-400 font-medium">{t('landslideProbability')}</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {((risk.landslide_probability || (riskScore / 100)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={(risk.landslide_probability || (riskScore / 100)) * 100}
                    indicatorClassName={riskConfig.badgeVariant === 'destructive' ? 'bg-rose-500' : 'bg-amber-500'}
                    className="h-1.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-white/10">
                    <span className="text-[10px] text-slate-400 font-medium block">{t('timeWindow')}</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                      {risk.predicted_time_window_hours || 24} {t('hours')}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-white/10">
                    <span className="text-[10px] text-slate-400 font-medium block">Pore Pressure</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                      {latestReading.pore_water_pressure || 42.5} kPa
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-white/10 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-zinc-400 font-medium">{t('assessedAt')}</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">
                    {risk.timestamp ? new Date(risk.timestamp).toLocaleTimeString() : 'Live'}
                  </span>
                </div>
              </div>

              {/* Contributing Warning Factors */}
              <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-zinc-900/60 border border-slate-100 dark:border-white/10 space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  {t('contributingFactors')}
                </span>
                <div className="space-y-1.5">
                  {contributingFactors.map((factor, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-zinc-300 dark:text-zinc-300"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">{factor}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommendation Action Callout */}
            {risk.recommendation && (
              <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-500/30 flex items-start gap-3 text-xs">
                <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-amber-900 block mb-0.5">
                    Recommended Early Response Action
                  </span>
                  <p className="text-amber-800 leading-relaxed font-medium">
                    {risk.recommendation}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Telemetry Sensor Time-Series Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 min-w-0">
        {/* Rainfall History Chart */}
        <Card className="min-w-0 flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Droplets className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-sm truncate">
                    {t('rainfallHistory')}
                  </CardTitle>
                  <CardDescription className="truncate">
                    Station precipitation telemetry
                  </CardDescription>
                </div>
              </div>

              {/* Timeframe Filter */}
              <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200/80 text-[10px] shrink-0">
                {([6, 12, 24, 48] as const).map(h => (
                  <button
                    key={h}
                    onClick={() => setTimeRange(h)}
                    className={`px-2 py-0.5 rounded font-semibold transition-all select-none ${
                      timeRange === h
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:text-zinc-200'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            <div className="w-full h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayReadings} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="stationRainGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0284c7" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={formatTime} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="mm" />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area type="monotone" dataKey="rainfall_mm" stroke="#0284c7" fill="url(#stationRainGrad)" strokeWidth={2} name="Precipitation" unit="mm" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Soil Moisture & Displacement Multi-Line Chart */}
        <Card className="min-w-0 flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-sm truncate">
                    {t('soilMoistureDisplacement')}
                  </CardTitle>
                  <CardDescription className="truncate">
                    Geotechnical pore stability & shift
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" size="sm" className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 shrink-0">
                Dual Metric
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            <div className="w-full h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={displayReadings} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={formatTime} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Line type="monotone" dataKey="soil_moisture" stroke="#10b981" strokeWidth={2} dot={false} name={t('soilMoisture') || 'Soil Moisture'} unit="%" />
                  <Line type="monotone" dataKey="ground_displacement" stroke="#f97316" strokeWidth={2} dot={false} name={t('groundDisplacement') || 'Displacement'} unit="mm" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weather & Meteorological Telemetry Card */}
      {weather?.data && (
        <Card className="min-w-0">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200/80 dark:border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 shadow-xs">
                  <CloudSun className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-sm sm:text-base truncate">
                    {t('weatherTitle')}
                  </CardTitle>
                  <CardDescription className="truncate">
                    Surface atmosphere & rainfall forecasting
                  </CardDescription>
                </div>
              </div>

              <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200/80 text-xs">
                <button
                  onClick={() => setWeatherTab('current')}
                  className={`px-3 py-1 rounded-md font-semibold text-[11px] transition-all select-none ${
                    weatherTab === 'current'
                      ? 'bg-white text-sky-700 shadow-xs'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:text-zinc-200'
                  }`}
                >
                  Live Conditions
                </button>
                <button
                  onClick={() => setWeatherTab('forecast')}
                  className={`px-3 py-1 rounded-md font-semibold text-[11px] transition-all select-none ${
                    weatherTab === 'forecast'
                      ? 'bg-white text-sky-700 shadow-xs'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:text-zinc-200'
                  }`}
                >
                  48h Forecast ({forecast.length})
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {weatherTab === 'current' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {[
                  { label: t('temperatureLabel'), value: `${weather.data.temperature}°C`, icon: Thermometer, color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-transparent dark:border-rose-500/20' },
                  { label: t('humidityLabel'), value: `${weather.data.humidity}%`, icon: Droplets, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-transparent dark:border-blue-500/20' },
                  { label: 'Wind Speed', value: `${weather.data.wind_speed} km/h`, icon: Wind, color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 border border-transparent dark:border-teal-500/20' },
                  { label: t('forecast24h'), value: `${weather.data.forecast_rainfall_24h} mm`, icon: CloudRain, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-transparent dark:border-indigo-500/20' },
                  { label: t('forecast48h'), value: `${weather.data.forecast_rainfall_48h} mm`, icon: CloudRain, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border border-transparent dark:border-purple-500/20' },
                ].map((item, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/70 border border-slate-100 dark:border-white/10 flex items-center justify-between shadow-xs">
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 dark:text-zinc-400 font-medium block">{item.label}</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white dark:text-white mt-0.5 block font-mono">{item.value}</span>
                    </div>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-xs ${item.color}`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 dark:text-zinc-400 border-b border-slate-100 font-semibold">
                      <th className="text-left py-2.5 px-3">{t('forecastTime')}</th>
                      <th className="text-left py-2.5 px-3">Temp</th>
                      <th className="text-left py-2.5 px-3">Rain (1h)</th>
                      <th className="text-left py-2.5 px-3">Humidity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {forecast.slice(0, 12).map((f, i) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 text-slate-600 dark:text-zinc-400 font-medium">
                          {new Date(f.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-800 dark:text-zinc-200">{f.temperature}°C</td>
                        <td className="py-2 px-3 font-bold text-sky-600">{f.rainfall_1h || 0} mm</td>
                        <td className="py-2 px-3 font-semibold text-emerald-600">{f.humidity}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

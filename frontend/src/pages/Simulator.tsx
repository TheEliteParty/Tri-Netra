import { useState, useEffect, useMemo } from 'react';
import { simulateLandslide, simulateBatch, resetSimulation, SimulationResult, getStations, Station } from '../services/api';
import { useAuth } from '../App';
import { t } from '../i18n/translations';
import {
  Zap, AlertTriangle, Radio, Mountain, Droplets, Activity,
  ChevronRight, Shield, Play, RotateCcw, TrendingUp,
  Users, Clock, MapPin, RefreshCw, XCircle, Sparkles, CheckCircle2,
  Layers, Gauge, ArrowRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

interface ScenarioPreset {
  id: string;
  name: string;
  intensity: 'low' | 'moderate' | 'high' | 'critical';
  desc: string;
  rain: number;
  shift: number;
}

const SCENARIOS: ScenarioPreset[] = [
  { id: 'cloudburst', name: '🌧️ Monsoon Cloudburst', intensity: 'critical', desc: 'Sudden 260mm/24h extreme rainfall with rapid pore saturation', rain: 260, shift: 62 },
  { id: 'displacement_creep', name: '🌋 Simulated Ground Creep', intensity: 'high', desc: 'Injected 45mm shear-displacement scenario (not InSAR)', rain: 110, shift: 45 },
  { id: 'soil_saturation', name: '💧 Talus Pore Pressure Surge', intensity: 'moderate', desc: 'Sustained monsoon rain exceeding Caine threshold', rain: 75, shift: 18 },
  { id: 'baseline', name: '🟢 Routine Environmental Stress', intensity: 'low', desc: 'Mild intermittent showers with stable slope equilibrium', rain: 25, shift: 4 },
];

export default function Simulator() {
  const { user } = useAuth();
  const canRunSingle = !!user && ['field_officer', 'district_admin', 'admin'].includes(user.role);
  const canRunBatch = !!user && ['district_admin', 'admin'].includes(user.role);
  const canReset = user?.role === 'admin';
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState('');
  const [intensity, setIntensity] = useState<'low' | 'moderate' | 'high' | 'critical'>('high');
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [history, setHistory] = useState<SimulationResult[]>([]);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    getStations().then(res => {
      const data = Array.isArray(res.data) ? res.data : [];
      setStations(data);
      if (data.length > 0) {
        const topRisk = data.find((s: Station) => s.slope_angle > 38) || data[0];
        setSelectedStation(topRisk.station_id);
      }
    });
  }, []);

  const activeStationObj = useMemo(() => {
    return stations.find(s => s.station_id === selectedStation) || stations[0];
  }, [stations, selectedStation]);

  const handleSimulate = async () => {
    if (!canRunSingle) return;
    setLoading(true);
    setResult(null);
    setFeedback('');
    try {
      const res = await simulateLandslide({
        station_id: selectedStation || undefined,
        intensity,
      });
      setResult(res.data);
      setHistory(prev => [res.data, ...prev].slice(0, 8));
    } catch (e: any) {
      console.error('Simulation error:', e);
      setFeedback(e.response?.data?.detail || 'The simulation could not be run. Check the backend connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSimulate = async () => {
    if (!canRunBatch) return;
    setBatchLoading(true);
    setFeedback('');
    try {
      const res = await simulateBatch(5);
      const events = res.data?.events || [];
      const results = events.map(simulation => ({ status: 'success', simulation }));
      if (results.length > 0) {
        setResult(results[0]);
        setHistory(prev => [...results, ...prev].slice(0, 8));
      }
    } catch (e: any) {
      console.error('Batch simulation error:', e);
      setFeedback(e.response?.data?.detail || 'The batch simulation could not be run. Check the backend connection and try again.');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleReset = async () => {
    if (!canReset) return;
    if (!window.confirm('Reset all simulated sensor readings and return the demo database to its seeded baseline?')) return;
    setFeedback('');
    try {
      await resetSimulation();
      setHistory([]);
      setResult(null);
    } catch (e: any) {
      console.error('Reset error:', e);
      setFeedback(e.response?.data?.detail || 'The demo reset failed.');
    }
  };

  const applyScenario = (sc: ScenarioPreset) => {
    setIntensity(sc.intensity);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto animate-fade-in min-w-0">
      {/* ── Top Command Banner ────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-950/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-2xl p-5 shadow-card">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {t('landslideSimulator')}
                </h1>
                <Badge variant="warning" size="md" className="font-bold">
                  AI Stress Lab
                </Badge>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-zinc-900/90 border border-sky-200/80 dark:border-white/10 text-sky-700 dark:text-sky-300 text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                  <span>Deterministic demo injection ready</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
                Inject predefined weather and sensor values to exercise the prototype alert workflow
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={!canReset}
            className="text-xs h-9 px-3.5 gap-1.5 font-bold"
            title="Reset simulation data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Grid</span>
          </Button>
        </div>
      </div>

      {/* ── Scenario Quick Presets ───────────────────────────── */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-950/80 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-card">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Quick Disaster Scenarios (1-Click Presets)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              onClick={() => applyScenario(sc)}
              className={`text-left p-2.5 rounded-xl border transition-all flex flex-col justify-between ${
                intensity === sc.intensity
                  ? 'bg-slate-50 dark:bg-zinc-900 border-sky-500 dark:border-white/30 shadow-sm ring-1 ring-sky-500/20'
                  : 'bg-white dark:bg-zinc-950/60 border-slate-200/70 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{sc.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 line-clamp-2 mt-0.5">{sc.desc}</p>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-600 dark:text-zinc-300 font-semibold">
                <span>Rain: {sc.rain}mm</span>
                <span>Shift: +{sc.shift}mm</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Dual Panel: Configuration vs Real-Time Output ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN: Simulation Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Target Station Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-card space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-sky-600 dark:text-white" />
                <span>Target Monitoring Node</span>
              </h3>
              <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                {selectedStation || 'Auto'}
              </Badge>
            </div>

            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/90 dark:border-white/15 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-sky-500 dark:focus:border-white transition-all cursor-pointer"
            >
              {stations.map(s => (
                <option key={s.station_id} value={s.station_id} className="dark:bg-zinc-950">
                  {s.name} ({s.state}) • Slope: {s.slope_angle}° • {s.station_id}
                </option>
              ))}
            </select>

            {/* Selected Station Telemetry Preview */}
            {activeStationObj && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/70 border border-slate-200/80 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">{activeStationObj.name}</span>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500">{activeStationObj.district}, {activeStationObj.state}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] pt-1">
                  <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-slate-200/60 dark:border-white/10">
                    <span className="text-[9px] text-slate-400 dark:text-zinc-500 block">Slope</span>
                    <strong className="text-slate-900 dark:text-white">{activeStationObj.slope_angle}°</strong>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-slate-200/60 dark:border-white/10">
                    <span className="text-[9px] text-slate-400 dark:text-zinc-500 block">Elevation</span>
                    <strong className="text-slate-900 dark:text-white">{activeStationObj.elevation}m</strong>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-slate-200/60 dark:border-white/10">
                    <span className="text-[9px] text-slate-400 dark:text-zinc-500 block">Current Rain</span>
                    <strong className="text-sky-600 dark:text-sky-400">{activeStationObj.latest_reading?.rainfall_mm ?? 0}mm</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Event Intensity Selection */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-card space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-orange-500" />
              <span>Event Stress Intensity</span>
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  key: 'low',
                  label: 'Low Stress',
                  sub: 'Rain: 20-40mm • Shift: <5mm',
                  color: 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
                },
                {
                  key: 'moderate',
                  label: 'Moderate Surge',
                  sub: 'Rain: 60-90mm • Shift: 10-25mm',
                  color: 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/30'
                },
                {
                  key: 'high',
                  label: 'High Threat',
                  sub: 'Rain: 120-180mm • Shift: 30-55mm',
                  color: 'border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/30'
                },
                {
                  key: 'critical',
                  label: 'Critical Failure',
                  sub: 'Rain: 220-300mm • Shift: >60mm',
                  color: 'border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/30'
                },
              ].map((item) => {
                const isSelected = intensity === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setIntensity(item.key as any)}
                    className={`p-3 rounded-xl border text-left transition-all select-none ${
                      isSelected
                        ? item.color + ' border-2 shadow-sm'
                        : 'bg-slate-50 dark:bg-zinc-900/60 border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{item.label}</p>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-current" />}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">{item.sub}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-card space-y-2.5">
            <Button
              onClick={handleSimulate}
              disabled={loading || batchLoading || !canRunSingle}
              className="w-full h-12 bg-gradient-to-r from-rose-600 via-orange-600 to-amber-500 hover:opacity-95 text-white font-black text-sm rounded-xl shadow-lg shadow-rose-600/25 gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  <span>Trigger Demo Stress Simulation</span>
                </>
              )}
            </Button>

            <Button
              onClick={handleBatchSimulate}
              disabled={loading || batchLoading || !canRunBatch}
              variant="outline"
              className="w-full h-10 border-slate-200/90 dark:border-white/15 text-xs font-bold rounded-xl gap-2"
            >
              {batchLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 text-sky-500" />
                  <span>Run 5-Station Multi-Hazard Batch Test</span>
                </>
              )}
            </Button>
            <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-relaxed">
              Single-station runs require Field Officer or above; batch runs require District Admin or Admin; reset requires Admin. Controls remain disabled when your role is not authorized.
            </p>
            {feedback && (
              <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-300">
                {feedback}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Real-Time Simulation Result & Impact Matrix (7 cols) */}
        <div className="lg:col-span-7">
          {result ? (
            <div className="space-y-4 animate-scale-in">
              {/* Primary Blast Impact Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950/90 backdrop-blur-xl border border-slate-200/90 dark:border-white/15 shadow-xl space-y-4">
                
                {/* Result Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold shadow-md shadow-rose-500/20 shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                          Simulation Impact: {result.simulation.station.name}
                        </h3>
                        <Badge variant={result.simulation.ai_assessment.risk_level === 'critical' ? 'destructive' : 'warning'} className="font-extrabold text-[10px] uppercase">
                          {result.simulation.ai_assessment.risk_level}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        Triggered at {new Date().toLocaleTimeString()} • Mode: {result.simulation.intensity.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                      {result.simulation.ai_assessment.risk_score}
                    </span>
                    <span className="text-xs text-slate-400 block -mt-1 font-bold">/ 100 Score</span>
                  </div>
                </div>

                {/* 4 Injected Sensor Telemetry Spikes */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">
                    Injected Telemetry Spikes
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-200/70 dark:border-white/10">
                      <Droplets className="w-4 h-4 text-sky-500 mx-auto mb-1" />
                      <div className="text-base font-black text-slate-900 dark:text-white">{result.simulation.sensor_spikes.rainfall_mm} mm</div>
                      <div className="text-[10px] text-slate-400 font-medium">Rainfall 24h</div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-200/70 dark:border-white/10">
                      <Activity className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                      <div className="text-base font-black text-slate-900 dark:text-white">{result.simulation.sensor_spikes.soil_moisture}%</div>
                      <div className="text-[10px] text-slate-400 font-medium">Soil Saturation</div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-200/70 dark:border-white/10">
                      <Mountain className="w-4 h-4 text-orange-500 mx-auto mb-1" />
                      <div className="text-base font-black text-slate-900 dark:text-white">+{result.simulation.sensor_spikes.ground_displacement_mm} mm</div>
                      <div className="text-[10px] text-slate-400 font-medium">Simulated displacement</div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-200/70 dark:border-white/10">
                      <TrendingUp className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                      <div className="text-base font-black text-slate-900 dark:text-white">{result.simulation.sensor_spikes.pore_water_pressure_kpa} kPa</div>
                      <div className="text-[10px] text-slate-400 font-medium">Pore Pressure</div>
                    </div>
                  </div>
                </div>

                {/* Generated Emergency Alert Notification Banner */}
                {result.simulation.alert_generated && (
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/90 dark:border-rose-500/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-rose-600 animate-pulse" />
                        <span>Prototype EWS record created: {result.simulation.alert_generated.title}</span>
                      </span>
                      <Badge variant="destructive" size="sm" className="font-mono text-[10px]">
                        Database alert only
                      </Badge>
                    </div>
                    <p className="text-xs text-rose-900 dark:text-rose-200 font-medium">{result.simulation.alert_generated.message}</p>
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-rose-700 dark:text-rose-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        <span>{result.simulation.alert_generated.affected_population.toLocaleString()} people in the seeded impact estimate</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Geotechnical Factors & AI Recommendation */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/10">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Geotechnical Failure Contributing Factors
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {[
                      `Slope: ${result.simulation.station.slope_angle}°`,
                      `Injected rainfall: ${result.simulation.sensor_spikes.rainfall_mm} mm`,
                      `Injected soil moisture: ${result.simulation.sensor_spikes.soil_moisture}%`,
                      `Heuristic mask coverage: ${result.simulation.ai_assessment.coverage_percent}%`,
                    ].map((factor, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/60 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span className="truncate">{factor}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/60 dark:border-white/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block mb-1">
                      SOP Emergency Action Recommendation
                    </span>
                    <p className="text-xs text-slate-800 dark:text-white font-medium leading-relaxed">
                      {result.simulation.ai_assessment.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Standby State */
            <div className="p-8 sm:p-12 rounded-2xl bg-white dark:bg-zinc-950/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-card text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 flex items-center justify-center mx-auto text-amber-500 shadow-sm">
                <Gauge className="w-8 h-8 animate-pulse" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Simulation Standby • Awaiting Stress Trigger
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  Select a station and an intensity preset to exercise a deterministic demo workflow. The mask, sensor spikes and alert record are simulated; no satellite model or public broadcast is run.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-lg mx-auto pt-4 text-left">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/60 dark:border-white/10">
                  <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 block uppercase">Step 1</span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-white">Inject Sensor Spike</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/60 dark:border-white/10">
                  <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 block uppercase">Step 2</span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-white">Bishop Limit Equilibrium</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/60 dark:border-white/10">
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block uppercase">Step 3</span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-white">Multi-Channel Broadcast</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Historical Simulation Log ─────────────────────────── */}
      {history.length > 0 && (
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
              <span>Recent Simulation Audit Trail ({history.length} runs)</span>
            </h3>
            <button
              onClick={() => setHistory([])}
              className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white font-medium flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Clear History
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-white/10 text-left">
                  <th className="py-2.5 font-bold">Target Station</th>
                  <th className="py-2.5 font-bold">Intensity</th>
                  <th className="py-2.5 font-bold">Risk Score</th>
                  <th className="py-2.5 font-bold">Risk Tier</th>
                  <th className="py-2.5 font-bold">Injected Rain</th>
                  <th className="py-2.5 font-bold">Affected Citizens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {history.map((h, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="py-2.5 font-bold text-slate-900 dark:text-white">{h.simulation.station.name}</td>
                    <td className="py-2.5 uppercase font-bold text-[10px] text-slate-600 dark:text-zinc-300">{h.simulation.intensity}</td>
                    <td className="py-2.5 font-mono font-bold text-slate-900 dark:text-white">{h.simulation.ai_assessment.risk_score}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                        h.simulation.ai_assessment.risk_level === 'critical' ? 'bg-rose-500 text-white' :
                        h.simulation.ai_assessment.risk_level === 'high' ? 'bg-orange-500 text-white' :
                        h.simulation.ai_assessment.risk_level === 'moderate' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                      }`}>
                        {h.simulation.ai_assessment.risk_level}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-slate-600 dark:text-zinc-300">{h.simulation.sensor_spikes.rainfall_mm} mm</td>
                    <td className="py-2.5 font-medium text-slate-600 dark:text-zinc-300">
                      {h.simulation.alert_generated ? `${h.simulation.alert_generated.affected_population.toLocaleString()} people` : 'None (Sub-threshold)'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

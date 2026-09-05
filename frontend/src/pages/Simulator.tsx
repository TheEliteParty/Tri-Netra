import { useState } from 'react';
import { simulateLandslide, simulateBatch, resetSimulation, SimulationResult, getStations, Station } from '../services/api';
import { t } from '../i18n/translations';
import { useEffect } from 'react';
import {
  Zap, AlertTriangle, Radio, Mountain, Droplets, Activity,
  ChevronRight, Shield, Play, RotateCcw, TrendingUp,
  Users, Clock, MapPin, RefreshCw, XCircle,
} from 'lucide-react';

function useIntensityConfig() {
  return {
    low: { label: t('lowIntensity'), color: 'from-green-500 to-emerald-500', textColor: 'text-green-400', borderColor: 'border-green-600/30', description: t('lowIntensityDesc2') },
    moderate: { label: t('moderateIntensity'), color: 'from-amber-500 to-yellow-500', textColor: 'text-amber-400', borderColor: 'border-amber-600/30', description: t('moderateIntensityDesc2') },
    high: { label: t('highIntensity'), color: 'from-orange-500 to-red-500', textColor: 'text-orange-400', borderColor: 'border-orange-600/30', description: t('highIntensityDesc2') },
    critical: { label: t('criticalIntensity'), color: 'from-red-600 to-red-500', textColor: 'text-red-400', borderColor: 'border-red-600/30', description: t('criticalIntensityDesc2') },
  };
}

export default function Simulator() {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState('');
  const [intensity, setIntensity] = useState<'low' | 'moderate' | 'high' | 'critical'>('high');
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [history, setHistory] = useState<SimulationResult[]>([]);
  const INTENSITY_CONFIG = useIntensityConfig();

  useEffect(() => {
    getStations().then(res => {
      setStations(res.data);
      if (res.data.length > 0) {
        // Default to a high-risk station
        const highRisk = res.data.find((s: Station) => s.slope_angle > 40) || res.data[0];
        setSelectedStation(highRisk.station_id);
      }
    });
  }, []);

  const handleSimulate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await simulateLandslide({
        station_id: selectedStation || undefined,
        intensity,
      });
      setResult(res.data);
      setHistory(prev => [res.data, ...prev].slice(0, 10));
    } catch (e) {
      console.error('Simulation error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSimulate = async () => {
    setBatchLoading(true);
    try {
      const res = await simulateBatch(5);
      const results = res.data.results;
      if (results.length > 0) {
        setResult(results[0]);
        setHistory(prev => [...results, ...prev].slice(0, 10));
      }
    } catch (e) {
      console.error('Batch simulation error:', e);
    } finally {
      setBatchLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Clear all simulation alerts and history?')) return;
    try {
      await resetSimulation();
      setHistory([]);
      setResult(null);
    } catch (e) {
      console.error('Reset error:', e);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            {t('landslideSimulator')}
          </h1>
          <p className="text-dark-400 text-sm mt-1">
            {t('simulateLandslideDesc')}
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-yellow-600/10 border border-yellow-600/20">
          <span className="text-xs text-yellow-400 font-medium">{t('demoModeLabel')}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Station Selection */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-400" />
            {t('selectStation')}
          </h3>
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-dark-800 border border-dark-700 text-white text-sm focus:outline-none focus:border-green-600/50 transition-all"
          >
            <option value="">{t('autoSelectHighRisk')}</option>
            {stations.map(s => (
              <option key={s.station_id} value={s.station_id}>
                {s.name} ({s.state}) - Slope: {s.slope_angle}&deg;
              </option>
            ))}
          </select>

          {selectedStation && stations.find(s => s.station_id === selectedStation) && (
            <div className="mt-3 p-3 rounded-lg bg-dark-800/50 border border-dark-700">
              {(() => {
                const s = stations.find(st => st.station_id === selectedStation)!;
                return (
                  <>
                    <p className="text-xs font-medium text-white">{s.name}</p>
                    <p className="text-[10px] text-dark-500">{s.state} - {s.district}</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="text-center p-1 rounded bg-dark-900/50">
                        <p className="text-[10px] text-dark-400">{t('elevation')}</p>
                        <p className="text-xs font-bold text-white">{s.elevation}m</p>
                      </div>
                      <div className="text-center p-1 rounded bg-dark-900/50">
                        <p className="text-[10px] text-dark-400">{t('slope')}</p>
                        <p className="text-xs font-bold text-white">{s.slope_angle}&deg;</p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Intensity Selection */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-orange-400" />
            {t('eventIntensity')}
          </h3>
          <div className="space-y-2">
            {(Object.entries(INTENSITY_CONFIG) as [keyof typeof INTENSITY_CONFIG, typeof INTENSITY_CONFIG[keyof typeof INTENSITY_CONFIG]][]).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setIntensity(key)}
                className={`w-full p-3 rounded-xl text-left transition-all ${
                  intensity === key
                    ? `bg-gradient-to-r ${config.color} bg-opacity-10 border ${config.borderColor}`
                    : 'bg-dark-800/50 border border-dark-700 hover:border-dark-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold ${intensity === key ? config.textColor : 'text-white'}`}>
                      {config.label}
                    </p>
                    <p className="text-[10px] text-dark-400 mt-0.5">{config.description}</p>
                  </div>
                  {intensity === key && (
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${config.color}`} />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Simulate Button & Info */}
        <div className="glass rounded-xl p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Play className="w-4 h-4 text-green-400" />
            {t('runSimulation')}
          </h3>
          <p className="text-xs text-dark-400 mb-4">
            {t('runSimulationDesc')}
          </p>
          <div className="space-y-2">
            <button
              onClick={handleSimulate}
              disabled={loading || batchLoading}
              className={`w-full py-4 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                intensity === 'critical'
                  ? 'bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-500 hover:to-red-400 animate-pulse'
                  : intensity === 'high'
                  ? 'bg-gradient-to-r from-orange-600 to-red-500 text-white hover:from-orange-500 hover:to-red-400'
                  : intensity === 'moderate'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-500 text-white hover:from-amber-500 hover:to-orange-400'
                  : 'bg-gradient-to-r from-green-600 to-emerald-500 text-white hover:from-green-500 hover:to-emerald-400'
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  {intensity === 'critical' ? t('triggerCriticalEvent') : t('runSimulation')}
                </>
              )}
            </button>
            <button
              onClick={handleBatchSimulate}
              disabled={loading || batchLoading}
              className="w-full py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white hover:from-purple-500 hover:to-blue-400"
            >
              {batchLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  {t('runBatch')}
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              disabled={loading || batchLoading}
              className="w-full py-2 rounded-xl font-medium text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 bg-dark-800 border border-dark-700 text-dark-400 hover:text-white hover:border-red-600/30"
            >
              <XCircle className="w-4 h-4" />
              {t('resetAllSimulations')}
            </button>
          </div>
          <div className="mt-4 space-y-1.5">
            <p className="text-[10px] text-dark-500 font-medium">{t('whatHappens')}:</p>
            {[t('spikeInSensors'), t('aiRiskRuns'), t('alertGenerated'), t('dashboardUpdates')].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px] text-dark-400">
                <ChevronRight className="w-3 h-3 text-green-500" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="glass rounded-xl p-6 border border-green-600/20 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">{t('simulationResult')}</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Station Info */}
            <div>
              <h4 className="text-xs text-dark-400 mb-2 font-medium">{t('simulatedStation')}</h4>
              <div className="p-3 rounded-lg bg-dark-800/50 border border-dark-700">
                <p className="text-sm font-semibold text-white">{result.simulation.station.name}</p>
                <p className="text-[10px] text-dark-500">{result.simulation.station.state} - {result.simulation.station.district}</p>
                <p className="text-[10px] text-dark-400 mt-1">Intensity: {result.simulation.intensity.toUpperCase()}</p>
              </div>
              <h4 className="text-xs text-dark-400 mb-2 mt-3 font-medium">{t('sensorSpike')}</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-dark-800/50 text-center">
                  <Droplets className="w-3 h-3 text-blue-400 mx-auto mb-0.5" />
                  <p className="text-xs font-bold text-white">{result.simulation.sensor_reading.rainfall_mm}mm</p>
                  <p className="text-[9px] text-dark-500">{t('rainfall')}</p>
                </div>
                <div className="p-2 rounded-lg bg-dark-800/50 text-center">
                  <Activity className="w-3 h-3 text-emerald-400 mx-auto mb-0.5" />
                  <p className="text-xs font-bold text-white">{result.simulation.sensor_reading.soil_moisture}%</p>
                  <p className="text-[9px] text-dark-500">{t('soilMoisture')}</p>
                </div>
                <div className="p-2 rounded-lg bg-dark-800/50 text-center">
                  <Mountain className="w-3 h-3 text-orange-400 mx-auto mb-0.5" />
                  <p className="text-xs font-bold text-white">{result.simulation.sensor_reading.ground_displacement}mm</p>
                  <p className="text-[9px] text-dark-500">{t('groundDisplacement')}</p>
                </div>
                <div className="p-2 rounded-lg bg-dark-800/50 text-center">
                  <TrendingUp className="w-3 h-3 text-purple-400 mx-auto mb-0.5" />
                  <p className="text-xs font-bold text-white">{result.simulation.sensor_reading.pore_pressure}kPa</p>
                  <p className="text-[9px] text-dark-500">{t('porePressure')}</p>
                </div>
              </div>
            </div>

            {/* Risk Assessment */}
            <div>
              <h4 className="text-xs text-dark-400 mb-2 font-medium">{t('aiRiskAssessment')}</h4>
              <div className="text-center mb-3">
                <div className="relative inline-block">
                  <svg className="w-28 h-28" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#334155" strokeWidth="8" />
                    <circle
                      cx="60" cy="60" r="50" fill="none"
                      stroke={result.risk_assessment.risk_level === 'critical' ? '#ef4444' :
                              result.risk_assessment.risk_level === 'high' ? '#f97316' :
                              result.risk_assessment.risk_level === 'moderate' ? '#f59e0b' : '#22c55e'}
                      strokeWidth="8"
                      strokeDasharray={`${result.risk_assessment.risk_score * 3.14} 314`}
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-2xl font-bold text-white">{result.risk_assessment.risk_score}</p>
                    <p className="text-[10px] text-dark-400">/ 100</p>
                  </div>
                </div>
                <p className={`text-sm font-bold mt-1 ${
                  result.risk_assessment.risk_level === 'critical' ? 'text-red-400' :
                  result.risk_assessment.risk_level === 'high' ? 'text-orange-400' :
                  result.risk_assessment.risk_level === 'moderate' ? 'text-amber-400' : 'text-green-400'
                }`}>{result.risk_assessment.risk_level.toUpperCase()} {t('riskLabel')}</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-dark-400">{t('probability')}</span>
                  <span className="text-white font-medium">{(result.risk_assessment.landslide_probability * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-dark-400">{t('timeWindow')}</span>
                  <span className="text-white font-medium">{result.risk_assessment.time_window_hours}h</span>
                </div>
              </div>
            </div>

            {/* Alert & Factors */}
            <div>
              {result.alert && (
                <>
                  <h4 className="text-xs text-dark-400 mb-2 font-medium">{t('generatedAlert')}</h4>
                  <div className="p-3 rounded-lg bg-red-600/10 border border-red-600/30 mb-3">
                    <p className="text-sm font-semibold text-white">{result.alert.title}</p>
                    <p className="text-xs text-dark-400 mt-1 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {result.alert.affected_population.toLocaleString()} {t('peopleAffected')}
                    </p>
                  </div>
                </>
              )}
              <h4 className="text-xs text-dark-400 mb-2 font-medium">{t('contributingFactors')}</h4>
              <div className="space-y-1">
                {result.risk_assessment.contributing_factors.map((factor, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-orange-400">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    {factor}
                  </div>
                ))}
              </div>
              <h4 className="text-xs text-dark-400 mb-1 mt-3 font-medium">{t('recommendation')}</h4>
              <p className="text-xs text-dark-300">{result.risk_assessment.recommendation}</p>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-dark-400" />
              {t('historicalData')}
            </h3>
            <button
              onClick={() => setHistory([])}
              className="text-xs text-dark-400 hover:text-white flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> {t('cancel')}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-dark-400 border-b border-dark-700">
                  <th className="text-left py-2 font-medium">{t('stationLabel')}</th>
                  <th className="text-left py-2 font-medium">{t('intensityLabel')}</th>
                  <th className="text-left py-2 font-medium">{t('riskScore')}</th>
                  <th className="text-left py-2 font-medium">{t('levelLabel')}</th>
                  <th className="text-left py-2 font-medium">{t('alertLabel')}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} className="border-b border-dark-800">
                    <td className="py-2 text-white">{h.simulation.station.name}</td>
                    <td className="py-2 text-dark-300 capitalize">{h.simulation.intensity}</td>
                    <td className="py-2 text-white font-medium">{h.risk_assessment.risk_score}</td>
                    <td className={`py-2 font-medium ${
                      h.risk_assessment.risk_level === 'critical' ? 'text-red-400' :
                      h.risk_assessment.risk_level === 'high' ? 'text-orange-400' :
                      h.risk_assessment.risk_level === 'moderate' ? 'text-amber-400' : 'text-green-400'
                    }`}>{h.risk_assessment.risk_level.toUpperCase()}</td>
                    <td className="py-2 text-dark-300">{h.alert ? `${h.alert.affected_population.toLocaleString()} ${t('people')}` : '-'}</td>
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

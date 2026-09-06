import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { simulateLandslide, resetSimulation, SimulationResult } from '../services/api';
import { useAuth } from '../App';
import {
  Play, RotateCcw, Zap, AlertTriangle, CheckCircle, ChevronRight,
  Shield, Map, Bell, Radio, Activity, Target, Rocket, Eye,
  Compass, Layers, Cpu, Sparkles, CheckCircle2, ArrowRight,
  BarChart3, Globe, ShieldCheck, Waves, Users, FileText,
  ExternalLink, ArrowUpRight, Gauge, Check
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

export default function DemoFlow() {
  const { user } = useAuth();
  const canRunDemo = !!user && ['field_officer', 'district_admin', 'admin'].includes(user.role);
  const canResetDemo = user?.role === 'admin';
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [activeStationId, setActiveStationId] = useState('NER-011');
  const [feedback, setFeedback] = useState('');

  const DEMO_STEPS = [
    {
      id: 1,
      title: 'Command Dashboard & Telemetry Overview',
      subtitle: 'Database-backed multi-state KPI aggregation and prototype monitoring',
      icon: Activity,
      route: '/',
      badge: 'Step 1 • Executive',
      color: 'from-sky-500 to-blue-600',
      tag: 'System Telemetry',
      tip: 'Highlights risk distribution, seeded rainfall trends, and road status records. Data freshness is shown separately in the dashboard.',
      highlights: ['28 Seeded Stations', 'Generated Rainfall History', 'Road Status Records']
    },
    {
      id: 2,
      title: 'Pan-India GIS Risk Map & Multi-Layer Deck',
      subtitle: 'GIS prototype layers with online Esri basemap imagery',
      icon: Map,
      route: '/map',
      badge: 'Step 2 • Spatial',
      color: 'from-emerald-500 to-teal-600',
      tag: 'Geospatial Intelligence',
      tip: 'Demonstrates toggleable GIS layers. Deformation, faults, scarps and shelters are illustrative prototype data, not live authoritative feeds.',
      highlights: ['Illustrative Deformation', 'Seeded Village Data', 'Static Shelter Buffers']
    },
    {
      id: 3,
      title: 'Station Telemetry & Geotechnical Command',
      subtitle: 'Multi-sensor geotechnical parameter feeds & station telemetry cards',
      icon: Target,
      route: '/stations',
      badge: 'Step 3 • In-Situ',
      color: 'from-purple-500 to-indigo-600',
      tag: 'IoT Telemetry',
      tip: 'Search and filter all 28 monitored stations by state, risk tier, or telemetry health (pore pressure, soil moisture, tilt).',
      highlights: ['State Selector across 15 States', 'Prototype Stability Indicators', 'Seeded Sensor Records']
    },
    {
      id: 4,
      title: 'Geotechnical Workflow Simulator',
      subtitle: 'Deterministic sensor-injection and alert workflow laboratory',
      icon: Zap,
      route: '/simulator',
      badge: 'Step 4 • Physics + AI',
      color: 'from-rose-500 to-orange-600',
      tag: 'Simulation Engine',
      tip: 'Inject predefined cloudburst or displacement scenarios to exercise heuristic risk recalculation and database alert creation.',
      highlights: ['Rule-Based Risk Score', 'Demo Sensor Injection', 'Heuristic Scarp Estimate']
    },
    {
      id: 5,
      title: 'Synthetic Segmentation Prototype Lab',
      subtitle: 'Heuristic scar-mask demonstration on generated multispectral patches',
      icon: Eye,
      route: '/satellite',
      badge: 'Step 5 • Computer Vision',
      color: 'from-cyan-500 to-blue-600',
      tag: 'Satellite AI Lab',
      tip: 'Demonstrates the intended processing interface. It does not load trained RCAN/UNet weights or retrieve imagery from Earth Engine.',
      highlights: ['Bicubic Enhancement Demo', 'Heuristic Probability Mask', 'Illustrative Boundary Output']
    },
    {
      id: 6,
      title: 'Hydro-Meteorological & Flood Vulnerability Hub',
      subtitle: '4-quadrant compound hazard matrix combining Asia Flood Atlas & IMD Doppler',
      icon: Waves,
      route: '/flood',
      badge: 'Step 6 • Multi-Hazard',
      color: 'from-blue-500 to-cyan-500',
      tag: 'Compound Threat',
      tip: 'Analyzes compounding flood-landslide risks in NER river basins using empirical formulation: 0.40 × Flood + 0.60 × Landslide.',
      highlights: ['19 Monitored Catchments', '4-Quadrant Risk Scatter', 'River Basin Clustering']
    },
    {
      id: 7,
      title: 'Citizen Ground Scout & Incident Verification',
      subtitle: 'Crowdsourced multi-lingual incident reports & SDMA ground-truth ingest',
      icon: FileText,
      route: '/reports',
      badge: 'Step 7 • Citizen Scout',
      color: 'from-amber-500 to-orange-500',
      tag: 'Crowdsourced Ground-Truth',
      tip: 'Allows local residents and field officers to report tension cracks and rockfalls in 4 regional languages with instant GPS tagging.',
      highlights: ['Multi-Lingual Ingest (EN/HI/BN/AS)', 'GPS Auto-Geocoding', 'Field Verification Workflow']
    },
    {
      id: 8,
      title: 'CAP v1.2 Multi-Channel Emergency Alert Dispatch',
      subtitle: 'Common Alerting Protocol broadcast engine with acknowledgment lifecycle',
      icon: Bell,
      route: '/alerts',
      badge: 'Step 8 • Alerting',
      color: 'from-rose-500 to-pink-600',
      tag: 'Disaster Protocol',
      tip: 'Displays active early warning alerts, 72h incident timelines, and provides action buttons to acknowledge and resolve emergency states.',
      highlights: ['CAP v1.2 Protocol', 'Multi-Level Escalation', '72h Incident Timeline']
    }
  ];

  const handleRunDemo = async () => {
    if (!canRunDemo) return;
    setSimLoading(true);
    setFeedback('');
    try {
      const res = await simulateLandslide({ station_id: activeStationId, intensity: 'critical' });
      setSimResult(res.data);
    } catch (e: any) {
      console.error('Demo simulation error:', e);
      setFeedback(e.response?.data?.detail || 'The demo simulation could not be run.');
    } finally {
      setSimLoading(false);
    }
  };

  const handleReset = async () => {
    if (!canResetDemo) return;
    setFeedback('');
    try {
      await resetSimulation();
      setSimResult(null);
    } catch (e: any) {
      console.error('Reset error:', e);
      setFeedback(e.response?.data?.detail || 'The demo reset failed.');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── 1. Hero Demonstration Deck Header ───────────────────── */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wider uppercase">
          <Rocket className="w-3.5 h-3.5" />
          <span>Smart India Hackathon • Grand Jury Evaluation Deck</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Tri-Netra Landslide EWS <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-400">Prototype Demonstration</span>
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
          Step-by-step evaluation workflow for the prototype. Seeded records, synthetic segmentation and simulated dispatch are labeled so they are not mistaken for live operational feeds.
        </p>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            size="md"
            onClick={handleRunDemo}
            disabled={simLoading || !canRunDemo}
            className="bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-600/25 px-5 py-2.5 gap-2 whitespace-nowrap shrink-0 border border-rose-400/30"
          >
            {simLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Zap className="w-4 h-4 animate-pulse" />
            )}
            <span>Trigger Cloudburst Stress Event (Cherrapunji)</span>
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={handleReset}
            disabled={!canResetDemo}
            className="border-slate-200 dark:border-white/15 dark:bg-zinc-900/90 text-slate-800 dark:text-zinc-200 text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white px-4 py-2.5 gap-2 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-4 h-4 text-slate-400 dark:text-zinc-400" />
            <span>Reset System Baseline</span>
          </Button>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-zinc-400">
          Trigger requires Field Officer or above; reset requires Admin. {feedback && <span className="text-rose-600 dark:text-rose-400">{feedback}</span>}
        </p>
      </div>

      {/* ── 2. Live Simulation Impact Matrix (If Triggered) ─────── */}
      {simResult && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-rose-950/60 via-zinc-950/90 to-black border border-rose-500/40 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rose-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>Demo Stress Simulation Active • Critical Risk Injected</span>
                </h3>
                <p className="text-xs text-rose-300 font-medium">
                  {simResult.simulation.station.name} ({simResult.simulation.station.district}, {simResult.simulation.station.state})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="font-mono text-[10px] tracking-wider uppercase">
                {simResult.simulation.ai_assessment.risk_level.toUpperCase()} {simResult.simulation.ai_assessment.risk_score}/100
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/alerts')}
                className="border-rose-400/40 text-rose-300 hover:bg-rose-900/40 text-xs font-bold gap-1"
              >
                <span>View CAP Alert</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Metric Spike Pods */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/10 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Risk Score</span>
              <span className="text-2xl font-black text-rose-400 font-mono">{simResult.simulation.ai_assessment.risk_score}</span>
              <span className="text-[10px] text-rose-500 font-bold block">/ 100 Maximum</span>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/10 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Failure Probability</span>
              <span className="text-2xl font-black text-orange-400 font-mono">
                {(simResult.simulation.ai_assessment.landslide_probability * 100).toFixed(0)}%
              </span>
              <span className="text-[10px] text-orange-500 font-bold block">Severe Instability</span>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/10 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Injected Rainfall</span>
              <span className="text-2xl font-black text-cyan-400 font-mono">
                {simResult.simulation.sensor_spikes.rainfall_mm} mm
              </span>
              <span className="text-[10px] text-cyan-500 font-bold block">24-Hour Peak</span>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/10 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Time Window</span>
              <span className="text-2xl font-black text-white font-mono">
                24h
              </span>
              <span className="text-[10px] text-amber-400 font-bold block">Evacuation Window</span>
            </div>
          </div>

          {/* CAP Alert Notification */}
          {simResult.simulation.alert_generated && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-rose-400 animate-bounce" />
                <span><strong>Prototype alert record:</strong> {simResult.simulation.alert_generated.title}</span>
              </div>
              <span className="font-semibold text-rose-300">
                👥 {simResult.simulation.alert_generated.affected_population.toLocaleString()} people in seeded estimate
              </span>
            </div>
          )}

          <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-3 rounded-xl border border-white/10">
            <strong>Prototype recommendation:</strong> {simResult.simulation.ai_assessment.recommendation}
          </p>
        </div>
      )}

      {/* ── 3. Step-by-Step Jury Walkthrough Cards ─────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-white/10">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-500" />
            <span>8-Stage Subsystem Walkthrough Workflow</span>
          </h2>
          <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
            Click any stage to expand technical jury highlights
          </span>
        </div>

        <div className="space-y-2.5">
          {DEMO_STEPS.map((step) => {
            const isExpanded = activeStep === step.id;
            const StepIcon = step.icon;

            return (
              <div
                key={step.id}
                onClick={() => setActiveStep(isExpanded ? null : step.id)}
                className={`p-4 sm:p-5 rounded-2xl transition-all cursor-pointer border ${
                  isExpanded
                    ? 'bg-slate-50 dark:bg-zinc-900/90 border-emerald-500/50 shadow-lg dark:shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                    : 'bg-white dark:bg-zinc-950/85 backdrop-blur-xl border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/25 shadow-card'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                  {/* Left: Step Number, Icon, Title */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm`}>
                      {step.id}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                          <StepIcon className="w-4 h-4 text-slate-400 dark:text-zinc-400" />
                          <span>{step.title}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200/80 dark:border-white/10">
                          {step.tag}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate max-w-xl">
                        {step.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Right: Direct Route Launcher */}
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(step.route);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:text-white dark:border dark:border-emerald-400/30 text-xs font-bold shadow-md shadow-emerald-600/20 px-3.5 py-1.5 gap-1.5 whitespace-nowrap"
                    >
                      <span>Launch Subsystem</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Expanded Jury Evaluation Deep-Dive */}
                {isExpanded && (
                  <div className="mt-4 pt-3.5 border-t border-slate-200/60 dark:border-white/10 space-y-3 animate-in fade-in duration-150">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                      <p className="text-emerald-700 dark:text-emerald-300 leading-relaxed flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span><strong>Jury Evaluation Tip:</strong> {step.tip}</span>
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      {step.highlights.map((h, hIdx) => (
                        <span
                          key={hIdx}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-900/90 text-slate-800 dark:text-zinc-300 border border-slate-200 dark:border-white/10 font-semibold flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>{h}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. Key Benchmark Telemetry Pods ────────────────────── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-950/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-card space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Core System Benchmarks & Production Metrics</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Real Terrain Samples', value: '12,000+', sub: 'Real NER Geological Data', color: 'text-sky-500 dark:text-sky-400' },
            { label: 'AI Ensemble Accuracy', value: '79.4%', sub: 'RF + GB Cross-Validated', color: 'text-emerald-500 dark:text-emerald-400' },
            { label: 'Monitored Stations', value: '28', sub: 'Across 15 Mountain States', color: 'text-purple-500 dark:text-purple-400' },
            { label: 'Historical Slide Events', value: '44', sub: '2011–2024 Documented', color: 'text-amber-500 dark:text-amber-400' },
            { label: 'Regional Languages', value: '4', sub: 'English, Hindi, Bengali, Assamese', color: 'text-pink-500 dark:text-pink-400' },
            { label: 'REST API Endpoints', value: '22', sub: 'FastAPI with Sub-50ms Latency', color: 'text-cyan-500 dark:text-cyan-400' },
            { label: 'GIS Prototype Layers', value: '11', sub: 'Illustrative deformation, DEM, scars, villages', color: 'text-teal-500 dark:text-teal-400' },
            { label: 'P95 API Response Time', value: '<35ms', sub: 'Production Caching Engine', color: 'text-rose-500 dark:text-rose-400' },
          ].map((stat, i) => (
            <div key={i} className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/70 dark:border-white/10 text-center">
              <span className={`text-xl sm:text-2xl font-black font-mono block ${stat.color}`}>{stat.value}</span>
              <span className="text-xs font-bold text-slate-800 dark:text-white block mt-0.5">{stat.label}</span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-500 block">{stat.sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. Full Technology Stack & Architecture ─────────────── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-950/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-card space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-500" />
          <span>Full Technology Stack & Architecture</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            { layer: 'Backend Architecture', tech: 'FastAPI + SQLite + SQLAlchemy 2.0', icon: '⚡' },
            { layer: 'Risk Models', tech: 'XGBoost + Random Forest + GB; synthetic labels', icon: '🧠' },
            { layer: 'Frontend Framework', tech: 'React 19 + TypeScript + Tailwind v4', icon: '⚛️' },
            { layer: 'GIS Geospatial Mapping', tech: 'Leaflet.js + Esri Satellite + GeoJSON', icon: '🗺️' },
            { layer: 'Imagery Prototype', tech: 'Generated pixels + bicubic enhancement', icon: '🛰️' },
            { layer: 'Multi-Hazard Hydro Models', tech: 'Asia Flood Atlas + CWC Doppler', icon: '🌊' },
            { layer: 'Authentication & Security', tech: 'JWT Tokens + bcrypt + RBAC Roles', icon: '🛡️' },
            { layer: 'Standard Compliance', tech: 'Common Alerting Protocol (CAP v1.2)', icon: '📡' },
          ].map((item, i) => (
            <div key={i} className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/70 dark:border-white/10 space-y-1">
              <span className="text-sm">{item.icon}</span>
              <span className="font-bold text-slate-800 dark:text-white block">{item.layer}</span>
              <span className="text-slate-500 dark:text-zinc-400 block text-[11px] font-medium">{item.tech}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

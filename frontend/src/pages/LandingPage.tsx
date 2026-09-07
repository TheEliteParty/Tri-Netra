import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  ChevronDown,
  Eye,
  Layers3,
  MapPinned,
  Mountain,
  Radar,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../components/ui/button';

const workflow = [
  { label: 'Observe', icon: Eye },
  { label: 'Assess', icon: Layers3 },
  { label: 'Predict', icon: Radar },
  { label: 'Alert', icon: BellRing },
  { label: 'Act', icon: ShieldCheck },
];

const sectionShell = 'mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-12';

export default function LandingPage() {
  const navigate = useNavigate();
  const terrainSceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = terrainSceneRef.current;
    if (!scene || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    const updateParallax = () => {
      frame = 0;
      const rect = scene.getBoundingClientRect();
      const progress = Math.max(-1, Math.min(1, (window.innerHeight / 2 - rect.top) / window.innerHeight));
      scene.style.setProperty('--terrain-shift', `${progress * 18}px`);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateParallax);
    };

    updateParallax();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const scrollToHowItWorks = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#030809] text-white selection:bg-cyan-300 selection:text-slate-950">
      <header className="absolute inset-x-0 top-0 z-30 border-b border-white/10 bg-[#030809]/80 backdrop-blur-md">
        <div className={`${sectionShell} flex h-20 items-center justify-between`}>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            aria-label="Trinetra home"
          >
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white">
              <img src="/trinetra_logo.png" alt="" className="h-full w-full object-contain" />
            </span>
            <span>
              <span className="block text-sm font-black tracking-[0.24em]">TRINETRA</span>
              <span className="block text-[11px] font-medium tracking-wide text-cyan-200/70">NORTHEAST INDIA</span>
            </span>
          </button>

          <Button
            type="button"
            onClick={() => navigate('/')}
            className="border border-cyan-300/25 bg-cyan-400 text-slate-950 hover:bg-cyan-300"
          >
            Enter application <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main>
        <section className="relative flex min-h-screen items-center overflow-hidden border-b border-white/10 pt-28">
          <div className="landing-grid absolute inset-0 opacity-35" aria-hidden="true" />
          <div className="landing-contours absolute inset-y-0 right-0 w-full opacity-70 lg:w-3/5" aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#030809] to-transparent" aria-hidden="true" />

          <div className={`${sectionShell} relative z-10 grid items-center gap-16 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28`}>
            <div className="max-w-3xl">
              <div className="mb-8 inline-flex items-center gap-2 border-l-2 border-emerald-400 pl-3 text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">
                <Mountain className="h-4 w-4" />
                TRINETRA
              </div>
              <h1 className="max-w-4xl text-5xl font-black leading-[0.94] tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl xl:text-8xl">
                See the risk before
                <span className="mt-2 block text-cyan-300">the slope moves.</span>
              </h1>
              <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                AI-based early warning and landslide risk intelligence for Northeast India.
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  size="lg"
                  onClick={() => navigate('/')}
                  className="h-12 border border-cyan-200/30 bg-cyan-400 px-7 text-slate-950 shadow-[0_0_32px_rgba(34,211,238,0.18)] hover:bg-cyan-300"
                >
                  Explore Trinetra <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={scrollToHowItWorks}
                  className="h-12 border-white/15 bg-transparent px-7 text-white hover:border-white/30 hover:bg-white/5"
                >
                  See how it works <ChevronDown className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-14 flex flex-wrap items-center gap-x-2 gap-y-3" aria-label="Trinetra early-warning workflow">
                {workflow.map(({ label, icon: Icon }, index) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.13em] text-slate-300">
                      <Icon className="h-4 w-4 text-cyan-300" /> {label}
                    </span>
                    {index < workflow.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-slate-600" />}
                  </div>
                ))}
              </div>
            </div>

            <div
              ref={terrainSceneRef}
              className="landing-signal-scene relative min-h-[430px] overflow-hidden rounded-[2rem] border border-white/15 bg-slate-950/70 shadow-2xl shadow-black/50 sm:min-h-[520px]"
              data-animation-hook="terrain-scene"
              aria-hidden="true"
            >
              <div className="landing-scene-grid absolute inset-0" />
              <div className="landing-scene-contours absolute inset-0" />
              <div className="landing-rain-field absolute inset-0">
                {Array.from({ length: 18 }, (_, index) => (
                  <span
                    key={index}
                    style={{
                      left: `${7 + ((index * 17) % 88)}%`,
                      animationDelay: `${-((index * 0.41) % 3.4)}s`,
                      animationDuration: `${2.5 + (index % 5) * 0.28}s`,
                    }}
                  />
                ))}
              </div>

              <svg className="landing-signal-lines absolute inset-0 h-full w-full" viewBox="0 0 620 620" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="terrain-surface" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#0f766e" stopOpacity="0.08" />
                    <stop offset="0.62" stopColor="#10b981" stopOpacity="0.24" />
                    <stop offset="1" stopColor="#f59e0b" stopOpacity="0.12" />
                  </linearGradient>
                  <radialGradient id="risk-emergence">
                    <stop offset="0" stopColor="#f59e0b" stopOpacity="0.5" />
                    <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <path className="terrain-surface" d="M-20 495 C80 445 138 474 224 407 C316 336 381 397 464 304 C515 247 566 252 650 178 L650 650 L-20 650 Z" fill="url(#terrain-surface)" />
                <path className="terrain-ridge" d="M-20 495 C80 445 138 474 224 407 C316 336 381 397 464 304 C515 247 566 252 650 178" />
                <path className="terrain-ridge terrain-ridge-soft" d="M-30 535 C95 487 151 516 241 445 C328 378 395 431 488 340 C539 291 581 294 660 229" />
                <path className="signal-path signal-path-one" d="M111 372 C205 365 246 335 348 318" />
                <path className="signal-path signal-path-two" d="M235 452 C270 406 291 361 348 318" />
                <path className="signal-path signal-path-three" d="M505 263 C449 267 410 282 348 318" />
                <circle className="risk-emergence" cx="348" cy="318" r="98" fill="url(#risk-emergence)" />
              </svg>

              <span className="monitor-point monitor-point-one"><i /></span>
              <span className="monitor-point monitor-point-two"><i /></span>
              <span className="monitor-point monitor-point-three"><i /></span>

              <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-white/10 px-5 py-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                <span className="flex items-center gap-2"><MapPinned className="h-4 w-4 text-cyan-300" /> Terrain signal synthesis</span>
                <span className="landing-scan-label text-emerald-300">Assessing</span>
              </div>

              <div className="landing-intelligence-layer absolute left-1/2 top-[51%] w-[min(72%,19rem)] -translate-x-1/2 -translate-y-1/2 border border-cyan-200/20 bg-[#051012]/90 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.16em]">
                  <span className="text-cyan-200">Risk intelligence</span>
                  <Radar className="h-4 w-4 text-cyan-300" />
                </div>
                <div className="mt-4 space-y-2.5 text-xs text-slate-400">
                  {['Terrain', 'Rainfall', 'Soil moisture', 'Slope'].map((signal, index) => (
                    <div key={signal} className="grid grid-cols-[5.5rem_1fr] items-center gap-3">
                      <span>{signal}</span>
                      <span className="h-px overflow-hidden bg-white/10"><i className={`signal-fill signal-fill-${index + 1}`} /></span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200">
                  <span>Early-warning layer</span>
                  <span className="landing-alert-pulse h-2 w-2 rounded-full bg-amber-300" />
                </div>
              </div>

              <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between border-l-2 border-amber-300 bg-black/45 px-4 py-3 backdrop-blur-sm">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-300">Environmental signals → assessment</p>
                <BellRing className="landing-warning-icon h-4 w-4 text-amber-200" />
              </div>
            </div>
          </div>
        </section>

        <section id="problem" className="border-b border-white/10 py-28 sm:py-36" data-animation-hook="problem">
          <div className={sectionShell}>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-300">01 / Problem</p>
            <h2 className="mt-5 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">Complex terrain needs connected context.</h2>
            <div className="mt-12 min-h-48 border-t border-white/15 pt-8 text-lg leading-8 text-slate-400">
              Foundation for the landslide-risk problem narrative and environmental context.
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-b border-white/10 bg-[#061011] py-28 sm:py-36" data-animation-hook="workflow">
          <div className={sectionShell}>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">02 / How Trinetra works</p>
            <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">Observe → Assess → Predict → Alert → Act</h2>
            <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-5">
              {workflow.map(({ label, icon: Icon }, index) => (
                <div key={label} className="min-h-44 bg-[#061011] p-6">
                  <span className="text-xs font-mono text-slate-600">0{index + 1}</span>
                  <Icon className="mt-8 h-6 w-6 text-cyan-300" />
                  <h3 className="mt-4 text-lg font-bold">{label}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="risk-intelligence" className="border-b border-white/10 py-28 sm:py-36" data-animation-hook="risk-intelligence">
          <div className={`${sectionShell} grid gap-12 lg:grid-cols-2`}>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">03 / Risk intelligence</p>
              <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">Signals organized for assessment.</h2>
            </div>
            <div className="min-h-64 border-l border-white/15 pl-8 text-lg leading-8 text-slate-400">
              Foundation for explaining the prototype’s risk assessment, alerts, simulations, and field reporting capabilities.
            </div>
          </div>
        </section>

        <section id="northeast-gis" className="border-b border-white/10 bg-[#061011] py-28 sm:py-36" data-animation-hook="gis">
          <div className={`${sectionShell} grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]`}>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">04 / GIS · Northeast India</p>
              <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">A geographic foundation for regional awareness.</h2>
              <p className="mt-6 text-lg leading-8 text-slate-400">State and district boundaries, terrain overlays, roads, rivers, and settlements provide map context for the Northeast India focus region.</p>
            </div>
            <div className="landing-map-placeholder min-h-80 rounded-[2rem] border border-white/15" aria-hidden="true" />
          </div>
        </section>

        <section className="py-28 sm:py-36" data-animation-hook="final-cta">
          <div className={`${sectionShell} text-center`}>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">From signal to action</p>
            <h2 className="mx-auto mt-5 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">Explore the Trinetra prototype.</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">Open the existing application to explore its risk map, monitoring views, alerts, reports, and simulations.</p>
            <Button
              type="button"
              size="lg"
              onClick={() => navigate('/')}
              className="mt-9 h-12 border border-cyan-200/30 bg-cyan-400 px-8 text-slate-950 hover:bg-cyan-300"
            >
              Enter application <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-8">
        <div className={`${sectionShell} flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between`}>
          <span className="font-bold tracking-[0.18em] text-slate-300">TRINETRA</span>
          <span>AI-based early warning and landslide risk monitoring for Northeast India.</span>
        </div>
      </footer>
    </div>
  );
}

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  ChevronDown,
  CloudRain,
  Droplets,
  Eye,
  Layers3,
  MapPin,
  MapPinned,
  Mountain,
  Radar,
  Radio,
  ShieldCheck,
  Sprout,
} from 'lucide-react';
import { Button } from '../components/ui/button';

const workflow = [
  { label: 'Observe', icon: Eye },
  { label: 'Assess', icon: Layers3 },
  { label: 'Predict', icon: Radar },
  { label: 'Alert', icon: BellRing },
  { label: 'Act', icon: ShieldCheck },
];

const storyStages = [
  {
    title: 'Observe',
    eyebrow: 'Environmental inputs',
    description: 'Rainfall, terrain, monitoring observations, and environmental context enter the same field of view.',
    detail: 'Scattered observations become visible together.',
    icon: Eye,
  },
  {
    title: 'Assess',
    eyebrow: 'Context alignment',
    description: 'Signals are read against slope conditions, environmental state, and the people and places exposed nearby.',
    detail: 'Conditions gain geographic and operational context.',
    icon: Layers3,
  },
  {
    title: 'Predict',
    eyebrow: 'Risk synthesis',
    description: 'Multiple signals become one explainable risk picture.',
    detail: 'The prototype organizes contributing factors into a shared assessment.',
    icon: Radar,
  },
  {
    title: 'Alert',
    eyebrow: 'Threshold awareness',
    description: 'When assessed risk crosses a warning threshold, the affected area is surfaced for attention.',
    detail: 'Early warning focuses attention without creating panic.',
    icon: BellRing,
  },
  {
    title: 'Act',
    eyebrow: 'Decision support',
    description: 'Prioritize an area, inspect a location, issue a warning, and support response planning.',
    detail: 'Prediction is only useful when it leads to action.',
    icon: ShieldCheck,
  },
];

const riskSignals = [
  {
    id: 'rainfall',
    label: 'Rainfall',
    icon: CloudRain,
    items: ['Recent rainfall', 'Accumulated rainfall', 'Rainfall intensity'],
  },
  {
    id: 'terrain',
    label: 'Terrain',
    icon: Mountain,
    items: ['Slope', 'Elevation', 'Terrain structure'],
  },
  {
    id: 'environment',
    label: 'Environment',
    icon: Sprout,
    items: ['Soil conditions', 'Vegetation indicators'],
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    icon: Radio,
    items: ['Sensor observations', 'Changing local conditions'],
  },
  {
    id: 'exposure',
    label: 'Exposure',
    icon: MapPin,
    items: ['Settlements', 'Roads', 'Infrastructure context'],
  },
];

const sectionShell = 'mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-12';

export default function LandingPage() {
  const navigate = useNavigate();
  const terrainSceneRef = useRef<HTMLDivElement>(null);
  const storyStageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const riskSectionRef = useRef<HTMLElement>(null);
  const [activeStoryStage, setActiveStoryStage] = useState(0);
  const [riskSectionActive, setRiskSectionActive] = useState(false);

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

  useEffect(() => {
    const section = riskSectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRiskSectionActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const ratios = new Map<Element, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0));
        let nextStage = 0;
        let highestRatio = 0;
        storyStageRefs.current.forEach((stage, index) => {
          const ratio = stage ? ratios.get(stage) || 0 : 0;
          if (ratio > highestRatio) {
            highestRatio = ratio;
            nextStage = index;
          }
        });
        if (highestRatio > 0) setActiveStoryStage(nextStage);
      },
      { rootMargin: '-24% 0px -34% 0px', threshold: [0.15, 0.35, 0.55, 0.75] },
    );

    storyStageRefs.current.forEach((stage) => stage && observer.observe(stage));
    return () => observer.disconnect();
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
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-400">
              Trinetra’s prototype workflow connects environmental context to the decisions that follow an emerging risk.
            </p>

            <div className="mt-16 grid items-start gap-12 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)] lg:gap-16">
              <div className="sticky top-8 hidden min-h-[calc(100vh-4rem)] items-center lg:flex">
                <div className="w-full">
                  <div className="landing-story-rail" data-stage={activeStoryStage} aria-label="Trinetra workflow progress">
                    {storyStages.map((stage, index) => (
                      <button
                        key={stage.title}
                        type="button"
                        onClick={() => storyStageRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                        className={index <= activeStoryStage ? 'is-active' : ''}
                        aria-current={index === activeStoryStage ? 'step' : undefined}
                      >
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <strong>{stage.title}</strong>
                      </button>
                    ))}
                  </div>

                  <div className="landing-story-visual mt-7" data-stage={activeStoryStage} aria-hidden="true">
                    <div className="story-grid" />
                    <div className="story-contours story-contours-back" />
                    <div className="story-contours story-contours-front" />
                    <div className="story-input story-input-rain"><Droplets className="h-4 w-4" /></div>
                    <div className="story-input story-input-terrain"><Mountain className="h-4 w-4" /></div>
                    <div className="story-input story-input-observation"><Eye className="h-4 w-4" /></div>
                    <span className="story-node story-node-one" />
                    <span className="story-node story-node-two" />
                    <span className="story-node story-node-three" />
                    <svg viewBox="0 0 760 520" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                      <path className="story-terrain-fill" d="M-30 430 C105 373 169 420 280 333 C382 253 451 322 548 235 C617 174 681 190 790 104 L790 560 L-30 560 Z" />
                      <path className="story-terrain-line" d="M-30 430 C105 373 169 420 280 333 C382 253 451 322 548 235 C617 174 681 190 790 104" />
                      <path className="story-flow story-flow-one" d="M108 165 C186 202 254 245 369 286" />
                      <path className="story-flow story-flow-two" d="M105 379 C205 350 268 319 369 286" />
                      <path className="story-flow story-flow-three" d="M646 180 C550 218 474 248 369 286" />
                      <circle className="story-risk-field" cx="404" cy="302" r="105" />
                      <circle className="story-warning-wave story-warning-wave-one" cx="404" cy="302" r="68" />
                      <circle className="story-warning-wave story-warning-wave-two" cx="404" cy="302" r="68" />
                      <path className="story-action-route" d="M404 302 C475 336 526 387 626 404" />
                    </svg>
                    <div className="story-synthesis">
                      <Radar className="h-5 w-5" />
                      <span>Risk picture</span>
                    </div>
                    <div className="story-decision">
                      <ShieldCheck className="h-5 w-5" />
                      <span>Decision support</span>
                    </div>
                    <div className="story-stage-caption">
                      <span>{String(activeStoryStage + 1).padStart(2, '0')}</span>
                      <strong>{storyStages[activeStoryStage].eyebrow}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="landing-story-stages">
                {storyStages.map(({ title, eyebrow, description, detail, icon: Icon }, index) => (
                  <div
                    key={title}
                    ref={(element) => { storyStageRefs.current[index] = element; }}
                    className={`landing-story-stage ${index === activeStoryStage ? 'is-active' : ''}`}
                  >
                    <div className="landing-mobile-story-visual lg:hidden" data-mobile-stage={index} aria-hidden="true">
                      <span className="mobile-story-line" />
                      <span className="mobile-story-signal mobile-story-signal-one" />
                      <span className="mobile-story-signal mobile-story-signal-two" />
                      <Icon className="relative z-10 h-6 w-6 text-cyan-200" />
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm text-cyan-300/65">{String(index + 1).padStart(2, '0')}</span>
                      <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</span>
                    </div>
                    <h3 className="mt-5 text-4xl font-black uppercase tracking-[-0.03em] text-white sm:text-5xl">{title}</h3>
                    <p className="mt-5 text-lg leading-8 text-slate-300">{description}</p>
                    <p className="mt-5 border-l border-cyan-300/30 pl-4 text-sm leading-6 text-slate-500">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          ref={riskSectionRef}
          id="risk-intelligence"
          className={`landing-risk-section relative overflow-hidden border-b border-white/10 py-28 sm:py-36 ${riskSectionActive ? 'is-active' : ''}`}
          data-animation-hook="risk-intelligence"
        >
          <div className="landing-contours absolute inset-0 opacity-25" aria-hidden="true" />
          <div className={`${sectionShell} relative z-10`}>
            <div className="max-w-4xl">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">03 / Risk intelligence</p>
              <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl lg:text-6xl">Risk is never just one signal.</h2>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-400">
                Landslide conditions emerge from interacting environmental and geographic factors. Trinetra is designed to bring those signals together into a contextual risk picture.
              </p>
            </div>

            <div className="landing-risk-system mt-16" aria-label="Multiple environmental and geographic signals combine into explainable risk intelligence">
              <div className="risk-system-grid" aria-hidden="true" />
              <div className="risk-system-contours" aria-hidden="true" />
              <svg className="risk-system-paths" viewBox="0 0 1100 720" preserveAspectRatio="none" aria-hidden="true">
                <path pathLength="1" d="M165 136 C286 154 354 230 515 328" />
                <path pathLength="1" d="M550 86 C550 176 550 220 550 327" />
                <path pathLength="1" d="M935 145 C811 165 746 238 585 329" />
                <path pathLength="1" d="M193 513 C314 486 387 431 518 371" />
                <path pathLength="1" d="M912 520 C784 488 720 432 583 371" />
              </svg>

              {riskSignals.map(({ id, label, icon: Icon, items }, index) => (
                <div key={id} className={`risk-signal-group risk-signal-${id}`} style={{ '--signal-index': index } as CSSProperties}>
                  <span className="risk-signal-icon"><Icon className="h-5 w-5" /></span>
                  <div>
                    <h3>{label}</h3>
                    <p>{items.join(' · ')}</p>
                  </div>
                  <span className="risk-signal-node" aria-hidden="true" />
                </div>
              ))}

              <div className="risk-intelligence-core" aria-hidden="true">
                <span className="risk-core-orbit risk-core-orbit-one" />
                <span className="risk-core-orbit risk-core-orbit-two" />
                <Radar className="h-7 w-7 text-cyan-200" />
                <strong>Risk intelligence</strong>
                <small>Contextual · location-aware · explainable</small>
              </div>

              <div className="risk-explainability">
                <div className="risk-explainability-heading">
                  <span>Illustrative explanation</span>
                  <h3>Why might this area be at risk?</h3>
                </div>
                <div className="risk-factor-list">
                  {['High recent rainfall', 'Steep terrain', 'Elevated soil moisture', 'Nearby exposed settlement'].map((factor) => (
                    <span key={factor}><i aria-hidden="true" />{factor}</span>
                  ))}
                </div>
                <p>Example contributing factors show how an assessment can be explained; they are not live readings.</p>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3 border-l border-emerald-300/30 pl-5 text-sm leading-6 text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <span>Built toward explainable, location-aware risk intelligence.</span>
              <span className="font-semibold text-emerald-200">Many signals → contextual fusion → explainable risk</span>
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

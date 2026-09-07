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
  Route,
  ShieldCheck,
  Sprout,
  Waves,
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

const geographicContext = [
  { label: 'Terrain and slope', icon: Mountain },
  { label: 'Rainfall-sensitive landscapes', icon: CloudRain },
  { label: 'Settlements and communities', icon: MapPin },
  { label: 'Roads and transport corridors', icon: Route },
  { label: 'Rivers and waterways', icon: Waves },
];

// Lightweight boundary paths derived from the project NER ADM1 layer and normalized to a 780 x 620 viewBox.
// The full GeoJSON remains exclusive to the application map and is never loaded by this landing page.
const northeastStatePaths = [
  { name: 'Arunachal Pradesh', d: 'M599 229 L625 217 L644 205 L666 188 L695 179 L712 174 L735 182 L754 194 L743 171 L746 145 L711 83 L625 21 L420 95 L340 180 L423 209 L472 204 L482 195 L506 168 L519 153 L543 153 L558 148 L627 126 L656 131 L643 145 L644 149 L648 154 L652 158 L653 169 L661 175 L646 180 L630 184 L622 182 L610 194 L596 200 L599 209 L597 219 L599 229Z' },
  { name: 'Assam', d: 'M596 200 L631 184 L650 167 L645 146 L563 146 L507 167 L416 210 L183 216 L148 280 L160 321 L161 300 L173 290 L217 294 L263 303 L294 286 L311 279 L330 283 L352 280 L343 302 L370 312 L395 346 L366 370 L351 379 L352 430 L376 431 L389 419 L408 418 L423 389 L435 367 L445 349 L448 331 L450 316 L472 297 L499 269 L526 245 L547 226 L596 200Z' },
  { name: 'Manipur', d: 'M452 341 L446 348 L444 352 L442 358 L434 368 L433 377 L426 385 L422 391 L419 405 L417 422 L414 441 L423 446 L426 443 L435 448 L443 443 L447 444 L450 448 L459 453 L463 453 L476 450 L493 455 L502 459 L506 463 L520 436 L557 368 L548 341 L545 327 L545 314 L536 317 L524 326 L505 324 L492 322 L479 324 L479 332 L468 344 L461 349 L452 341Z' },
  { name: 'Meghalaya', d: 'M366 365 L370 360 L391 351 L395 340 L383 325 L377 317 L365 308 L352 309 L344 305 L348 294 L346 287 L354 280 L346 280 L336 283 L330 283 L323 285 L321 278 L309 280 L301 293 L300 284 L290 291 L292 296 L272 304 L263 298 L250 296 L227 291 L183 289 L177 288 L174 290 L171 292 L166 295 L161 300 L160 306 L163 315 L156 322 L199 355 L366 365Z' },
  { name: 'Mizoram', d: 'M353 473 L357 490 L362 504 L360 518 L363 530 L370 550 L375 570 L377 582 L380 597 L385 614 L395 606 L405 615 L411 613 L417 603 L429 595 L426 567 L426 535 L442 527 L445 503 L449 483 L447 468 L442 451 L435 448 L425 443 L422 445 L416 432 L410 417 L399 417 L391 414 L386 422 L382 429 L376 433 L369 439 L357 432 L357 446 L358 458 L353 473Z' },
  { name: 'Nagaland', d: 'M599 229 L597 216 L597 206 L579 210 L564 218 L546 226 L540 228 L531 237 L526 245 L521 247 L514 247 L496 275 L480 294 L476 290 L469 300 L461 306 L452 315 L446 319 L444 326 L447 330 L453 336 L456 348 L464 351 L472 338 L477 327 L483 322 L498 321 L512 323 L530 324 L540 316 L546 315 L549 330 L570 321 L582 307 L591 278 L588 250 L599 229Z' },
  { name: 'Sikkim', d: 'M0 185 L17 192 L37 194 L47 188 L62 190 L64 187 L69 181 L74 178 L72 174 L67 171 L65 166 L64 162 L63 159 L65 154 L67 150 L69 145 L70 141 L70 136 L72 131 L68 126 L67 119 L55 114 L47 114 L39 117 L33 122 L26 123 L19 125 L15 125 L10 126 L11 131 L14 135 L14 139 L9 149 L4 159 L3 169 L2 180 L0 185Z' },
  { name: 'Tripura', d: 'M316 491 L321 498 L329 492 L327 481 L328 472 L339 477 L350 477 L357 459 L357 449 L358 436 L351 423 L344 407 L340 419 L329 418 L327 421 L320 436 L306 438 L300 442 L288 442 L279 442 L276 452 L268 463 L265 476 L265 488 L272 506 L282 526 L282 509 L285 512 L290 521 L298 536 L312 530 L316 527 L315 521 L314 515 L312 510 L318 497 L316 491Z' },
];

const sectionShell = 'mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-12';

export default function LandingPage() {
  const navigate = useNavigate();
  const terrainSceneRef = useRef<HTMLDivElement>(null);
  const storyStageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const riskSectionRef = useRef<HTMLElement>(null);
  const geographySectionRef = useRef<HTMLElement>(null);
  const [activeStoryStage, setActiveStoryStage] = useState(0);
  const [riskSectionActive, setRiskSectionActive] = useState(false);
  const [geographySectionActive, setGeographySectionActive] = useState(false);

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

  useEffect(() => {
    const section = geographySectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setGeographySectionActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.16 },
    );
    observer.observe(section);
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

        <section
          ref={geographySectionRef}
          id="northeast-gis"
          className={`landing-geo-section relative overflow-hidden border-b border-white/10 bg-[#061011] py-28 sm:py-36 ${geographySectionActive ? 'is-active' : ''}`}
          data-animation-hook="gis"
        >
          <div className="landing-geo-atmosphere" aria-hidden="true" />
          <div className={`${sectionShell} relative z-10`}>
            <div className="landing-geo-heading">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">04 / GIS · Northeast India</p>
                <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl lg:text-6xl">Built for complex terrain.</h2>
              </div>
              <p className="max-w-2xl text-lg leading-8 text-slate-400">
                Northeast India combines steep terrain, intense rainfall, dispersed settlements, transportation corridors, and environmentally sensitive landscapes. Trinetra brings these geographic relationships into the risk picture.
              </p>
            </div>

            <div className="landing-geo-layout mt-14">
              <div className="landing-geo-copy">
                <p className="landing-geo-principle">Location matters. Context matters. <strong>Risk is spatial.</strong></p>
                <div className="landing-geo-context" aria-label="Geographic context represented in Trinetra">
                  {geographicContext.map(({ label, icon: Icon }, index) => (
                    <div key={label} className="landing-geo-context-item" style={{ '--geo-index': index } as CSSProperties}>
                      <span><Icon className="h-4 w-4" /></span>
                      <p>{label}</p>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/')}
                  className="landing-geo-cta mt-8 h-auto justify-start px-0 py-2 text-cyan-200 hover:bg-transparent hover:text-cyan-100"
                >
                  Explore the Risk Map <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <figure className="landing-geo-visual" aria-labelledby="northeast-map-caption">
                <div className="geo-coordinate-grid" aria-hidden="true" />
                <div className="geo-map-label" aria-hidden="true">
                  <span>NER geographic context</span>
                  <small>88.0°E — 97.4°E</small>
                </div>
                <svg className="geo-map-svg" viewBox="-30 -15 840 665" role="img" aria-label="Simplified geographic visualization of the eight Northeast Indian states">
                  <defs>
                    <linearGradient id="geo-state-fill" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#0f3433" />
                      <stop offset="1" stopColor="#07191d" />
                    </linearGradient>
                    <radialGradient id="geo-risk-fill">
                      <stop offset="0" stopColor="#f59e0b" stopOpacity="0.42" />
                      <stop offset="0.55" stopColor="#f59e0b" stopOpacity="0.13" />
                      <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  <g className="geo-state-layer">
                    {northeastStatePaths.map(({ name, d }, index) => (
                      <path key={name} d={d} data-state={name} style={{ '--state-index': index } as CSSProperties} />
                    ))}
                  </g>

                  <g className="geo-terrain-layer" aria-hidden="true">
                    <path d="M333 181 C425 114 538 83 697 65" />
                    <path d="M333 197 C447 143 552 113 733 103" />
                    <path d="M355 219 C463 174 566 153 751 143" />
                    <path d="M174 267 C259 239 367 242 463 222" />
                    <path d="M301 459 C345 429 397 417 452 423" />
                    <path d="M320 492 C365 471 408 464 448 474" />
                  </g>

                  <g className="geo-water-layer" aria-hidden="true">
                    <path d="M151 274 C238 258 315 264 383 279 C464 297 522 260 607 208" />
                    <path d="M388 284 C423 315 424 352 405 394 C391 427 397 472 416 526" />
                    <path d="M520 245 C557 260 574 286 579 319" />
                  </g>

                  <g className="geo-road-layer" aria-hidden="true">
                    <path d="M186 302 C269 292 336 309 390 347 C436 379 473 394 514 410" />
                    <path d="M324 284 C350 340 350 389 373 440 C391 479 398 526 402 584" />
                    <path d="M416 210 C466 236 500 269 537 317" />
                  </g>

                  <g className="geo-settlement-layer" aria-hidden="true">
                    {[[188, 293], [273, 301], [350, 287], [393, 349], [445, 325], [505, 322], [373, 431], [424, 443], [398, 521], [574, 225]].map(([cx, cy], index) => (
                      <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={index % 3 === 0 ? 4 : 2.6} style={{ '--point-index': index } as CSSProperties} />
                    ))}
                  </g>

                  <g className="geo-risk-layer" aria-hidden="true">
                    <ellipse cx="439" cy="369" rx="90" ry="72" />
                    <circle className="geo-risk-focus" cx="439" cy="369" r="17" />
                    <circle className="geo-risk-ring geo-risk-ring-one" cx="439" cy="369" r="28" />
                    <circle className="geo-risk-ring geo-risk-ring-two" cx="439" cy="369" r="28" />
                  </g>

                  <g className="geo-monitor-layer" aria-hidden="true">
                    <circle cx="346" cy="284" r="5" />
                    <circle cx="514" cy="320" r="5" />
                    <circle cx="398" cy="520" r="5" />
                  </g>
                </svg>

                <div className="geo-layer-key" aria-hidden="true">
                  <span className="is-water">Waterways</span>
                  <span className="is-route">Corridors</span>
                  <span className="is-settlement">Settlements</span>
                  <span className="is-risk">Contextual risk</span>
                </div>
                <figcaption id="northeast-map-caption">
                  Simplified from the project’s NER state-boundary layer. Supporting routes, points, and risk marks are illustrative geographic context—not live observations or validated predictions.
                </figcaption>
              </figure>
            </div>

            <div className="landing-geo-equation" aria-label="Terrain, infrastructure, settlements, and environmental signals contribute to contextual risk">
              <span>Terrain</span><i>+</i><span>Infrastructure</span><i>+</i><span>Settlements</span><i>+</i><span>Environmental signals</span><ArrowRight className="h-4 w-4" /><strong>Contextual risk</strong>
            </div>
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

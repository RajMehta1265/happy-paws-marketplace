import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { WolfLogo } from "@/components/ui/WolfLogo";

gsap.registerPlugin(ScrollTrigger);

const frameCount = 144;
const currentFrame = (index: number) => `/Landing Page/${String(index).padStart(5, "0")}.jpg`;

export function CinematicHero() {
  const root = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSkip, setShowSkip] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      // Fade out the skip button when entering the shutter sequence (at scroll position > 5.0 viewports)
      setShowSkip(window.scrollY < window.innerHeight * 5.0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSkip = () => {
    window.scrollTo({
      top: window.innerHeight * 5.3,
      behavior: "smooth",
    });
  };

  // Preload all 144 images
  useEffect(() => {
    let loadedCount = 0;
    const loadedImages: HTMLImageElement[] = [];

    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      img.src = currentFrame(i);
      img.onload = () => {
        loadedCount++;
        setLoadingProgress(Math.round((loadedCount / frameCount) * 100));
        if (loadedCount === frameCount) {
          setIsLoaded(true);
        }
      };
      img.onerror = () => {
        // Handle loading errors gracefully to avoid hanging
        loadedCount++;
        setLoadingProgress(Math.round((loadedCount / frameCount) * 100));
        if (loadedCount === frameCount) {
          setIsLoaded(true);
        }
      };
      loadedImages.push(img);
    }
    setImages(loadedImages);
  }, []);

  // Setup ScrollTrigger for Canvas Sequence
  useLayoutEffect(() => {
    if (!isLoaded || images.length === 0 || !canvasRef.current || !root.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    const renderFrame = (index: number) => {
      const img = images[index];
      if (!img) return;

      context.clearRect(0, 0, canvas.width, canvas.height);

      const canvasRatio = canvas.width / canvas.height;
      const imgRatio = img.width / img.height;
      let drawWidth = canvas.width;
      let drawHeight = canvas.height;
      let offsetX = 0;
      let offsetY = 0;

      const isMobile = window.innerWidth < 768;

      if (isMobile) {
        // Contain logic to prevent cropping on portrait mobile viewports
        if (canvasRatio > imgRatio) {
          drawWidth = canvas.height * imgRatio;
          offsetX = (canvas.width - drawWidth) / 2;
        } else {
          drawHeight = canvas.width / imgRatio;
          offsetY = (canvas.height - drawHeight) / 2;
        }
      } else {
        // Cover logic for immersive desktop displays
        if (canvasRatio > imgRatio) {
          drawHeight = canvas.width / imgRatio;
          offsetY = (canvas.height - drawHeight) / 2;
        } else {
          drawWidth = canvas.height * imgRatio;
          offsetX = (canvas.width - drawWidth) / 2;
        }
      }

      context.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      renderFrame(airplay.frame);
    };

    const airplay = { frame: 0 };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    const scenes = gsap.utils.toArray<HTMLElement>(".scene");
    const total = 13.5; // Scroll height budget in viewports

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: root.current,
        start: "top top",
        end: () => `+=${total * 100}%`,
        scrub: 1,
        pin: true,
        anticipatePin: 1,
      },
    });

    // ─── SCENE 1: Keyboard Explosion Sequence (0.0 to 5.0) ───────────────
    tl.to(airplay, {
      frame: frameCount - 1,
      snap: "frame",
      ease: "none",
      duration: 4.7,
      onUpdate: () => {
        renderFrame(airplay.frame);
      },
    }, 0);

    // Synchronized text reveals during keyboard explosion
    tl.fromTo("#sequence-text-1", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, 0.2)
      .to("#sequence-text-1", { opacity: 0, y: -30, duration: 0.6 }, 1.2)

      .fromTo("#sequence-text-2", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, 1.4)
      .to("#sequence-text-2", { opacity: 0, y: -30, duration: 0.6 }, 2.4)

      .fromTo("#sequence-text-3", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, 2.6)
      .to("#sequence-text-3", { opacity: 0, y: -30, duration: 0.6 }, 3.6)

      .fromTo("#sequence-text-4", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, 3.8)
      .to("#sequence-text-4", { opacity: 0, y: -30, duration: 0.6 }, 4.6)

      .to(".keyboard-sequence-container", { autoAlpha: 0, duration: 0.8 }, 4.7);

    // ─── ORIGINAL SCENES (Scene 2 to 7) ──────────────────────────────────
    const originalSceneStarts = [5.3, 6.6, 8.0, 9.4, 10.8, 12.2];
    const originalScenes = scenes.slice(1);
    
    originalScenes.forEach((scene, i) => {
      if (i === 0) {
        gsap.set(scene, { autoAlpha: 1 });
        tl.to(scene, { autoAlpha: 1, duration: 0.01 }, 5.0);
        tl.to(scene, { autoAlpha: 0, duration: 0.6 }, 6.3);
      } else {
        gsap.set(scene, { autoAlpha: 0 });
        const t = originalSceneStarts[i] ?? i + 5.3;
        tl.to(originalScenes[i - 1], { autoAlpha: 0, duration: 0.6 }, t - 0.3)
          .to(scene, { autoAlpha: 1, duration: 0.6 }, t - 0.3);
      }
    });

    // Scene 2: Shutter
    tl.to(".shutter-left", { xPercent: -100, duration: 1.2, ease: "power3.inOut" }, 5.3)
      .to(".shutter-right", { xPercent: 100, duration: 1.2, ease: "power3.inOut" }, 5.3)
      .to(".shutter-logo-left", { x: -80, opacity: 0, duration: 0.8, ease: "power2.in" }, 5.3)
      .to(".shutter-logo-right", { x: 80, opacity: 0, duration: 0.8, ease: "power2.in" }, 5.3);

    // Scene 4: Sunrise (Now starts at 6.6)
    tl.fromTo(".sun", { y: 240, scale: 0.85 }, { y: 0, scale: 1, duration: 1 }, 6.6)
      .to(".fog", { opacity: 0, duration: 1 }, 6.6)
      .from(".hero-title .word", { yPercent: 110, stagger: 0.15, duration: 1 }, 6.8)
      .from(".hero-sub", { opacity: 0, y: 20, duration: 1 }, 7.1);

    // Scene 5: Paw Trail (Now starts at 8.0)
    tl.from(".paw", { opacity: 0, scale: 0, stagger: 0.08, duration: 0.8, ease: "back.out(2)" }, 8.0)
      .from(".scene-2-title", { y: 40, opacity: 0, duration: 1 }, 8.2);

    // Scene 6: Birds (Now starts at 9.4)
    tl.from(".bird", { x: -100, y: 200, opacity: 0, rotate: -20, stagger: { each: 0.06, from: "random" }, duration: 1.2, ease: "power2.out" }, 9.4)
      .to(".bird", { x: (i) => 200 + i * 40, y: (i) => -120 - (i % 3) * 30, rotate: 5, stagger: { each: 0.04, from: "random" }, duration: 1.5, ease: "power1.in" }, 9.7)
      .from(".scene-3-title", { y: 40, opacity: 0, duration: 1 }, 9.6);

    // Scene 7: Cat (Now starts at 10.8)
    tl.from(".sunbeam", { opacity: 0, scaleY: 0, transformOrigin: "top center", duration: 1 }, 10.8)
      .from(".scene-4-title", { y: 40, opacity: 0, duration: 1 }, 11.0);

    // Scene 8: Final CTA (Now starts at 12.2)
    tl.from(".final-title .word", { yPercent: 110, stagger: 0.12, duration: 1 }, 12.2)
      .from(".final-cta", { opacity: 0, y: 20, duration: 0.8 }, 12.5)
      .from(".paw-heart", { scale: 0, rotate: -30, duration: 1, ease: "back.out(2)" }, 12.3);

    // Continuous animations
    gsap.to(".feather", {
      y: "-=40", rotate: "+=20", duration: 4, ease: "sine.inOut",
      repeat: -1, yoyo: true, stagger: { each: 0.5, from: "random" },
    });
    gsap.to(".wing", {
      scaleY: 0.35, transformOrigin: "center bottom", duration: 0.25,
      repeat: -1, yoyo: true, ease: "sine.inOut", stagger: { each: 0.03, from: "random" },
    });
    gsap.to(".progress-fill", {
      scaleX: 1, ease: "none",
      scrollTrigger: {
        trigger: root.current,
        start: "top top",
        end: () => `+=${total * 100}%`,
        scrub: true,
      },
    });

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [isLoaded, images]);

  return (
    <div ref={root} className="cinematic-hero relative h-screen w-full overflow-hidden bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-sans">
      
      {/* ─── PRELOADER SCREEN ──────────────────────────────────────────────── */}
      {!isLoaded && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-500">
          <div className="flex flex-col items-center max-w-md w-full px-8 text-center">
            <WolfLogo className="h-44 w-44 sm:h-48 sm:w-48 text-primary shrink-0 animate-pulse mb-8 drop-shadow-[0_0_35px_rgba(244,162,97,0.4)]" />
            <span className="text-2xl sm:text-3xl lg:text-4xl font-display font-extrabold tracking-[0.4em] uppercase mb-4 text-foreground">
              WOOLF.INDIA
            </span>
            <div className="w-full bg-primary/15 h-[3px] rounded-full overflow-hidden mb-4">
              <div 
                className="bg-primary h-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(244,162,97,0.6)]" 
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-foreground/50">
              PRELOADING EXPERIENCE &bull; {loadingProgress}%
            </span>
          </div>
        </div>
      )}

      {/* ─── SCENE 1: Keyboard sequence canvas ──────────────────────────────── */}
      <div className="keyboard-sequence-container scene absolute inset-0 z-50 overflow-hidden bg-background select-none">
        
        {/* Full-screen Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover z-0" />

        {/* Cinematic Vignette Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.85)_100%)] pointer-events-none z-10" />

        {/* Scroll cues & Branding */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4">
          <WolfLogo className="h-14 w-14 sm:h-16 sm:w-16 text-primary shrink-0" />
          <span className="text-lg sm:text-2xl lg:text-3xl font-extrabold tracking-[0.3em] uppercase">
            WOOLF.INDIA<sup className="text-[10px] font-normal ml-0.5">TM</sup>
          </span>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 text-[9px] font-mono tracking-[0.3em] uppercase text-foreground/40 flex items-center gap-2">
          <span>Scroll down to disassemble</span>
        </div>

        {/* Synchronized Typography Overlays */}
        <div className="absolute inset-0 z-20 flex items-center justify-center px-6 pointer-events-none text-center">
          
          <div id="sequence-text-1" className="absolute opacity-0 max-w-3xl">
            <span className="text-[10px] font-mono tracking-[0.3em] text-[var(--color-accent)] uppercase mb-3 block">
              Chapter I — Companionship
            </span>
            <h2 className="font-display font-light text-foreground tracking-tight leading-[1.05] text-[clamp(36px,5vw,72px)]">
              Every paw has <span className="italic font-normal">a story</span>.
            </h2>
            <p className="text-foreground/60 text-sm md:text-base mt-6 font-medium max-w-lg mx-auto">
              We redefine pet companionship, bringing healthy, verified, and loving friends to homes across India.
            </p>
          </div>

          <div id="sequence-text-2" className="absolute opacity-0 max-w-3xl">
            <span className="text-[10px] font-mono tracking-[0.3em] text-[var(--color-accent)] uppercase mb-3 block">
              Chapter II — Trust & Care
            </span>
            <h2 className="font-display font-light text-foreground tracking-tight leading-[1.05] text-[clamp(36px,5vw,72px)]">
              Uncompromising <span className="italic font-normal">standards</span>.
            </h2>
            <p className="text-foreground/60 text-sm md:text-base mt-6 font-medium max-w-lg mx-auto">
              Every companion is health-checked, fully vaccinated, and hand-raised to ensure absolute peace of mind.
            </p>
          </div>

          <div id="sequence-text-3" className="absolute opacity-0 max-w-3xl">
            <span className="text-[10px] font-mono tracking-[0.3em] text-[var(--color-accent)] uppercase mb-3 block">
              Chapter III — Nurturing Bonds
            </span>
            <h2 className="font-display font-light text-foreground tracking-tight leading-[1.05] text-[clamp(36px,5vw,72px)]">
              Beautiful <span className="italic font-normal">connections</span>.
            </h2>
            <p className="text-foreground/60 text-sm md:text-base mt-6 font-medium max-w-lg mx-auto">
              Nurturing deeper bonds through gentle, positive training designed to integrate pets and families effortlessly.
            </p>
          </div>

          <div id="sequence-text-4" className="absolute opacity-0 max-w-3xl">
            <span className="text-[10px] font-mono tracking-[0.3em] text-[var(--color-accent)] uppercase mb-3 block">
              Chapter IV — The Journey
            </span>
            <h2 className="font-display font-light text-foreground tracking-tight leading-[1.05] text-[clamp(36px,5vw,72px)]">
              Meet your <span className="italic font-normal">next best friend</span>.
            </h2>
            <p className="text-foreground/60 text-sm md:text-base mt-6 font-medium max-w-lg mx-auto">
              Welcome to India's premium pet marketplace. Scroll down to explore available pets and start your journey.
            </p>
          </div>

        </div>

      </div>

      {/* ─── SCENE 2 — Shutter opens ────────────────────────────────────────── */}
      <div className="scene-shutter scene absolute inset-0 z-35 overflow-hidden pointer-events-none" style={{ opacity: 0 }}>
        <div className="shutter-left absolute inset-y-0 left-0 w-1/2 bg-card flex items-center justify-end overflow-hidden border-r border-border/20">
          <div className="shutter-logo-left flex items-center gap-4 md:gap-8 mr-[-1px]">
            <span className="font-display text-4xl md:text-7xl lg:text-8xl font-extrabold text-foreground tracking-tight select-none">
              WOOLF
            </span>
            <div className="h-24 w-12 md:h-40 md:w-20 lg:h-48 lg:w-24 shrink-0">
              <WolfLogo
                viewBox="0 0 100 220"
                preserveAspectRatio="xMaxYMid meet"
                className="h-full w-full text-primary"
              />
            </div>
          </div>
        </div>
        
        <div className="shutter-right absolute inset-y-0 right-0 w-1/2 bg-card/90 flex items-center justify-start overflow-hidden border-l border-border/20">
          <div className="shutter-logo-right flex items-center gap-4 md:gap-8 ml-[-1px]">
            <div className="h-24 w-12 md:h-40 md:w-20 lg:h-48 lg:w-24 shrink-0">
              <WolfLogo
                viewBox="100 0 100 220"
                preserveAspectRatio="xMinYMid meet"
                className="h-full w-full text-primary"
              />
            </div>
            <span className="font-display text-4xl md:text-7xl lg:text-8xl font-extrabold text-foreground tracking-tight select-none">
              INDIA
            </span>
          </div>
        </div>
      </div>



      {/* ─── SCENE 4 — Sunrise ──────────────────────────────────────────────── */}
      <div className="scene-sunrise scene absolute inset-0 flex flex-col items-center justify-center px-6 z-30" style={{ opacity: 0 }}>
        <div className="sun absolute top-[18%] h-56 w-56 rounded-full bg-[var(--color-accent)] blur-[2px] shadow-[0_0_120px_60px_color-mix(in_oklab,var(--color-accent)_40%,transparent)]" />
        <div className="fog absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(18,18,18,0.9)_70%)]" />
        <svg className="absolute bottom-0 w-full h-[40%]" viewBox="0 0 1200 400" preserveAspectRatio="none">
          <path d="M0 300 Q 300 180 600 250 T 1200 220 L1200 400 L0 400 Z" fill="rgba(38, 70, 83, 0.2)" />
          <path d="M0 340 Q 250 240 550 300 T 1200 290 L1200 400 L0 400 Z" fill="rgba(38, 70, 83, 0.4)" />
        </svg>
        <div className="relative z-10 text-center max-w-4xl">
          <h1 className="hero-title font-display text-6xl md:text-8xl lg:text-9xl leading-[0.95] text-foreground">
            <span className="inline-block overflow-hidden"><span className="word inline-block">Where</span></span>{" "}
            <span className="inline-block overflow-hidden"><span className="word inline-block italic text-[var(--color-accent)]">pets</span></span>{" "}
            <span className="inline-block overflow-hidden"><span className="word inline-block">find</span></span>{" "}
            <span className="inline-block overflow-hidden"><span className="word inline-block">family.</span></span>
          </h1>
          <p className="hero-sub mt-6 text-lg text-muted-foreground">Scroll gently — a small world wakes up.</p>
        </div>
        <ScrollHint />
      </div>

      {/* ─── SCENE 5 — Paw trail ────────────────────────────────────────────── */}
      <div className="scene-paw scene absolute inset-0 flex flex-col items-center justify-center px-6 z-30" style={{ opacity: 0 }}>
        <div className="absolute inset-x-0 bottom-[28%] flex items-center justify-center gap-8 flex-wrap max-w-5xl mx-auto px-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <PawPrint key={i} className="paw" style={{ transform: `rotate(${i % 2 ? 12 : -12}deg) translateY(${i % 2 ? 12 : 0}px)`, width: 44 }} />
          ))}
        </div>
        <div className="scene-2-title relative z-10 text-center max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-accent)] mb-3">Every paw, a story</p>
          <h2 className="font-display text-5xl md:text-7xl text-foreground">
            They arrive on <em className="text-[var(--color-accent)]">soft little feet</em>.
          </h2>
        </div>
      </div>

      {/* ─── SCENE 6 — Birds in flight ──────────────────────────────────────── */}
      <div className="scene-birds scene absolute inset-0 flex flex-col items-center justify-center px-6 z-30" style={{ opacity: 0 }}>
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 14 }).map((_, i) => (
            <Bird key={i} className="bird absolute" style={{ top: `${20 + (i * 13) % 60}%`, left: `${10 + (i * 17) % 70}%`, width: 36 + (i % 4) * 6 }} />
          ))}
        </div>
        <div className="scene-3-title relative z-10 text-center max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-accent)] mb-3">Wings & whispers</p>
          <h2 className="font-display text-5xl md:text-7xl text-foreground">
            A flock takes <em className="text-[var(--color-accent)]">flight</em> with you.
          </h2>
        </div>
      </div>

      {/* ─── SCENE 7 — Cat in sunbeam ───────────────────────────────────────── */}
      <div className="scene-cat scene absolute inset-0 flex flex-col items-center justify-center px-6 z-30" style={{ opacity: 0 }}>
        <div className="sunbeam absolute top-0 right-[18%] w-64 h-full bg-gradient-to-b from-[var(--color-accent)]/20 via-[var(--color-accent)]/5 to-transparent blur-2xl" />
        <div className="scene-4-title relative z-10 text-center max-w-3xl mr-auto ml-[8%]">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-accent)] mb-3">Quiet companions</p>
          <h2 className="font-display text-5xl md:text-7xl text-foreground max-w-lg">
            Slow mornings, <em className="text-[var(--color-accent)]">warm laps</em>.
          </h2>
        </div>
      </div>

      {/* ─── SCENE 8 — Final CTA ────────────────────────────────────────────── */}
      <div className="scene-cta scene absolute inset-0 flex flex-col items-center justify-center px-6 text-center z-30" style={{ opacity: 0 }}>
        <PawHeart className="paw-heart w-24 mb-6 text-[var(--color-accent)]" />
        <h2 className="final-title font-display text-6xl md:text-8xl text-foreground max-w-4xl leading-[0.95]">
          <span className="inline-block overflow-hidden"><span className="word inline-block">Your</span></span>{" "}
          <span className="inline-block overflow-hidden"><span className="word inline-block italic text-[var(--color-accent)]">companion</span></span>{" "}
          <span className="inline-block overflow-hidden"><span className="word inline-block">is</span></span>{" "}
          <span className="inline-block overflow-hidden"><span className="word inline-block">waiting.</span></span>
        </h2>
        <div className="final-cta mt-10 flex flex-wrap gap-4 justify-center">
          <Link to="/pets" className="rounded-full bg-primary text-primary-foreground px-8 py-4 hover:opacity-90 transition font-semibold">
            Meet the pets
          </Link>
          <Link to="/pets" className="rounded-full border border-border bg-card/40 backdrop-blur-md px-8 py-4 hover:bg-card/70 transition text-foreground">
            Adopt a friend
          </Link>
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 h-1 w-48 rounded-full bg-primary/10 overflow-hidden z-40">
        <div className="progress-fill h-full w-full origin-left scale-x-0 bg-primary" />
      </div>

      {/* Skip Intro Button */}
      <button
        onClick={handleSkip}
        className={`fixed bottom-10 right-6 md:right-10 z-[60] px-6 py-3 rounded-full glass text-xs sm:text-sm font-bold tracking-wider text-foreground hover:bg-primary hover:text-primary-foreground hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg cursor-pointer ${
          showSkip ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        Skip Intro
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Sub-components & Silhouettes
═══════════════════════════════════════════════════════════════════════════ */

function ScrollHint() {
  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-xs uppercase tracking-[0.3em] text-gray-500">
      <span>Scroll</span>
      <div className="h-10 w-[1px] bg-gray-500 animate-pulse" />
    </div>
  );
}

function PawPrint(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" className="text-[var(--color-accent)]" {...props}>
      <ellipse cx="32" cy="42" rx="14" ry="12" />
      <ellipse cx="14" cy="28" rx="6" ry="8" />
      <ellipse cx="50" cy="28" rx="6" ry="8" />
      <ellipse cx="22" cy="14" rx="5" ry="7" />
      <ellipse cx="42" cy="14" rx="5" ry="7" />
    </svg>
  );
}

function PawHeart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" {...props}>
      <path d="M50 85 C 20 65, 10 45, 25 32 C 35 24, 45 30, 50 40 C 55 30, 65 24, 75 32 C 90 45, 80 65, 50 85 Z" />
      <circle cx="30" cy="22" r="6" />
      <circle cx="45" cy="14" r="6" />
      <circle cx="60" cy="14" r="6" />
      <circle cx="75" cy="22" r="6" />
    </svg>
  );
}

function Feather({ style, className }: { style?: React.CSSProperties; className?: string }) {
  return (
    <svg viewBox="0 0 24 64" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2 C 4 18, 4 42, 12 62" className="text-white/20" />
      <path d="M12 10 Q 4 16, 6 22" className="text-white/20" />
      <path d="M12 18 Q 4 24, 6 30" className="text-white/20" />
      <path d="M12 26 Q 4 32, 6 38" className="text-white/20" />
      <path d="M12 10 Q 20 16, 18 22" className="text-white/20" />
      <path d="M12 18 Q 20 24, 18 30" className="text-white/20" />
      <path d="M12 26 Q 20 32, 18 38" className="text-white/20" />
    </svg>
  );
}

function Bird({ style, className }: { style?: React.CSSProperties; className?: string }) {
  return (
    <svg viewBox="0 0 64 32" className={className} style={style} fill="currentColor">
      <g className="text-[var(--color-accent)]">
        <path className="wing" d="M2 16 Q 16 0, 32 16 Q 16 8, 2 16 Z" />
        <path className="wing" d="M62 16 Q 48 0, 32 16 Q 48 8, 62 16 Z" />
      </g>
    </svg>
  );
}





function Wolf({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={className} fill="currentColor">
      <g>
        <path d="M20 110 Q 30 80, 70 78 L 130 78 Q 170 80, 180 110 L 175 130 L 150 128 L 145 140 L 130 138 L 125 128 L 75 128 L 70 140 L 55 138 L 50 128 L 25 130 Z" />
        <path d="M150 80 L 175 55 L 180 70 L 188 60 L 188 85 L 175 95 Z" />
        <path d="M170 60 L 175 45 L 180 60 Z" />
        <path d="M180 58 L 185 45 L 188 60 Z" />
        <circle cx="178" cy="75" r="1.8" fill="var(--color-primary)" />
        <path d="M22 100 Q 5 90, 12 70 Q 18 80, 28 92" />
      </g>
    </svg>
  );
}

function CatSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 180" className={className} fill="currentColor">
      <g>
        <path d="M70 60 L 60 30 L 85 50 L 115 50 L 140 30 L 130 60 Q 160 80, 160 130 L 150 160 L 130 160 L 128 140 L 72 140 L 70 160 L 50 160 L 40 130 Q 40 80, 70 60 Z" />
        <path d="M158 140 Q 185 130, 180 95 Q 175 110, 165 120" />
      </g>
    </svg>
  );
}

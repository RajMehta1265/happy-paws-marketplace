import { useEffect, useLayoutEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { WolfLogo } from "@/components/ui/WolfLogo";

gsap.registerPlugin(ScrollTrigger);

export function CinematicHero() {
  const root = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoEnded = () => {
    if (typeof window !== "undefined" && window.scrollY < window.innerHeight * 0.5) {
      const targetScrollY = window.innerHeight * 6.6;
      const lenis = (window as any).lenis;
      if (lenis) {
        lenis.start();
        lenis.scrollTo(targetScrollY, {
          duration: 2.2,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        });
      } else {
        window.scrollTo({
          top: targetScrollY,
          behavior: "smooth",
        });
      }
    }
  };

  const handleSkipIntro = () => {
    if (typeof window !== "undefined") {
      const targetScrollY = window.innerHeight * 10.7; // Directly past scrollytelling
      const lenis = (window as any).lenis;
      if (lenis) {
        lenis.start();
        lenis.scrollTo(targetScrollY, {
          duration: 1.5,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        });
      } else {
        window.scrollTo({
          top: targetScrollY,
          behavior: "smooth",
        });
      }
    }
  };

  const handleScrollDown = () => {
    if (typeof window !== "undefined") {
      const targetScrollY = window.innerHeight * 8.0; // Next scene (Paw Trail)
      const lenis = (window as any).lenis;
      if (lenis) {
        lenis.start();
        lenis.scrollTo(targetScrollY, {
          duration: 1.5,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        });
      } else {
        window.scrollTo({
          top: targetScrollY,
          behavior: "smooth",
        });
      }
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
      window.scrollTo(0, 0);
      
      // Lock scrolling initially during the video
      const lenis = (window as any).lenis;
      if (lenis) {
        lenis.scrollTo(0, { immediate: true });
        lenis.stop();
      } else {
        let attempts = 0;
        const interval = setInterval(() => {
          const l = (window as any).lenis;
          if (l) {
            l.scrollTo(0, { immediate: true });
            l.stop();
            clearInterval(interval);
          }
          attempts++;
          if (attempts > 50) clearInterval(interval);
        }, 50);
      }
    }
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play().catch((err) => {
        console.error("Video autoplay failed:", err);
        // Fallback: unlock scroll if video cannot autoplay
        const lenis = (window as any).lenis;
        if (lenis) {
          lenis.start();
        }
      });
    }
  }, []);

  // Setup ScrollTrigger
  useLayoutEffect(() => {
    if (!root.current) return;

    const scenes = gsap.utils.toArray<HTMLElement>(".scene");
    const total = 10.7; // Scroll height budget in viewports

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: root.current,
        start: "top top",
        end: () => `+=${total * 100}%`,
        scrub: true,
        pin: true,
        anticipatePin: 1,
      },
    });

    // ─── SCENE 1: Background video timeline (0.0 to 5.0) ───────────
    tl.to(".keyboard-sequence-container", { autoAlpha: 0, duration: 0.8 }, 4.7);

    // ─── ORIGINAL SCENES (Scene 2 to 5) ──────────────────────────────────
    const originalSceneStarts = [5.3, 6.6, 8.0, 9.4];
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

    // Scene 8: Final CTA (Now starts at 9.4)
    tl.from(".final-title .word", { yPercent: 110, stagger: 0.12, duration: 1 }, 9.4)
      .from(".final-cta", { opacity: 0, y: 20, duration: 0.8 }, 9.7)
      .from(".paw-heart", { scale: 0, rotate: -30, duration: 1, ease: "back.out(2)" }, 9.5);

    // Continuous animations
    if (document.querySelector(".feather")) {
      gsap.to(".feather", {
        y: "-=40", rotate: "+=20", duration: 4, ease: "sine.inOut",
        repeat: -1, yoyo: true, stagger: { each: 0.5, from: "random" },
      });
    }

    gsap.to(".progress-fill", {
      scaleX: 1, ease: "none",
      scrollTrigger: {
        trigger: root.current,
        start: "top top",
        end: () => `+=${total * 100}%`,
        scrub: true,
      },
    });

  }, []);

  return (
    <div ref={root} className="cinematic-hero relative h-screen w-full overflow-hidden bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-sans">
      
      {/* ─── SCENE 1: Background video container ─────────────────────────────── */}
      <div className="keyboard-sequence-container scene absolute inset-0 z-50 overflow-hidden bg-background select-none">
        
        {/* Background Howling Wolf Video */}
        <video
          ref={videoRef}
          src="/Woolf Howling.mp4"
          autoPlay
          muted
          playsInline
          onEnded={handleVideoEnded}
          onError={handleVideoEnded}
          className="absolute inset-0 w-full h-full object-cover z-0"
        />

        {/* Cinematic Vignette Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.85)_100%)] pointer-events-none z-10" />

        {/* Scroll cues & Branding */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4">
          <WolfLogo className="h-14 w-14 sm:h-16 sm:w-16 text-primary shrink-0" />
          <span className="text-lg sm:text-2xl lg:text-3xl font-extrabold tracking-[0.3em] uppercase">
            WOOLF.INDIA<sup className="text-[10px] font-normal ml-0.5">TM</sup>
          </span>
        </div>
      </div>

      {/* ─── SCENE 2 ─ Shutter opens ────────────────────────────────────────── */}
      <div className="scene-shutter scene absolute inset-0 z-35 overflow-hidden pointer-events-none" style={{ opacity: 0 }}>
        <div className="shutter-left absolute inset-y-0 left-0 w-1/2 bg-card flex items-center justify-end overflow-hidden border-r border-border/20">
          <div className="shutter-logo-left flex items-center gap-3 sm:gap-4 md:gap-8 mr-[-1px]">
            <span className="font-display text-3xl sm:text-4xl md:text-7xl lg:text-8xl font-extrabold text-foreground tracking-tight select-none">
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
          <div className="shutter-logo-right flex items-center gap-3 sm:gap-4 md:gap-8 ml-[-1px]">
            <div className="h-24 w-12 md:h-40 md:w-20 lg:h-48 lg:w-24 shrink-0">
              <WolfLogo
                viewBox="100 0 100 220"
                preserveAspectRatio="xMinYMid meet"
                className="h-full w-full text-primary"
              />
            </div>
            <span className="font-display text-3xl sm:text-4xl md:text-7xl lg:text-8xl font-extrabold text-foreground tracking-tight select-none">
              INDIA
            </span>
          </div>
        </div>
      </div>

      {/* ─── SCENE 3 ─ Sunrise ──────────────────────────────────────────────── */}
      <div className="scene-sunrise scene absolute inset-0 flex flex-col items-center justify-center px-6 z-30" style={{ opacity: 0 }}>
        <div className="sun absolute top-[18%] h-56 w-56 rounded-full bg-[var(--color-accent)] blur-[2px] shadow-[0_0_120px_60px_color-mix(in_oklab,var(--color-accent)_40%,transparent)]" />
        <div className="fog absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(18,18,18,0.9)_70%)]" />
        <svg className="absolute bottom-0 w-full h-[40%]" viewBox="0 0 1200 400" preserveAspectRatio="none">
          <path d="M0 300 Q 300 180 600 250 T 1200 220 L1200 400 L0 400 Z" fill="rgba(38, 70, 83, 0.2)" />
          <path d="M0 340 Q 250 240 550 300 T 1200 290 L1200 400 L0 400 Z" fill="rgba(38, 70, 83, 0.4)" />
        </svg>
        <div className="relative z-10 text-center max-w-4xl -translate-y-16">
          <h1 className="hero-title font-display text-4xl sm:text-6xl md:text-8xl lg:text-9xl leading-[1.15] text-foreground">
            <span className="inline-block overflow-hidden pb-4 -mb-4"><span className="word inline-block">Where</span></span>{" "}
            <span className="inline-block overflow-hidden pb-4 -mb-4"><span className="word inline-block italic text-foreground drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] drop-shadow-[0_8px_24px_rgba(0,0,0,0.95)] drop-shadow-[0_16px_32px_rgba(0,0,0,0.95)]">pets</span></span>{" "}
            <span className="inline-block overflow-hidden pb-4 -mb-4"><span className="word inline-block">find</span></span>{" "}
            <span className="inline-block overflow-hidden pb-4 -mb-4"><span className="word inline-block">family.</span></span>
          </h1>
          <p className="hero-sub mt-6 text-base sm:text-lg text-muted-foreground">Scroll gently — a small world wakes up.</p>
        </div>
        
        {/* Scroll Cue exactly in center */}
        <ScrollHint onClick={handleScrollDown} />

        {/* Skip Button */}
        <button
          onClick={handleSkipIntro}
          className="skip-intro-btn absolute bottom-12 left-1/2 -translate-x-1/2 z-40 rounded-full border border-foreground/20 bg-background/30 backdrop-blur-md px-6 py-3 text-[10px] font-mono tracking-[0.2em] uppercase text-foreground hover:bg-background/60 hover:border-foreground/40 transition duration-300 pointer-events-auto cursor-pointer"
        >
          Skip
        </button>
      </div>

      {/* ─── SCENE 4 ─ Paw trail ────────────────────────────────────────────── */}
      <div className="scene-paw scene absolute inset-0 flex flex-col items-center justify-center px-6 z-30" style={{ opacity: 0 }}>
        <div className="absolute inset-x-0 bottom-[28%] flex items-center justify-center gap-8 flex-wrap max-w-5xl mx-auto px-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <PawPrint key={i} className="paw" style={{ transform: `rotate(${i % 2 ? 12 : -12}deg) translateY(${i % 2 ? 12 : 0}px)`, width: 44 }} />
          ))}
        </div>
        <div className="scene-2-title relative z-10 text-center max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-accent)] mb-3">Every paw, a story</p>
          <h2 className="font-display text-2xl sm:text-4xl md:text-6xl text-foreground">
            They arrive on <em className="text-[var(--color-accent)]">soft little feet</em>.
          </h2>
        </div>
      </div>

      {/* ─── SCENE 5 ─ Final CTA ────────────────────────────────────────────── */}
      <div className="scene-cta scene absolute inset-0 flex flex-col items-center justify-center px-6 text-center z-30" style={{ opacity: 0 }}>
        <PawHeart className="paw-heart w-24 mb-6 text-[var(--color-accent)]" />
        <h2 className="final-title font-display text-3xl sm:text-5xl md:text-7xl text-foreground max-w-4xl leading-[1.15]">
          <span className="inline-block overflow-hidden pb-4 -mb-4"><span className="word inline-block">Your</span></span>{" "}
          <span className="inline-block overflow-hidden pb-4 -mb-4"><span className="word inline-block italic text-[var(--color-accent)]">companion</span></span>{" "}
          <span className="inline-block overflow-hidden pb-4 -mb-4"><span className="word inline-block">is</span></span>{" "}
          <span className="inline-block overflow-hidden pb-4 -mb-4"><span className="word inline-block">waiting.</span></span>
        </h2>
        <div className="final-cta mt-10 flex flex-wrap gap-4 justify-center">
          <Link to="/pets" className="rounded-full bg-primary text-primary-foreground px-8 py-4 hover:opacity-90 transition font-semibold text-sm sm:text-base">
            Meet the pets
          </Link>
          <Link to="/pets" className="rounded-full border border-border bg-card/40 backdrop-blur-md px-8 py-4 hover:bg-card/70 transition text-foreground text-sm sm:text-base">
            Adopt a friend
          </Link>
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 h-1 w-48 rounded-full bg-primary/10 overflow-hidden z-40">
        <div className="progress-fill h-full w-full origin-left scale-x-0 bg-primary" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Sub-components & Silhouettes
   ═══════════════════════════════════════════════════════════════════════════ */

function ScrollHint({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-3 text-xs uppercase tracking-[0.3em] text-foreground/60 hover:text-foreground transition-all duration-300 pointer-events-auto cursor-pointer focus:outline-none bg-transparent border-none mt-28 sm:mt-32"
    >
      <span>Scroll down</span>
      <div className="w-7 h-11 rounded-full border-2 border-foreground/30 flex justify-center p-1 hover:border-foreground/60 transition-colors">
        <div className="w-1.5 h-2.5 bg-foreground/60 rounded-full animate-bounce" />
      </div>
    </button>
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

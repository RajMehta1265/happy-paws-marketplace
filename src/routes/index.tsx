import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { FiArrowRight, FiHeart, FiShield, FiAward, FiCheck, FiChevronRight } from "react-icons/fi";
import { SiteLayout } from "@/components/site/SiteLayout";
import { products, testimonials, trainingPlans } from "@/data/sample";
import { HeroSlider } from "@/components/site/HeroSlider";
import { dbService, parseImages } from "@/services/db-service";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { data: pets, isLoading } = useQuery({
    queryKey: ["pets"],
    queryFn: () => dbService.getPets(),
    initialData: () => dbService.initLocalData(),
    staleTime: 0,
  });

  const featuredPets = (pets ?? []).filter((p) => p.type.toLowerCase() !== "exotic").slice(0, 4);

  // GSAP Ref Containers
  const heroRef = useRef<HTMLDivElement>(null);
  const heroHeadingRef = useRef<HTMLHeadingElement>(null);
  const heroSubRef = useRef<HTMLParagraphElement>(null);
  const heroCtaRef = useRef<HTMLDivElement>(null);
  const heroVisualsRef = useRef<HTMLDivElement>(null);

  const expandSectionRef = useRef<HTMLDivElement>(null);
  const expandImageRef = useRef<HTMLDivElement>(null);
  const expandWrapperRef = useRef<HTMLDivElement>(null);

  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorTextRef = useRef<HTMLSpanElement>(null);

  const [hoverText, setHoverText] = useState("");

  useEffect(() => {
    // 1. Lenis Smooth Scroll Initialisation
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // smooth inertia easeOutExpo
      touchMultiplier: 2,
    });

    lenis.on("scroll", ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    // 2. Custom Trailing Cursor Logic (GSAP)
    const cursor = cursorRef.current;
    if (cursor) {
      gsap.set(cursor, { xPercent: -50, yPercent: -50 });

      const onMouseMove = (e: MouseEvent) => {
        gsap.to(cursor, {
          x: e.clientX,
          y: e.clientY,
          duration: 0.35,
          ease: "power2.out",
        });
      };

      window.addEventListener("mousemove", onMouseMove);

      // Bind interactive hovers dynamically
      const handleHoverEnter = (e: MouseEvent) => {
        const target = e.currentTarget as HTMLElement;
        const text = target.getAttribute("data-hover-text") || "VIEW";
        setHoverText(text);

        gsap.to(cursor, {
          scale: 2.2,
          backgroundColor: "rgba(216, 178, 115, 0.12)",
          borderColor: "#D8B273",
          duration: 0.3,
        });
        if (cursorTextRef.current) {
          gsap.to(cursorTextRef.current, { opacity: 1, duration: 0.2 });
        }
      };

      const handleHoverLeave = () => {
        gsap.to(cursor, {
          scale: 1,
          backgroundColor: "transparent",
          borderColor: "rgba(216, 178, 115, 0.4)",
          duration: 0.3,
        });
        if (cursorTextRef.current) {
          gsap.to(cursorTextRef.current, { opacity: 0, duration: 0.2 });
        }
      };

      const bindHovers = () => {
        const interactives = document.querySelectorAll(".interactive-hover");
        interactives.forEach((el) => {
          el.addEventListener("mouseenter", handleHoverEnter as any);
          el.addEventListener("mouseleave", handleHoverLeave as any);
        });
      };

      // Slight timeout to ensure DOM finishes mounting
      setTimeout(bindHovers, 150);

      // Clean up mousemove
      return () => {
        window.removeEventListener("mousemove", onMouseMove);
        lenis.destroy();
      };
    }

    return () => lenis.destroy();
  }, []);

  useEffect(() => {
    // 3. GSAP & ScrollTrigger Animations
    gsap.registerPlugin(ScrollTrigger);

    // Initial page load reveals (Hero Section)
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    if (heroHeadingRef.current) {
      tl.fromTo(
        heroHeadingRef.current.querySelectorAll(".reveal-word"),
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2, stagger: 0.1, delay: 0.2 },
      );
    }

    if (heroSubRef.current) {
      tl.fromTo(
        heroSubRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 1 },
        "-=0.8",
      );
    }

    if (heroCtaRef.current) {
      tl.fromTo(
        heroCtaRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.8 },
        "-=0.7",
      );
    }

    if (heroVisualsRef.current) {
      tl.fromTo(
        heroVisualsRef.current,
        { opacity: 0, scale: 0.96 },
        { opacity: 1, scale: 1, duration: 1.5 },
        "-=1.2",
      );
    }

    // Drifting orbs scroll parallax trigger
    const orbs = document.querySelectorAll(".parallax-orb");
    orbs.forEach((orb, i) => {
      gsap.to(orb, {
        yPercent: (i + 1) * 35,
        ease: "none",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    });

    // Image Expansion Trigger: scales from bordered box layout to full width
    if (expandSectionRef.current && expandWrapperRef.current && expandImageRef.current) {
      gsap.fromTo(
        expandWrapperRef.current,
        { width: "80vw", borderRadius: "3rem" },
        {
          width: "100vw",
          borderRadius: "0rem",
          ease: "none",
          scrollTrigger: {
            trigger: expandSectionRef.current,
            start: "top bottom",
            end: "top top+=100",
            scrub: true,
          },
        },
      );

      gsap.fromTo(
        expandImageRef.current,
        { scale: 1.2 },
        {
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: expandSectionRef.current,
            start: "top bottom",
            end: "top top+=100",
            scrub: true,
          },
        },
      );
    }

    // Scroll reveal fade-ins for grid sections
    const scrollSections = document.querySelectorAll(".scroll-reveal-section");
    scrollSections.forEach((sec) => {
      const cards = sec.querySelectorAll(".scroll-reveal-card");
      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { y: 50, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1,
            stagger: 0.12,
            scrollTrigger: {
              trigger: sec,
              start: "top bottom-=80",
              toggleActions: "play none none reverse",
            },
          },
        );
      }
    });

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <SiteLayout>
      {/* GSAP Trailing Custom Cursor Overlay */}
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 w-8 h-8 rounded-full border border-primary/50 pointer-events-none z-50 flex items-center justify-center -translate-x-1/2 -translate-y-1/2 hidden md:flex"
        style={{ transition: "scale 0.2s, background-color 0.2s, border-color 0.2s" }}
      >
        <span
          ref={cursorTextRef}
          className="text-[7px] font-bold uppercase tracking-widest text-primary opacity-0 whitespace-nowrap pointer-events-none"
        >
          {hoverText}
        </span>
      </div>

      {/* Fullscreen Hero Section */}
      <section
        ref={heroRef}
        className="relative overflow-hidden min-h-[92vh] flex items-center justify-center"
      >
        {/* Layered Parallax Background radial glowing orbs (depth) */}
        <div className="absolute top-1/4 left-1/4 w-[35rem] h-[35rem] rounded-full bg-accent/25 blur-[120px] pointer-events-none parallax-orb z-0" />
        <div
          className="absolute top-1/3 right-1/4 w-[30rem] h-[30rem] rounded-full bg-primary/10 blur-[140px] pointer-events-none parallax-orb z-0"
          style={{ animationDelay: "-2s" }}
        />
        <div
          className="absolute bottom-1/4 left-1/3 w-[25rem] h-[25rem] rounded-full bg-accent/20 blur-[100px] pointer-events-none parallax-orb z-0"
          style={{ animationDelay: "-4s" }}
        />

        {/* Ambient floating champagne circles background animation */}
        <div className="absolute inset-0 opacity-20 pointer-events-none z-0 overflow-hidden">
          <div className="absolute h-2 w-2 rounded-full bg-primary top-1/3 left-1/5 animate-pulse" />
          <div className="absolute h-3 w-3 rounded-full bg-accent top-1/2 left-2/3 animate-ping duration-1000" />
          <div className="absolute h-1.5 w-1.5 rounded-full bg-primary bottom-1/3 right-1/4 animate-bounce" />
        </div>

        <div className="mx-auto max-w-7xl px-6 py-12 lg:py-20 grid lg:grid-cols-2 gap-12 items-center relative z-10 w-full">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/60 px-4 py-1.5 text-xs font-semibold text-accent-foreground select-none">
              <FiHeart className="text-primary" /> A warmer home for every paw
            </span>

            <h1
              ref={heroHeadingRef}
              className="mt-6 font-display text-5xl lg:text-7xl leading-[1.05] text-balance tracking-tight overflow-hidden"
            >
              <span className="block overflow-hidden h-[1.1em] py-1">
                <span className="block reveal-word">Where pets find</span>
              </span>
              <span className="block overflow-hidden h-[1.1em] py-1">
                <span className="block reveal-word">
                  <em className="text-primary not-italic font-serif italic">families</em>, and
                </span>
              </span>
              <span className="block overflow-hidden h-[1.1em] py-1">
                <span className="block reveal-word">families find joy.</span>
              </span>
            </h1>

            <p
              ref={heroSubRef}
              className="mt-6 text-lg text-muted-foreground max-w-lg font-medium leading-relaxed"
            >
              WOOLF.INDIA is a gentle marketplace, training studio and care shop — built for people
              who love animals the way you do.
            </p>

            <div ref={heroCtaRef} className="mt-8 flex flex-wrap gap-4 items-center">
              <Link
                to="/pets"
                data-hover-text="GO SHOP"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground hover:opacity-95 transition shadow-lg interactive-hover cursor-pointer"
              >
                Meet the pets <FiArrowRight />
              </Link>
              <Link
                to="/contact"
                data-hover-text="CHAT"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-7 py-3.5 text-sm font-semibold hover:bg-muted transition interactive-hover cursor-pointer"
              >
                Get in touch
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-6 max-w-md border-t border-border/50 pt-8">
              {[
                { k: "2.4k+", v: "Happy homes" },
                { k: "98%", v: "Vaccinated" },
                { k: "120", v: "Rescues / yr" },
              ].map((s) => (
                <div key={s.v}>
                  <div className="font-display text-3xl font-bold text-primary">{s.k}</div>
                  <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-semibold">
                    {s.v}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div ref={heroVisualsRef} className="relative z-10">
            <div className="absolute -inset-6 rounded-[3.5rem] bg-accent/30 blur-3xl" aria-hidden />
            <HeroSlider />
            <div className="absolute -bottom-6 -left-6 bg-background/95 border border-border rounded-2xl p-4 hidden sm:flex items-center gap-3 z-30 shadow-md">
              <FiShield className="text-primary text-2xl" />
              <div>
                <div className="text-sm font-semibold">Health-checked</div>
                <div className="text-xs text-muted-foreground">Every pet, every time</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Image Expansion Cinematic Section (Parallax visual) */}
      <section
        ref={expandSectionRef}
        className="w-full min-h-[60vh] md:min-h-[80vh] flex items-center justify-center overflow-hidden bg-background relative z-20 py-16"
      >
        <div
          ref={expandWrapperRef}
          className="relative aspect-video max-w-full overflow-hidden shadow-2xl flex items-center justify-center w-[80vw] rounded-[3rem] border border-border"
          style={{ transition: "border-radius 0.1s" }}
        >
          {/* Black shade scrim overlay */}
          <div className="absolute inset-0 bg-black/45 z-10" />

          {/* Luxury Real Estate style engaging background image */}
          <div ref={expandImageRef} className="absolute inset-0 w-full h-full">
            <img
              src="https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&q=80&w=1600"
              alt="Cinematic Companion Landscape"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="relative z-20 text-center px-6 max-w-2xl text-white">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-xs font-semibold text-primary-foreground mb-4 uppercase tracking-widest">
              WOOLF.INDIA Ethos
            </span>
            <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-white mb-4 drop-shadow-lg">
              Cinematic Care & Living Spaces
            </h2>
            <p className="text-sm md:text-base text-white/80 font-medium max-w-lg mx-auto drop-shadow">
              We design and construct modern conditioning spaces for companions, ensuring a peaceful
              harmony inside your luxury estate.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Section */}
      <Section
        eyebrow="Featured"
        title="Meet our newest companions"
        subtitle="Hand-raised, health-checked, and waiting to meet you."
        cta={{ to: "/pets", label: "View all pets" }}
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 scroll-reveal-section">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-3xl" />
              ))
            : featuredPets.map((p, i) => (
                <div key={p.id} className="scroll-reveal-card">
                  <Link
                    to="/pets/$petId"
                    params={{ petId: p.id }}
                    data-hover-text="MEET"
                    className="block group interactive-hover cursor-pointer"
                  >
                    <div className="overflow-hidden rounded-3xl bg-card hover-lift border border-border">
                      <div className="overflow-hidden aspect-square relative">
                        <img
                          src={parseImages(p.image_url)[0] || p.image_url || "/pet-1.jpg"}
                          alt={p.name}
                          width={800}
                          height={800}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
                        />
                      </div>
                      <div className="p-5">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-display text-xl font-bold">{p.name}</div>
                            <div className="text-xs text-muted-foreground font-medium mt-0.5">
                              {p.breed} • {p.age}
                            </div>
                          </div>
                          <div className="shrink-0 ml-2">
                            <span className="inline-flex rounded-full bg-accent/20 px-3 py-1.5 text-xs font-semibold text-accent-foreground font-display">
                              ₹{Number(p.price).toFixed(0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
        </div>
      </Section>

      {/* Training Section */}
      <Section
        eyebrow="Training"
        title="Calm, kind, lifelong skills"
        subtitle="Trainers who teach with patience — never punishment."
        cta={{ to: "/training", label: "Explore programs" }}
      >
        <div className="grid md:grid-cols-3 gap-6 scroll-reveal-section">
          {trainingPlans.map((t) => (
            <div
              key={t.id}
              className="rounded-3xl border border-border bg-card p-7 hover-lift scroll-reveal-card"
            >
              <div className="text-xs uppercase tracking-wider text-primary font-bold">
                {t.mode}
              </div>
              <h3 className="mt-2 font-display text-2xl font-bold">{t.title}</h3>
              <div className="mt-1 text-sm text-muted-foreground font-medium">{t.duration}</div>
              <ul className="mt-5 space-y-2 text-sm">
                {t.perks.map((p) => (
                  <li key={p} className="flex gap-2 font-medium">
                    <FiAward className="text-primary mt-0.5 shrink-0" /> {p}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex items-center justify-between">
                <span className="font-display text-2xl font-bold">₹{t.price}</span>
                <Link
                  to="/training"
                  data-hover-text="BOOK"
                  className="text-sm text-primary hover:underline font-semibold flex items-center gap-0.5 interactive-hover cursor-pointer"
                >
                  Book <FiChevronRight />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Products Section */}
      <Section
        eyebrow="Products"
        title="Beautiful things, made for them"
        cta={{ to: "/products", label: "View all products" }}
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 scroll-reveal-section">
          {products.slice(0, 3).map((p) => (
            <div
              key={p.id}
              className="rounded-3xl bg-card overflow-hidden hover-lift border border-border scroll-reveal-card"
            >
              <Link
                to="/products"
                data-hover-text="BUY"
                className="block group interactive-hover cursor-pointer"
              >
                <div className="overflow-hidden aspect-[4/3] w-full">
                  <img
                    src={p.image}
                    alt={p.name}
                    width={800}
                    height={800}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
                  />
                </div>
                <div className="p-5 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground font-semibold">{p.category}</div>
                    <div className="font-display text-lg font-bold mt-0.5">{p.name}</div>
                  </div>
                  <div className="font-display text-xl text-primary font-bold">₹{p.price}</div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </Section>

      {/* Testimonials */}
      <section className="bg-accent/30 py-20 mt-20 relative z-20 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="font-display text-4xl text-center mb-12 font-bold">
            Loved by gentle homes
          </h2>
          <div className="grid md:grid-cols-3 gap-6 scroll-reveal-section">
            {testimonials.map((t) => (
              <blockquote
                key={t.name}
                className="rounded-3xl glass p-7 border border-border/50 scroll-reveal-card"
              >
                <p className="font-display text-xl leading-relaxed italic">“{t.quote}”</p>
                <footer className="mt-4 text-sm text-muted-foreground font-semibold">
                  — {t.name}
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Block */}
      <section className="mx-auto max-w-7xl px-6 my-24 relative z-20">
        <div className="rounded-[2.5rem] bg-primary text-primary-foreground p-12 lg:p-20 text-center relative overflow-hidden shadow-xl">
          {/* Accent radial glow overlay */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] rounded-full bg-accent/20 blur-[100px] pointer-events-none" />

          <div className="relative z-10">
            <h2 className="font-display text-4xl lg:text-5xl text-balance font-bold">
              A pet is waiting to change your life.
            </h2>
            <p className="mt-4 opacity-80 max-w-xl mx-auto font-medium text-sm md:text-base">
              Browse our curated, health-checked pets ready to join your family today.
            </p>
            <Link
              to="/pets"
              data-hover-text="VIEW ALL"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-background text-foreground px-8 py-3.5 hover:opacity-95 transition font-bold shadow-md interactive-hover cursor-pointer"
            >
              Explore Marketplace <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function Section({
  eyebrow,
  title,
  subtitle,
  cta,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  cta?: { to: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20 relative z-20">
      <div className="flex items-end justify-between mb-10 gap-6 flex-wrap border-b border-border/50 pb-6">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-primary font-bold">
            {eyebrow}
          </div>
          <h2 className="mt-2 font-display text-4xl lg:text-5xl text-balance font-bold tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-3 text-muted-foreground max-w-xl font-medium">{subtitle}</p>
          )}
        </div>
        {cta && (
          <Link
            to={cta.to}
            className="text-sm text-primary hover:underline whitespace-nowrap font-bold flex items-center gap-0.5"
          >
            {cta.label} <FiChevronRight />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

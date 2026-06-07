import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { FiArrowRight, FiHeart, FiShield, FiAward, FiCheck, FiChevronRight } from "react-icons/fi";
import { SiteLayout } from "@/components/site/SiteLayout";
import { products, testimonials, trainingPlans } from "@/data/sample";
import { HeroSlider } from "@/components/site/HeroSlider";
import { CinematicHero } from "@/components/site/CinematicHero";
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
    if (heroRef.current && orbs.length > 0) {
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

  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "WOOLF.INDIA",
    "url": "https://woolfindia.com",
    "logo": "https://woolfindia.com/logo.png",
    "description": "India's premium pet marketplace. Find healthy, verified, and loving companions across India with elite training and organic care.",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+91-9999999999",
      "contactType": "customer service"
    }
  };

  return (
    <SiteLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
      />

      {/* Cinematic Pinned Scrollytelling Hero Section */}
      <CinematicHero />



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
                <article key={p.id} className="scroll-reveal-card">
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
                          alt={`Premium companion pet ${p.name} - ${p.breed}`}
                          width={800}
                          height={800}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
                        />
                      </div>
                      <div className="p-7">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-display text-2xl lg:text-3xl font-bold">{p.name}</h3>
                            <p className="text-sm text-muted-foreground font-medium mt-1">
                              {p.breed} • {p.age}
                            </p>
                          </div>
                          <div className="shrink-0 ml-2">
                            <span className="inline-flex rounded-full bg-accent/20 px-4 py-2 text-sm font-semibold text-accent-foreground font-display">
                              ₹{Number(p.price).toFixed(0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </article>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 scroll-reveal-section">
          {/* Basic Obedience Card */}
          <article className="rounded-[2rem] bg-card border border-border/85 p-8 flex flex-col justify-between hover:shadow-lg hover:border-primary/20 transition-all duration-300 scroll-reveal-card">
            <div className="space-y-6">
              <div className="flex justify-between items-start flex-wrap gap-4 border-b border-border/60 pb-5">
                <div>
                  <span className="text-2xl">🦴</span>
                  <h3 className="font-display text-2xl font-bold text-foreground mt-2">Basic Obedience Commands</h3>
                  <p className="text-xs text-muted-foreground mt-1">For puppies and beginners</p>
                </div>
                <div className="text-right">
                  <div className="font-display text-3xl font-bold text-primary">₹15,000</div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">6–8 Sessions</span>
                </div>
              </div>

              {/* Basic Highlights */}
              <div className="grid sm:grid-cols-2 gap-4 text-xs lg:text-sm leading-relaxed">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-bold text-foreground mb-1">🦴 Basic Commands</h4>
                    <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                      <li>Sit, Stay, Come (Recall)</li>
                      <li>Down (Lie Down)</li>
                      <li>Leave it / Drop it</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">🐕‍🦺 Leash Training</h4>
                    <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                      <li>Walking calmly on a leash</li>
                      <li>Not pulling or lunging</li>
                      <li>Direction & pace shifts</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">🧠 Focus & Attention</h4>
                    <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                      <li>Name recognition</li>
                      <li>Eye contact on command</li>
                      <li>Ignore distractions</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-bold text-foreground mb-1">🏡 House Manners</h4>
                    <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                      <li>No jumping on people</li>
                      <li>Waiting at doors</li>
                      <li>No begging during meals</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">💩 Toilet Training</h4>
                    <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                      <li>Crate training guidance</li>
                      <li>Toilet schedule planning</li>
                      <li>Indoor vs outdoor strategies</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">🐶 Socialization & Fixes</h4>
                    <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                      <li>Dog & stranger exposure</li>
                      <li>Nipping & biting fixes</li>
                      <li>Correct household chewing</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/50 pt-4 text-xs text-muted-foreground space-y-0.5">
                <div>🎁 <strong>Included:</strong> Treat advice, practicing calendar, WhatsApp support.</div>
                <div>🗓️ <strong>Format:</strong> 45-60 min sessions at home or training center.</div>
              </div>
            </div>

            <Link
              to="/training"
              className="mt-8 w-full rounded-full bg-primary text-primary-foreground hover:opacity-90 font-bold py-3.5 text-xs text-center transition cursor-pointer shadow-md"
            >
              Book Basic Obedience Package
            </Link>
          </article>

          {/* Advanced Training Card */}
          <article className="rounded-[2rem] bg-card border border-border/85 p-8 flex flex-col justify-between hover:shadow-lg hover:border-primary/20 transition-all duration-300 scroll-reveal-card">
            <div className="space-y-6">
              <div className="flex justify-between items-start flex-wrap gap-4 border-b border-border/60 pb-5">
                <div>
                  <span className="text-2xl">🐕</span>
                  <h3 className="font-display text-2xl font-bold text-foreground mt-2">Advanced Dog Training</h3>
                  <p className="text-xs text-muted-foreground mt-1">Intermediate to Advanced level</p>
                </div>
                <div className="text-right">
                  <div className="font-display text-3xl font-bold text-primary">₹20,000</div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">8–12 Sessions</span>
                </div>
              </div>

              {/* Advanced Highlights */}
              <div className="grid sm:grid-cols-2 gap-4 text-xs lg:text-sm leading-relaxed">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-bold text-foreground mb-1">🐕 Precision Control</h4>
                    <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                      <li>Distance control commands</li>
                      <li>Extended stays + distractions</li>
                      <li>Off-leash command control</li>
                      <li>Heel walking precision</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">🧠 Impulse & Discipline</h4>
                    <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                      <li>Food release waiting release</li>
                      <li>Doorway rush control</li>
                      <li>Calm greeting greetings</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">🐕‍🦺 Leash & Outdoor</h4>
                    <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                      <li>Loose-leash walking</li>
                      <li>Traffic/crowds control</li>
                      <li>Emergency stop & recall</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-bold text-foreground mb-1">🧠 Focus Under Distraction</h4>
                    <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                      <li>Ignoring food & animals</li>
                      <li>Parks/markets obedience</li>
                      <li>Sustained focus on handler</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">⚠️ Behavior Modification</h4>
                    <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                      <li>Reactivity (dogs/cars)</li>
                      <li>Aggression management</li>
                      <li>Separation anxiety & guarding</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">🎯 Off-Leash Reliability</h4>
                    <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                      <li>Safe zone off-leash recall</li>
                      <li>Emergency command recall</li>
                      <li>Real-world proofing</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/50 pt-4 text-xs text-muted-foreground space-y-0.5">
                <div>🎁 <strong>Included:</strong> Custom plan, owner drills, reports, WhatsApp support.</div>
                <div>🗓️ <strong>Format:</strong> 60-75 min sessions. Ahmedabad home + outdoors.</div>
              </div>
            </div>

            <Link
              to="/training"
              className="mt-8 w-full rounded-full bg-primary text-primary-foreground hover:opacity-90 font-bold py-3.5 text-xs text-center transition cursor-pointer shadow-md"
            >
              Book Advanced Program Package
            </Link>
          </article>
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
            <article
              key={p.id}
              className="rounded-3xl bg-card overflow-hidden hover-lift border border-border scroll-reveal-card flex flex-col"
            >
              <Link
                to="/products"
                data-hover-text="BUY"
                className="block group interactive-hover cursor-pointer"
              >
                <div className="overflow-hidden aspect-[4/3] w-full">
                  <img
                    src={p.image}
                    alt={`Premium product ${p.name}`}
                    width={800}
                    height={800}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
                  />
                </div>
                <div className="p-6 md:p-7 flex items-center justify-between">
                  <div>
                    <div className="text-xs sm:text-sm text-muted-foreground font-semibold uppercase tracking-wider">{p.category}</div>
                    <h3 className="font-display text-xl md:text-2xl font-bold mt-1">{p.name}</h3>
                  </div>
                  <div className="font-display text-2xl text-primary font-bold">₹{p.price}</div>
                </div>
              </Link>
            </article>
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
            <h2 className="font-display text-5xl md:text-6xl lg:text-7xl text-balance font-bold leading-tight">
              A pet is waiting to change your life.
            </h2>
            <p className="mt-6 opacity-90 max-w-2xl mx-auto font-medium text-base md:text-lg">
              Browse our curated, health-checked pets ready to join your family today.
            </p>
            <Link
              to="/pets"
              data-hover-text="VIEW ALL"
              className="mt-10 inline-flex items-center gap-2 rounded-full bg-background text-foreground px-10 py-4.5 hover:opacity-95 transition font-bold shadow-md interactive-hover cursor-pointer text-base"
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
    <section className="mx-auto max-w-7xl px-6 py-24 md:py-32 relative z-20">
      <div className="flex items-end justify-between mb-12 gap-6 flex-wrap border-b border-border/50 pb-8">
        <div>
          <div className="text-sm sm:text-base md:text-lg uppercase tracking-[0.3em] text-primary font-extrabold">
            {eyebrow}
          </div>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl md:text-6xl text-balance font-bold tracking-tight leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-4 text-muted-foreground text-base sm:text-lg md:text-xl max-w-2xl font-semibold leading-relaxed">{subtitle}</p>
          )}
        </div>
        {cta && (
          <Link
            to={cta.to}
            className="text-lg sm:text-xl text-primary hover:underline whitespace-nowrap font-extrabold flex items-center gap-1 hover:translate-x-1.5 transition-transform"
          >
            {cta.label} <FiChevronRight />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

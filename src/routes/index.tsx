import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FiArrowRight, FiHeart, FiShield, FiAward, FiCheck } from "react-icons/fi";
import { SiteLayout } from "@/components/site/SiteLayout";
import { products, testimonials, trainingPlans } from "@/data/sample";
import { HeroSlider } from "@/components/site/HeroSlider";
import { dbService, parseImages } from "@/services/db-service";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

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

  const featuredPets = (pets ?? [])
    .filter((p) => p.type.toLowerCase() !== "exotic")
    .slice(0, 4);

  return (
    <SiteLayout>
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 pt-12 pb-20 lg:pt-20 lg:pb-32 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/60 px-4 py-1.5 text-xs font-medium text-accent-foreground">
              <FiHeart className="text-primary" /> A warmer home for every paw
            </span>
            <h1 className="mt-6 font-display text-5xl lg:text-7xl leading-[1.05] text-balance">
              Where pets find <em className="text-primary not-italic">families</em>, and families find joy.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-lg">
              WOOLF.INDIA is a gentle marketplace, training studio and care shop — built for people who love animals the way you do.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/pets" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-primary-foreground hover:opacity-90 transition">
                Meet the pets <FiArrowRight />
              </Link>
              <Link to="/contact" className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3 hover:bg-muted transition">
                Get in touch
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              {[
                { k: "2.4k+", v: "Happy homes" },
                { k: "98%", v: "Vaccinated" },
                { k: "120", v: "Rescues / yr" },
              ].map((s) => (
                <div key={s.v}>
                  <div className="font-display text-3xl text-primary">{s.k}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.v}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, ease: "easeOut" }} className="relative">
            <div className="absolute -inset-6 rounded-[3rem] bg-accent/40 blur-3xl" aria-hidden />
            <HeroSlider />
            <div className="absolute -bottom-6 -left-6 bg-background/95 border border-border rounded-2xl p-4 hidden sm:flex items-center gap-3 z-30 shadow-md">
              <FiShield className="text-primary text-2xl" />
              <div>
                <div className="text-sm font-medium">Health-checked</div>
                <div className="text-xs text-muted-foreground">Every pet, every time</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Section eyebrow="Featured" title="Meet our newest companions" subtitle="Hand-raised, health-checked, and waiting to meet you." cta={{ to: "/pets", label: "View all pets" }}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-3xl" />)
            : featuredPets.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                  <Link to="/pets/$petId" params={{ petId: p.id }} className="block group">
                    <div className="overflow-hidden rounded-3xl bg-card hover-lift border border-border">
                      <img src={parseImages(p.image_url)[0] || p.image_url || "/pet-1.jpg"} alt={p.name} width={800} height={800} loading="lazy" className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      <div className="p-5">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-display text-xl">{p.name}</div>
                            <div className="text-xs text-muted-foreground">{p.breed} • {p.age}</div>
                          </div>
                          {/* Individual Price Section Bar/Badge */}
                          <div className="shrink-0 ml-2">
                            <span className="inline-flex rounded-full bg-accent/20 px-2.5 py-1 text-xs font-semibold text-accent-foreground font-display">
                              ₹{Number(p.price).toFixed(0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
        </div>
      </Section>

      <Section eyebrow="Training" title="Calm, kind, lifelong skills" subtitle="Trainers who teach with patience — never punishment." cta={{ to: "/training", label: "Explore programs" }}>
        <div className="grid md:grid-cols-3 gap-6">
          {trainingPlans.map((t) => (
            <div key={t.id} className="rounded-3xl border border-border bg-card p-7 hover-lift">
              <div className="text-xs uppercase tracking-wider text-primary">{t.mode}</div>
              <h3 className="mt-2 font-display text-2xl">{t.title}</h3>
              <div className="mt-1 text-sm text-muted-foreground">{t.duration}</div>
              <ul className="mt-5 space-y-2 text-sm">
                {t.perks.map((p) => <li key={p} className="flex gap-2"><FiAward className="text-primary mt-0.5 shrink-0" /> {p}</li>)}
              </ul>
              <div className="mt-6 flex items-center justify-between">
                <span className="font-display text-2xl">₹{t.price}</span>
                <Link to="/training" className="text-sm text-primary hover:underline">Book →</Link>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Shop" title="Beautiful things, made for them" cta={{ to: "/products", label: "Shop everything" }}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.slice(0, 3).map((p) => (
            <div key={p.id} className="rounded-3xl bg-card overflow-hidden hover-lift">
              <img src={p.image} alt={p.name} width={800} height={800} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <div className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">{p.category}</div>
                  <div className="font-display text-lg">{p.name}</div>
                </div>
                <div className="font-display text-xl text-primary">₹{p.price}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <section className="bg-accent/30 py-20 mt-20">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="font-display text-4xl text-center mb-12">Loved by gentle homes</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <blockquote key={t.name} className="rounded-3xl glass p-7">
                <p className="font-display text-xl leading-relaxed">“{t.quote}”</p>
                <footer className="mt-4 text-sm text-muted-foreground">— {t.name}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 my-24">
        <div className="rounded-[2.5rem] bg-primary text-primary-foreground p-12 lg:p-20 text-center">
          <h2 className="font-display text-4xl lg:text-5xl text-balance">A pet is waiting to change your life.</h2>
          <p className="mt-4 opacity-80 max-w-xl mx-auto">Browse our curated, health-checked pets ready to join your family today.</p>
          <Link to="/pets" className="mt-8 inline-flex items-center gap-2 rounded-full bg-background text-foreground px-7 py-3 hover:opacity-90 transition">
            Explore Marketplace <FiArrowRight />
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}

function Section({ eyebrow, title, subtitle, cta, children }: {
  eyebrow: string; title: string; subtitle?: string; cta?: { to: string; label: string }; children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="flex items-end justify-between mb-10 gap-6 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-primary">{eyebrow}</div>
          <h2 className="mt-2 font-display text-4xl lg:text-5xl text-balance">{title}</h2>
          {subtitle && <p className="mt-3 text-muted-foreground max-w-xl">{subtitle}</p>}
        </div>
        {cta && <Link to={cta.to} className="text-sm text-primary hover:underline whitespace-nowrap">{cta.label} →</Link>}
      </div>
      {children}
    </section>
  );
}

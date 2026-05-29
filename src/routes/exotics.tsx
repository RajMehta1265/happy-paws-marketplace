import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useQuery } from "@tanstack/react-query";
import { dbService } from "@/services/db-service";
import { FiCheck, FiInfo } from "react-icons/fi";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/exotics")({
  head: () => ({
    meta: [
      { title: "Exotic Companions — WOOLF.INDIA" },
      {
        name: "description",
        content:
          "Rare, magnificent, and ethically sourced exotics including macaws, sugar gliders, and chameleon lizards.",
      },
    ],
  }),
  component: ExoticsPage,
});

function ExoticsPage() {
  const { data: pets, isLoading } = useQuery({
    queryKey: ["pets"],
    queryFn: () => dbService.getPets(),
  });

  const exotics = useMemo(() => {
    return (pets ?? []).filter((p) => p.type.toLowerCase() === "exotic");
  }, [pets]);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-6 pt-16">
        <div className="text-xs uppercase tracking-[0.25em] text-accent font-bold">
          Exotics Selection
        </div>
        <h1 className="mt-2 font-display text-5xl lg:text-6xl max-w-3xl">
          Ethical Exotics & Premium Companions
        </h1>
        <p className="mt-4 text-muted-foreground max-w-xl leading-relaxed">
          Rare and magnificent companions. Each exotic pet at WOOLF.INDIA is certified,
          health-checked, and ethically hand-reared by specialists.
        </p>

        <div className="mt-8 flex items-start gap-3 rounded-2xl bg-amber-500/10 p-5 border border-amber-500/20 text-amber-800 text-sm max-w-2xl leading-relaxed">
          <FiInfo className="mt-0.5 shrink-0 text-amber-600" size={16} />
          <div>
            <strong>Important Legal & Care Notice:</strong> All exotics listed here fully comply
            with local wildlife regulations and CITES guidelines. Keeping exotics requires
            specialized care, nutrition, and environmental parameters. Contact us for training and
            enclosure setup.
          </div>
        </div>
      </section>

      {/* Grid List */}
      <section className="mx-auto max-w-7xl px-6 py-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] rounded-3xl" />
            ))
          : exotics.map((p) => (
              <Link
                key={p.id}
                to="/pets/$petId"
                params={{ petId: p.id }}
                className="group rounded-[2rem] bg-card overflow-hidden hover-lift border border-border flex flex-col"
              >
                <div className="relative overflow-hidden aspect-[4/3]">
                  <img
                    src={p.image_url ?? "/pet-1.jpg"}
                    alt={p.name}
                    width={800}
                    height={800}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute top-4 left-4 rounded-full bg-black/40 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white">
                    {p.breed}
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-2xl font-bold text-foreground">{p.name}</h2>
                      <span className="font-display text-xl font-extrabold text-accent">
                        ₹{Number(p.price).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Age: {p.age} • Health Checked
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                      {p.description}
                    </p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-border/60 flex items-center gap-3 text-xs">
                    {p.vaccinated && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/25 px-2.5 py-1 font-medium text-accent-foreground">
                        <FiCheck size={12} /> Vaccinated
                      </span>
                    )}
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-muted-foreground font-medium">
                      Specialized Diet
                    </span>
                  </div>
                </div>
              </Link>
            ))}
        {!isLoading && exotics.length === 0 && (
          <p className="text-muted-foreground col-span-3 py-16 text-center font-medium">
            No exotic pets are currently available. Check back soon!
          </p>
        )}
      </section>
    </SiteLayout>
  );
}

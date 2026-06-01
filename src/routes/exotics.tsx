import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useQuery } from "@tanstack/react-query";
import { dbService, parseImages } from "@/services/db-service";
import { FiCheck, FiInfo, FiArrowRight, FiFilter } from "react-icons/fi";
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
  const [selectedBreed, setSelectedBreed] = useState<string>("All");

  // Fetch pets
  const { data: pets, isLoading: petsLoading } = useQuery({
    queryKey: ["pets"],
    queryFn: () => dbService.getPets(),
    initialData: () => dbService.initLocalData(),
    staleTime: 0,
  });

  const exotics = useMemo(() => {
    return (pets ?? []).filter((p) => p.type.toLowerCase() === "exotic");
  }, [pets]);

  // Extract dynamic species/breed options from the available exotic pets
  const breedTabs = useMemo(() => {
    const breeds = exotics.map((p) => p.breed || "Other");
    return ["All", ...Array.from(new Set(breeds))];
  }, [exotics]);

  // Dynamically resolve maximum price from exotic pets data, fallback to 150000
  const maxSliderValue = useMemo(() => {
    if (exotics.length === 0) return 150000;
    const prices = exotics.map((p) => Number(p.price));
    const rawMax = Math.max(...prices, 150000);
    return Math.ceil(rawMax / 10000) * 10000;
  }, [exotics]);

  const [max, setMax] = useState<number | null>(null);
  const currentMaxPrice = max ?? maxSliderValue;

  const filtered = useMemo(() => {
    return exotics.filter((p) => {
      // Breed / Species Filter
      const matchBreed = selectedBreed === "All" || p.breed === selectedBreed;

      // Price filter
      const matchPrice = Number(p.price) <= currentMaxPrice;

      return matchBreed && matchPrice;
    });
  }, [exotics, selectedBreed, currentMaxPrice]);

  return (
    <SiteLayout>
      {/* Page Header Section */}
      <section className="mx-auto max-w-7xl px-6 pt-32 pb-4">
        <div className="text-xs uppercase tracking-[0.25em] text-accent font-semibold">
          Exotics Selection
        </div>
        <h1 className="mt-2 font-display text-5xl lg:text-6xl text-foreground leading-tight">
          Ethical Exotics & Premium Companions
        </h1>
        <p className="mt-3 text-muted-foreground text-sm lg:text-base max-w-2xl">
          Rare and magnificent companions. Each exotic pet at WOOLF.INDIA is certified,
          health-checked, and ethically hand-reared by specialists.
        </p>

        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-amber-500/10 p-5 border border-amber-500/20 text-amber-800 text-xs max-w-2xl leading-relaxed">
          <FiInfo className="mt-0.5 shrink-0 text-amber-600" size={16} />
          <div>
            <strong>Important Legal & Care Notice:</strong> All exotics listed here fully comply
            with local wildlife regulations and CITES guidelines. Keeping exotics requires
            specialized care, nutrition, and environmental parameters. Contact us for training and
            enclosure setup.
          </div>
        </div>
      </section>

      {/* Main Layout Grid */}
      <section className="mx-auto max-w-7xl px-6 pb-20 space-y-6">
        {/* Filters Bar */}
        <div className="space-y-4 bg-card/40 border border-border/80 rounded-3xl p-5 shadow-xs glass transition-all hover:border-border/100">
          {/* Species / Breed Tabs */}
          <div className="flex flex-col gap-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-bold">
              <FiFilter className="text-accent" /> Filter by Species
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {breedTabs.map((breed) => (
                <button
                  key={breed}
                  onClick={() => setSelectedBreed(breed)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold tracking-wide transition cursor-pointer ${
                    selectedBreed === breed
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "border-border hover:bg-muted text-foreground/80"
                  }`}
                >
                  {breed}
                </button>
              ))}
            </div>
          </div>

          {/* Price slider */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border/40">
            <div className="text-xs text-muted-foreground">
              Showing available certified exotic species
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                Max Price: <strong className="text-foreground">₹{currentMaxPrice.toLocaleString("en-IN")}</strong>
              </span>
              <input
                type="range"
                min={1000}
                max={maxSliderValue}
                step={1000}
                value={currentMaxPrice}
                onChange={(e) => setMax(+e.target.value)}
                className="accent-primary cursor-pointer w-32 sm:w-40 h-1.5 bg-muted rounded-lg appearance-none"
              />
            </div>
          </div>
        </div>

        {/* Grid List */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {petsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] rounded-3xl" />
            ))
          ) : filtered.map((p) => (
            <Link
              key={p.id}
              to="/pets/$petId"
              params={{ petId: p.id }}
              className="group rounded-3xl bg-card overflow-hidden hover-lift border border-border/80 flex flex-col justify-between transition-all hover:border-border/100 hover:shadow-md"
            >
              <div>
                <div className="relative aspect-[4/3] w-full bg-muted overflow-hidden">
                  <img
                    src={parseImages(p.image_url)[0] || p.image_url || "/pet-1.jpg"}
                    alt={p.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-103"
                    loading="lazy"
                  />
                  <div className="absolute top-4 left-4 rounded-full bg-black/40 backdrop-blur-md px-3 py-1 text-[10px] font-semibold text-white">
                    {p.breed}
                  </div>
                </div>
                <div className="p-5 pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-display text-2xl group-hover:text-accent transition-colors duration-300">
                        {p.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Age: {p.age} • Certified Species
                      </div>
                    </div>
                    <div className="shrink-0 ml-2">
                      <span className="inline-flex rounded-full bg-accent/15 px-3.5 py-1.5 text-xs font-semibold text-accent font-display">
                        ₹{Number(p.price).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {p.description}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-4 flex items-center justify-between border-t border-border/40 mt-4 bg-muted/10">
                <div className="flex gap-1 text-[10px] text-muted-foreground font-medium">
                  {p.vaccinated && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-0.5">
                      <FiCheck className="text-accent" size={12} /> Vaccinated
                    </span>
                  )}
                  <span className="rounded-full bg-secondary px-2.5 py-0.5">Health-checked</span>
                </div>
                <span className="text-[11px] font-bold text-accent group-hover:underline flex items-center gap-0.5 transition-colors">
                  View Details{" "}
                  <FiArrowRight
                    size={12}
                    className="group-hover:translate-x-0.5 transition-transform"
                  />
                </span>
              </div>
            </Link>
          ))}
          {!petsLoading && filtered.length === 0 && (
            <p className="text-muted-foreground col-span-3 py-12 text-center border border-dashed border-border rounded-3xl bg-muted/10">
              No exotic companions match your active filter settings.
            </p>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

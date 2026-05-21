import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { pets } from "@/data/sample";
import { FiCheck } from "react-icons/fi";

export const Route = createFileRoute("/pets")({
  head: () => ({ meta: [{ title: "Pets Marketplace — PawHaven" }, { name: "description", content: "Browse pets by type, breed, age and price." }] }),
  component: PetsPage,
});

const TYPES = ["All", "Dog", "Cat", "Rabbit", "Bird", "Hamster"] as const;

function PetsPage() {
  const [type, setType] = useState<(typeof TYPES)[number]>("All");
  const [max, setMax] = useState(1000);
  const filtered = useMemo(() => pets.filter((p) => (type === "All" || p.type === type) && p.price <= max), [type, max]);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-6 pt-16">
        <div className="text-xs uppercase tracking-[0.25em] text-primary">Marketplace</div>
        <h1 className="mt-2 font-display text-5xl lg:text-6xl">Find your companion</h1>
        <p className="mt-3 text-muted-foreground max-w-xl">Every pet is health-checked, ethically sourced, and ready for a loving home.</p>
      </section>

      <section className="mx-auto max-w-7xl px-6 mt-10 flex flex-wrap items-center gap-3">
        {TYPES.map((t) => (
          <button key={t} onClick={() => setType(t)} className={`rounded-full border px-4 py-2 text-sm transition ${type === t ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
            {t}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
          <span>Max ${max}</span>
          <input type="range" min={50} max={1000} step={10} value={max} onChange={(e) => setMax(+e.target.value)} className="accent-primary" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((p) => (
          <Link key={p.id} to="/pets/$petId" params={{ petId: p.id }} className="group rounded-3xl bg-card overflow-hidden hover-lift">
            <img src={p.image} alt={p.name} width={800} height={800} loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-2xl">{p.name}</div>
                  <div className="text-sm text-muted-foreground">{p.breed} • {p.age}</div>
                </div>
                <div className="font-display text-xl text-primary">${p.price}</div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs">
                {p.vaccinated && <span className="inline-flex items-center gap-1 rounded-full bg-accent/60 px-2 py-1 text-accent-foreground"><FiCheck /> Vaccinated</span>}
                {p.adoption && <span className="rounded-full bg-blush/40 px-2 py-1">Adoption</span>}
              </div>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && <p className="text-muted-foreground">No pets match your filters.</p>}
      </section>
    </SiteLayout>
  );
}

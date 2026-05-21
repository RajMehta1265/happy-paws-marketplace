import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { products } from "@/data/sample";
import { FiStar, FiShoppingBag } from "react-icons/fi";

export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "Pet Products Shop — PawHaven" }, { name: "description", content: "Food, toys, grooming and accessories for the pets you love." }] }),
  component: ProductsPage,
});

const CATS = ["All", "Food", "Toys", "Grooming", "Accessories"] as const;

function ProductsPage() {
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");
  const filtered = cat === "All" ? products : products.filter((p) => p.category === cat);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-6 pt-16">
        <div className="text-xs uppercase tracking-[0.25em] text-primary">Shop</div>
        <h1 className="mt-2 font-display text-5xl lg:text-6xl">Thoughtful things for thoughtful pets.</h1>
      </section>

      <div className="mx-auto max-w-7xl px-6 mt-10 flex flex-wrap gap-3">
        {CATS.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`rounded-full border px-4 py-2 text-sm transition ${cat === c ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
            {c}
          </button>
        ))}
      </div>

      <section className="mx-auto max-w-7xl px-6 py-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((p) => (
          <div key={p.id} className="rounded-3xl bg-card overflow-hidden hover-lift group">
            <img src={p.image} alt={p.name} width={800} height={800} loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="p-5">
              <div className="text-xs text-muted-foreground">{p.category}</div>
              <div className="mt-1 flex justify-between items-start gap-3">
                <div className="font-display text-xl">{p.name}</div>
                <div className="font-display text-xl text-primary">${p.price}</div>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground"><FiStar className="text-primary" /> {p.rating}</span>
                <button className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-primary-foreground text-xs"><FiShoppingBag /> Add</button>
              </div>
            </div>
          </div>
        ))}
      </section>
    </SiteLayout>
  );
}

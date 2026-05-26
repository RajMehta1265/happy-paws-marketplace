import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/use-cart";
import { Skeleton } from "@/components/ui/skeleton";
import { FiShoppingBag, FiStar } from "react-icons/fi";

export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "Shop — PawHaven" }] }),
  component: ProductsPage,
});

const CATS = ["All", "Food", "Toys", "Grooming", "Accessories"] as const;

function ProductsPage() {
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");
  const { add } = useCart();
  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const list = (products ?? []).filter((p) => cat === "All" || p.category === cat);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-6 pt-16">
        <div className="text-xs uppercase tracking-[0.25em] text-accent">Shop</div>
        <h1 className="mt-2 font-display text-5xl lg:text-6xl">Care, curated.</h1>
      </section>
      <section className="mx-auto max-w-7xl px-6 mt-10 flex flex-wrap gap-3">
        {CATS.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`rounded-full border px-4 py-2 text-sm transition ${cat === c ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>{c}</button>
        ))}
      </section>
      <section className="mx-auto max-w-7xl px-6 py-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-3xl" />)
          : list.map((p) => (
              <div key={p.id} className="rounded-3xl bg-card overflow-hidden hover-lift flex flex-col">
                <img src={p.image_url ?? "/product-1.jpg"} alt={p.name} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                <div className="p-5 flex-1 flex flex-col">
                  <div className="text-xs text-muted-foreground">{p.category}</div>
                  <div className="font-display text-xl mt-1">{p.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1"><FiStar className="text-accent" /> {Number(p.rating).toFixed(1)}</div>
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <div className="font-display text-xl text-accent">${Number(p.price).toFixed(0)}</div>
                    <button onClick={() => add.mutate({ productId: p.id })} disabled={add.isPending} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-60">
                      <FiShoppingBag /> Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
      </section>
    </SiteLayout>
  );
}

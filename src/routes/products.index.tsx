import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/use-cart";
import { Skeleton } from "@/components/ui/skeleton";
import { FiShoppingBag, FiStar, FiArrowRight, FiChevronLeft, FiChevronRight } from "react-icons/fi";

export const Route = createFileRoute("/products/")({
  head: () => ({
    meta: [
      { title: "Pet Products Marketplace — WOOLF.INDIA" },
      {
        name: "description",
        content: "Food, toys, grooming and accessories for the pets you love.",
      },
    ],
  }),
  component: ProductsPage,
});

const PRODUCTS_PER_PAGE = 6;

function ProductsPage() {
  const [cat, setCat] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const { add } = useCart();
  const listingSectionRef = useRef<HTMLDivElement>(null);

  // Fetch products
  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const isMock =
        typeof window !== "undefined" && !!localStorage.getItem("pawhaven_mock_session");
      if (isMock) {
        const stored = localStorage.getItem("pawhaven_products");
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch {}
        }
        const { products: sampleProducts } = await import("@/data/sample");
        const list = sampleProducts.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          price: p.price,
          image_url: p.image || null,
          rating: p.rating,
          description: "Curated premium care product by WOOLF.INDIA",
          stock: 10,
        }));
        localStorage.setItem("pawhaven_products", JSON.stringify(list));
        return list;
      }

      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data && data.length > 0) return data;

        if (!error && data && data.length === 0) {
          console.log("Supabase products table is empty. Seeding with sample data...");
          const { products: sampleProducts } = await import("@/data/sample");
          const toInsert = sampleProducts.map((p) => ({
            name: p.name,
            category: p.category,
            price: p.price,
            image_url: p.image || null,
            rating: p.rating,
            description: "Curated premium care product by WOOLF.INDIA",
            stock: 10,
          }));
          const { data: seeded, error: seedErr } = await supabase
            .from("products")
            .insert(toInsert)
            .select();
          if (!seedErr && seeded && seeded.length > 0) {
            return seeded;
          }
          console.warn("Seeding products to Supabase failed:", seedErr);
        }
      } catch (e) {
        console.warn("Supabase products fetch failed, using sample fallback:", e);
      }

      // Fallback to sample data, mapping `image` to `image_url`
      const { products: sampleProducts } = await import("@/data/sample");
      return sampleProducts.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        image_url: p.image || null,
        rating: p.rating,
        description: "Curated premium care product by WOOLF.INDIA",
      }));
    },
  });

  // Calculate maximum price from product data dynamically
  const maxSliderValue = useMemo(() => {
    if (!products || products.length === 0) return 5000;
    const prices = products.map((p) => Number(p.price));
    const rawMax = Math.max(...prices, 5000);
    return Math.ceil(rawMax / 500) * 500;
  }, [products]);

  const [max, setMax] = useState<number | null>(null);
  const currentMaxPrice = max ?? maxSliderValue;

  // Dynamically compute available categories from product data
  const availableCategories = useMemo(() => {
    const dataCategories = [...new Set((products ?? []).map((p: any) => p.category))];
    const baseCategories = ["Food", "Toys", "Grooming", "Accessories"];
    const merged = [...baseCategories];
    dataCategories.forEach((c: any) => {
      if (c && !merged.includes(c)) {
        merged.push(c);
      }
    });
    return ["All", ...merged];
  }, [products]);

  // Filtered list
  const filtered = useMemo(() => {
    return (products ?? [])
      .filter((p: any) => cat === "All" || p.category === cat)
      .filter((p: any) => Number(p.price) <= currentMaxPrice);
  }, [products, cat, currentMaxPrice]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PRODUCTS_PER_PAGE));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filtered.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filtered, currentPage]);

  // Reset page when category or price changes
  const isManualPageChange = useRef(false);
  useEffect(() => {
    if (isManualPageChange.current) {
      isManualPageChange.current = false;
      return;
    }
    setCurrentPage(1);
  }, [cat, currentMaxPrice]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    isManualPageChange.current = true;
    setCurrentPage(page);

    requestAnimationFrame(() => {
      if (listingSectionRef.current) {
        const navbarHeight = 80;
        const top = listingSectionRef.current.getBoundingClientRect().top + window.scrollY - navbarHeight;
        window.scrollTo({ top, behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  return (
    <SiteLayout>
      {/* Page Header Section */}
      <section ref={listingSectionRef} className="mx-auto max-w-7xl px-6 pt-32 pb-4">
        <div className="text-sm sm:text-base md:text-lg uppercase tracking-[0.3em] text-accent font-extrabold">
          Product
        </div>
        <h1 className="mt-2 font-display text-5xl lg:text-6xl text-foreground leading-tight">
          Care, curated.
        </h1>
        <p className="mt-3 text-muted-foreground text-sm lg:text-base max-w-2xl">
          Premium foods, toys, grooming products, and accessories for the pets you love.
        </p>
      </section>

      {/* Main Layout */}
      <section className="mx-auto max-w-7xl px-6 pb-20 space-y-6">
        {/* Filters Bar Card */}
        <div className="space-y-4 bg-card/40 border border-border/80 rounded-3xl p-5 shadow-xs glass transition-all hover:border-border/100">
          {/* Categories Tab Row */}
          <div className="flex flex-wrap items-center gap-2">
            {availableCategories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold tracking-wide transition cursor-pointer ${
                  cat === c
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "border-border hover:bg-muted text-foreground/80"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Price Filter */}
          <div className="flex flex-col gap-2 pt-4 border-t border-border/40 w-full">
            <div className="flex justify-between items-center text-xs text-muted-foreground font-semibold">
              <span>Price Range</span>
              <span>
                Max Price:{" "}
                <strong className="text-foreground text-sm font-bold">
                  ₹{currentMaxPrice.toLocaleString("en-IN")}
                </strong>
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={maxSliderValue}
              step={50}
              value={currentMaxPrice}
              onChange={(e) => setMax(+e.target.value)}
              className="accent-primary cursor-pointer w-full h-1.5 bg-muted rounded-lg appearance-none"
            />
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading
            ? Array.from({ length: PRODUCTS_PER_PAGE }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/3] rounded-3xl" />
              ))
            : paginatedProducts.map((p: any) => (
                <Link
                  key={p.id}
                  to="/products/$productId"
                  params={{ productId: p.id }}
                  className="group rounded-3xl bg-card overflow-hidden hover-lift border border-border/80 flex flex-col justify-between transition-all hover:border-border/100 hover:shadow-md"
                >
                  <div>
                    <div className="relative aspect-[4/3] w-full bg-muted overflow-hidden">
                      <img
                        src={p.image_url || "/product-1.jpg"}
                        alt={p.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-103"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-5 pb-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-display text-2xl group-hover:text-accent transition-colors duration-300">
                            {p.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                            {p.category} • <FiStar className="text-accent" /> {Number(p.rating || 5).toFixed(1)}
                          </div>
                        </div>
                        <div className="shrink-0 ml-2">
                          <span className="inline-flex rounded-full bg-accent/20 px-4.5 py-2 text-sm sm:text-base font-extrabold text-accent font-display shadow-sm">
                            ₹{Number(p.price).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-4 flex items-center justify-between border-t border-border/40 mt-4 bg-muted/10">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        add.mutate({ productId: p.id });
                      }}
                      disabled={add.isPending}
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60 transition cursor-pointer"
                    >
                      <FiShoppingBag /> Add
                    </button>
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
          {!isLoading && filtered.length === 0 && (
            <p className="text-muted-foreground col-span-full py-12 text-center border border-dashed border-border rounded-3xl bg-muted/10">
              No products match your active filter settings.
            </p>
          )}
        </div>

        {/* Pagination Controls */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            {/* Previous Button */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 rounded-full border border-border px-4 py-2 text-xs font-semibold transition cursor-pointer hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FiChevronLeft size={14} /> Prev
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                const showPage =
                  page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
                const showEllipsisAfter =
                  page === currentPage + 2 && currentPage < totalPages - 2;

                if (showEllipsisBefore || showEllipsisAfter) {
                  return (
                    <span key={page} className="px-1 text-xs text-muted-foreground select-none">
                      …
                    </span>
                  );
                }

                if (!showPage) return null;

                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`min-w-[36px] h-9 rounded-full text-xs font-bold transition cursor-pointer ${
                      currentPage === page
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "border border-border hover:bg-muted text-foreground/80"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            {/* Next Button */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 rounded-full border border-border px-4 py-2 text-xs font-semibold transition cursor-pointer hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <FiChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Results Summary */}
        {!isLoading && filtered.length > 0 && (
          <div className="text-center text-xs text-muted-foreground">
            Showing {(currentPage - 1) * PRODUCTS_PER_PAGE + 1}–
            {Math.min(currentPage * PRODUCTS_PER_PAGE, filtered.length)} of {filtered.length}{" "}
            products
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

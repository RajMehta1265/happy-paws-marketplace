import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  FiStar,
  FiShoppingBag,
  FiSend,
  FiTrash2,
  FiChevronLeft,
  FiMinus,
  FiPlus,
} from "react-icons/fi";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { useCart } from "@/hooks/use-cart";
import { toast } from "sonner";

export const Route = createFileRoute("/products/$productId")({
  loader: async ({ params }) => {
    return params.productId;
  },
  head: () => ({
    meta: [
      { title: "Product Details — WOOLF.INDIA" },
      { name: "description", content: "View details of our premium care products." },
    ],
  }),
  component: ProductDetail,
});

interface ProductReview {
  id: string;
  productId: string;
  author: string;
  rating: number;
  text: string;
  date: string;
}

function ProductDetail() {
  const productId = Route.useLoaderData();
  const { add: addCartItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  // Review states
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [newReviewAuthor, setNewReviewAuthor] = useState("");
  const [newReviewText, setNewReviewText] = useState("");
  const [newReviewRating, setNewReviewRating] = useState(5);

  // Fetch product detail
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      const isMock =
        typeof window !== "undefined" && !!localStorage.getItem("pawhaven_mock_session");
      if (isMock) {
        const stored = localStorage.getItem("pawhaven_products");
        if (stored) {
          try {
            const list = JSON.parse(stored);
            const found = list.find((p: any) => p.id === productId);
            if (found) return found;
          } catch {}
        }
        return null;
      }

      // Try Supabase
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .maybeSingle();
        if (!error && data) return data;
      } catch (err) {
        console.warn("Fetch single product from Supabase failed:", err);
      }

      return null;
    },
  });

  // Load reviews from local storage
  useEffect(() => {
    const stored = localStorage.getItem("pawhaven_product_reviews");
    let list: ProductReview[] = [];
    if (stored) {
      try {
        list = JSON.parse(stored);
      } catch {}
    }

    const prodReviews = list.filter((r) => r.productId === productId);
    if (prodReviews.length === 0) {
      const defaultReviews = [
        {
          id: `mock-p1-${productId}`,
          productId,
          author: "Ananya S.",
          rating: 5,
          text: `Absolutely fantastic quality! Highly recommend this product. My pet loves it.`,
          date: new Date().toISOString().split("T")[0],
        },
        {
          id: `mock-p2-${productId}`,
          productId,
          author: "Rohan M.",
          rating: 4,
          text: `Very good value for money. Durable and holds up well to active use.`,
          date: new Date().toISOString().split("T")[0],
        },
      ];
      const updated = [...list, ...defaultReviews];
      localStorage.setItem("pawhaven_product_reviews", JSON.stringify(updated));
      setReviews(defaultReviews);
    } else {
      setReviews(prodReviews);
    }
  }, [productId]);

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewAuthor || !newReviewText) {
      toast.error("Please enter your name and review");
      return;
    }

    const newRev: ProductReview = {
      id: crypto.randomUUID(),
      productId,
      author: newReviewAuthor,
      rating: newReviewRating,
      text: newReviewText,
      date: new Date().toISOString().split("T")[0],
    };

    const stored = localStorage.getItem("pawhaven_product_reviews");
    let list: ProductReview[] = [];
    if (stored) {
      try {
        list = JSON.parse(stored);
      } catch {}
    }

    const updated = [newRev, ...list];
    localStorage.setItem("pawhaven_product_reviews", JSON.stringify(updated));
    setReviews([newRev, ...reviews]);

    setNewReviewAuthor("");
    setNewReviewText("");
    setNewReviewRating(5);
    toast.success("Thank you for your review!");
  };

  const handleDeleteReview = (id: string) => {
    const stored = localStorage.getItem("pawhaven_product_reviews");
    let list: ProductReview[] = [];
    if (stored) {
      try {
        list = JSON.parse(stored);
      } catch {}
    }

    const updated = list.filter((r) => r.id !== id);
    localStorage.setItem("pawhaven_product_reviews", JSON.stringify(updated));
    setReviews(reviews.filter((r) => r.id !== id));
    toast.success("Review deleted successfully.");
  };

  const handleAddToCart = () => {
    if (!product) return;
    addCartItem.mutate({ productId: product.id, qty: quantity });
  };

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-7xl px-6 py-32">
          <Skeleton className="h-[450px] rounded-3xl" />
        </div>
      </SiteLayout>
    );
  }

  if (!product) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl px-6 py-32 text-center">
          <h1 className="font-display text-4xl">Product not found</h1>
          <Link to="/products" className="text-accent mt-4 inline-block font-semibold">
            Back to all products →
          </Link>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-6 pt-32 pb-20">
        {/* Back Link */}
        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition mb-6"
        >
          <FiChevronLeft size={16} /> Back to marketplace
        </Link>

        {/* Product Details Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Product Image */}
          <div className="md:col-span-6 rounded-3xl overflow-hidden bg-card border border-border/80 aspect-[4/3] w-full">
            <img
              src={product.image_url || "/product-1.jpg"}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Right Column: Specifications & Cart Button */}
          <div className="md:col-span-6 space-y-6">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-accent">
                {product.category}
              </span>
              <h1 className="font-display text-4xl lg:text-5xl mt-1 text-foreground">
                {product.name}
              </h1>
              <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                <FiStar className="text-accent shrink-0" />
                <span className="font-semibold text-foreground">
                  {Number(product.rating || 5).toFixed(1)}
                </span>
                <span>• {reviews.length} customer reviews</span>
              </div>
            </div>

            <div className="font-display text-4xl text-accent font-extrabold">
              ₹{Number(product.price).toFixed(0)}
            </div>

            <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
              {product.description}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border/40">
              {/* Quantity Selector */}
              <div className="flex items-center rounded-full border border-border bg-background/50 px-3 py-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="rounded-full p-1 hover:bg-muted text-muted-foreground transition active:scale-90"
                  aria-label="Decrease quantity"
                >
                  <FiMinus size={14} />
                </button>
                <span className="w-10 text-center font-display text-sm font-bold select-none">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="rounded-full p-1 hover:bg-muted text-muted-foreground transition active:scale-90"
                  aria-label="Increase quantity"
                >
                  <FiPlus size={14} />
                </button>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={handleAddToCart}
                disabled={addCartItem.isPending}
                className="flex-1 min-w-[200px] flex items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60 transition cursor-pointer shadow-sm"
              >
                <FiShoppingBag /> Add to Cart
              </button>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <section className="mt-16 pt-12 border-t border-border/40 max-w-4xl">
          <h2 className="font-display text-3xl mb-8">Customer Reviews</h2>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Left Column: Reviews List */}
            <div className="md:col-span-7 space-y-6">
              {reviews.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">
                  No reviews yet. Be the first to review this product!
                </p>
              ) : (
                reviews.map((rev) => (
                  <div key={rev.id} className="rounded-2xl bg-card border border-border p-5 relative">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-foreground">{rev.author}</div>
                      <div className="text-[10px] text-muted-foreground">{rev.date}</div>
                    </div>
                    <div className="flex items-center gap-0.5 text-accent mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <FiStar
                          key={i}
                          size={12}
                          className={i < rev.rating ? "fill-accent text-accent" : "text-border"}
                        />
                      ))}
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed mt-2.5 whitespace-pre-line">
                      {rev.text}
                    </p>
                    <button
                      onClick={() => handleDeleteReview(rev.id)}
                      className="absolute bottom-4 right-4 text-muted-foreground hover:text-destructive transition cursor-pointer"
                      title="Delete review"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Right Column: Write Review Form */}
            <div className="md:col-span-5 rounded-3xl border border-border bg-card p-6 shadow-xs">
              <h3 className="font-display text-xl mb-1">Share your thoughts</h3>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                If you have purchased this product, please share your experience with other owners.
              </p>

              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newReviewAuthor}
                    onChange={(e) => setNewReviewAuthor(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full rounded-full border border-border bg-background px-4 py-2.5 text-xs outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Rating
                  </label>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => {
                      const ratingVal = i + 1;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setNewReviewRating(ratingVal)}
                          className="text-accent hover:scale-110 active:scale-95 transition cursor-pointer"
                        >
                          <FiStar
                            size={20}
                            className={
                              ratingVal <= newReviewRating
                                ? "fill-accent text-accent"
                                : "text-border"
                            }
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Your Review
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={newReviewText}
                    onChange={(e) => setNewReviewText(e.target.value)}
                    placeholder="Write your review here..."
                    className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-xs outline-none focus:border-accent resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-full bg-primary text-primary-foreground py-2.5 text-xs font-bold hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <FiSend /> Submit Review
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}

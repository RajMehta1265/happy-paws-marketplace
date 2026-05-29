import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FiCheck, FiHeart, FiStar, FiMessageSquare, FiSend, FiShoppingBag } from "react-icons/fi";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { useCart } from "@/hooks/use-cart";
import { toast } from "sonner";
import { dbService } from "@/services/db-service";

export const Route = createFileRoute("/pets/$petId")({
  component: PetDetail,
});

interface Review {
  id: string;
  petId: string;
  author: string;
  rating: number;
  text: string;
  date: string;
}

const DEFAULT_REVIEWS: Review[] = [
  { id: "1", petId: "milo", author: "Sarah M.", rating: 5, text: "Milo is a bundle of joy! Very healthy and well-behaved.", date: "2026-05-15" },
  { id: "2", petId: "milo", author: "Aman P.", rating: 5, text: "Extremely friendly. The onboarding instructions were super helpful.", date: "2026-05-20" },
  { id: "3", petId: "luna", author: "Deepak S.", rating: 5, text: "Luna is the sweetest Persian kitten. Pure white fur and green eyes!", date: "2026-05-18" },
  { id: "4", petId: "kiwi", author: "Priyah K.", rating: 4, text: "Kiwi sings beautifully every morning. Healthy bird.", date: "2026-05-22" },
  { id: "5", petId: "mochi", author: "Vikram R.", rating: 5, text: "Mochi loves curling up in my lap. So content and quiet.", date: "2026-05-25" },
];

function PetDetail() {
  const { petId } = Route.useParams();
  const { add: addCartItem } = useCart();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReviewAuthor, setNewReviewAuthor] = useState("");
  const [newReviewText, setNewReviewText] = useState("");
  const [newReviewRating, setNewReviewRating] = useState(5);

  const { data: pet, isLoading } = useQuery({
    queryKey: ["pet", petId],
    queryFn: () => dbService.getPet(petId),
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedReviews = localStorage.getItem("pawhaven_pet_reviews");
      if (storedReviews) {
        try {
          setReviews(JSON.parse(storedReviews));
        } catch {
          setReviews(DEFAULT_REVIEWS);
        }
      } else {
        localStorage.setItem("pawhaven_pet_reviews", JSON.stringify(DEFAULT_REVIEWS));
        setReviews(DEFAULT_REVIEWS);
      }
    }
  }, []);

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewAuthor || !newReviewText) {
      toast.error("Please enter your name and review");
      return;
    }

    const nextReview: Review = {
      id: crypto.randomUUID(),
      petId: petId,
      author: newReviewAuthor,
      rating: newReviewRating,
      text: newReviewText,
      date: new Date().toISOString().split("T")[0],
    };

    const updated = [nextReview, ...reviews];
    setReviews(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("pawhaven_pet_reviews", JSON.stringify(updated));
    }
    toast.success("Thank you for your review!");
    setNewReviewAuthor("");
    setNewReviewText("");
    setNewReviewRating(5);
  };

  if (isLoading) return <SiteLayout><div className="mx-auto max-w-7xl px-6 py-32"><Skeleton className="h-96 rounded-3xl" /></div></SiteLayout>;
  if (!pet) return <SiteLayout><div className="mx-auto max-w-3xl px-6 py-32 text-center"><h1 className="font-display text-4xl">Pet not found</h1><Link to="/pets" className="text-accent mt-4 inline-block">Back to all pets →</Link></div></SiteLayout>;

  // Filter reviews for this pet
  const petReviews = reviews.filter((r) => r.petId === pet.id);
  if (petReviews.length === 0) {
    petReviews.push(
      { id: `mock-1-${pet.id}`, petId: pet.id, author: "Aditi G.", rating: 5, text: `Absolutely love ${pet.name}! Super active and healthy.`, date: "2026-05-10" },
      { id: `mock-2-${pet.id}`, petId: pet.id, author: "Karan J.", rating: 5, text: `Great onboarding assistance from WOOLF.INDIA. Highly recommended.`, date: "2026-05-12" }
    );
  }

  return (
    <SiteLayout>
      {/* Top Detail Block with spacing and aligned tops */}
      <section className="mx-auto max-w-7xl px-6 pt-32 pb-16 grid lg:grid-cols-2 gap-12 items-start">
        
        {/* Media Block (Left Column) */}
        {pet.video_url ? (
          <div className="relative rounded-[2.5rem] w-full aspect-square overflow-hidden shadow-soft bg-black border border-border">
            <video src={pet.video_url} controls className="w-full h-full object-cover" />
          </div>
        ) : (
          <img src={pet.image_url ?? "/pet-1.jpg"} alt={pet.name} width={800} height={800} className="rounded-[2.5rem] w-full aspect-square object-cover shadow-soft border border-border" />
        )}
        
        {/* Details Block (Right Column) */}
        <div className="space-y-6">
          <div>
            <Link to="/pets" className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">← All pets</Link>
            <h1 className="mt-2 font-display text-5xl lg:text-6xl text-foreground leading-none">{pet.name}</h1>
            <div className="mt-2.5 text-xs text-muted-foreground font-medium tracking-wide uppercase">{pet.breed} • {pet.age} • {pet.type}</div>
          </div>
          
          <div className="border-t border-b border-border/60 py-4 flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Price</span>
            <div className="font-display text-4xl text-accent font-semibold">₹{Number(pet.price).toFixed(0)}</div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs uppercase font-bold tracking-wider text-muted-foreground">About {pet.name}</h4>
            <p className="text-sm text-foreground/80 leading-relaxed">{pet.description}</p>
          </div>
          
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {pet.vaccinated && <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-3 py-1 text-accent"><FiCheck /> Vaccinated</span>}
            <span className="rounded-full bg-secondary px-3 py-1 text-muted-foreground">Health-checked</span>
          </div>

          <div className="pt-4 flex flex-wrap gap-3">
            <button
              onClick={() => {
                addCartItem.mutate({ productId: pet.id, qty: 1 });
              }}
              className="rounded-full bg-primary px-8 py-3 text-primary-foreground hover:opacity-90 transition flex items-center gap-2 cursor-pointer font-bold text-xs"
            >
              <FiShoppingBag /> Add to Cart
            </button>
            <Link to="/contact" className="rounded-full border border-border hover:bg-muted transition px-6 py-3 text-xs font-bold flex items-center justify-center">
              Enquire to buy
            </Link>
            <button aria-label="Wishlist" className="rounded-full border border-border p-3 hover:bg-muted cursor-pointer transition text-muted-foreground"><FiHeart /></button>
          </div>
        </div>
      </section>

      {/* Reviews Block */}
      <section className="mx-auto max-w-7xl px-6 py-16 border-t border-border/60">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          
          {/* Reviews List (Left Column, col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            <h2 className="font-display text-3xl flex items-center gap-2 text-foreground">
              <FiMessageSquare className="text-accent" /> Customer Reviews ({petReviews.length})
            </h2>
            
            <div className="space-y-4">
              {petReviews.map((r) => (
                <div key={r.id} className="bg-card p-6 rounded-3xl border border-border shadow-xs hover:border-border/100 transition duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm text-foreground">{r.author}</span>
                    <span className="text-[10px] text-muted-foreground">{r.date}</span>
                  </div>
                  <div className="flex text-amber-500 mb-2">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <FiStar key={i} className="fill-amber-500 text-amber-500" size={11} />
                    ))}
                  </div>
                  <p className="text-muted-foreground italic text-sm leading-relaxed">"{r.text}"</p>
                </div>
              ))}
            </div>
          </div>

          {/* Add Review Form (Right Column, col-span-5) */}
          <div className="lg:col-span-5 bg-card border border-border p-8 rounded-3xl shadow-xs glass transition-all hover:border-border/100">
            <h3 className="font-display text-2xl mb-4 text-foreground">Add a Review</h3>
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Connor"
                    value={newReviewAuthor}
                    onChange={(e) => setNewReviewAuthor(e.target.value)}
                    className="w-full rounded-full border border-border bg-background px-4 py-2.5 text-xs outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Rating</label>
                  <select
                    value={newReviewRating}
                    onChange={(e) => setNewReviewRating(Number(e.target.value))}
                    className="w-full rounded-full border border-border bg-background px-4 py-2.5 text-xs outline-none focus:border-accent cursor-pointer"
                  >
                    <option value={5}>5 Stars (Excellent)</option>
                    <option value={4}>4 Stars (Good)</option>
                    <option value={3}>3 Stars (Average)</option>
                    <option value={2}>2 Stars (Poor)</option>
                    <option value={1}>1 Star (Very Poor)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Your Thoughts</label>
                <textarea
                  required
                  placeholder="Tell us about your experience with this companion..."
                  value={newReviewText}
                  onChange={(e) => setNewReviewText(e.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-border bg-background p-4 text-xs outline-none focus:border-accent resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-full bg-primary text-primary-foreground py-2.5 text-xs font-bold hover:opacity-90 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <FiSend /> Submit Review
              </button>
            </form>
          </div>

        </div>
      </section>
    </SiteLayout>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  FiCheck,
  FiHeart,
  FiStar,
  FiMessageSquare,
  FiSend,
  FiShoppingBag,
  FiPlay,
  FiEdit2,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { useCart } from "@/hooks/use-cart";
import { toast } from "sonner";
import { dbService, parseImages, safeUUID, type Review } from "@/services/db-service";

export const Route = createFileRoute("/pets/$petId")({
  loader: async ({ params }) => {
    return await dbService.getPet(params.petId);
  },
  head: ({ loaderData }) => {
    const title = loaderData
      ? `${loaderData.name} — Premium ${loaderData.breed} for Adoption & Sale | WOOLF.INDIA`
      : "Pet Details — WOOLF.INDIA";
    const description = loaderData
      ? `Meet ${loaderData.name}, a beautiful ${loaderData.age} old ${loaderData.breed} available on WOOLF.INDIA. ${loaderData.description.slice(0, 150)}...`
      : "View details of our premium companion pets available for adoption and sale across India.";
    const imageUrl = loaderData
      ? (parseImages(loaderData.image_url)[0] || loaderData.image_url)
      : "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&q=80&w=1200";

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: imageUrl },
        { property: "og:type", content: "product" },
        { property: "og:url", content: `https://woolfindia.com/pets/${loaderData?.id || ""}` },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: imageUrl },
      ],
    };
  },
  component: PetDetail,
});

function PetDetail() {
  const { petId } = Route.useParams();
  const loaderPet = Route.useLoaderData();
  const { add: addCartItem } = useCart();
  const queryClient = useQueryClient();

  const [newReviewAuthor, setNewReviewAuthor] = useState("");
  const [newReviewText, setNewReviewText] = useState("");
  const [newReviewRating, setNewReviewRating] = useState(5);

  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editReviewRating, setEditReviewRating] = useState(5);
  const [editReviewText, setEditReviewText] = useState("");

  const { data: pet, isLoading } = useQuery({
    queryKey: ["pet", petId],
    queryFn: () => dbService.getPet(petId),
    initialData: loaderPet || (() => {
      const localPets = dbService.initLocalData();
      return localPets.find((p) => p.id === petId) || undefined;
    }),
    staleTime: 0,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", petId],
    queryFn: () => dbService.getReviews(petId),
    initialData: () => {
      const allLocal = dbService.initLocalReviews();
      return allLocal.filter((r) => r.petId === petId);
    },
    staleTime: 0,
  });

  const submitReviewMutation = useMutation({
    mutationFn: (newReview: Omit<Review, "id" | "date">) => dbService.submitReview(newReview),
    onMutate: async (newReviewInput) => {
      await queryClient.cancelQueries({ queryKey: ["reviews", petId] });
      const previousReviews = queryClient.getQueryData<Review[]>(["reviews", petId]) || [];

      const optimisticReview: Review = {
        ...newReviewInput,
        id: safeUUID(),
        date: new Date().toISOString().split("T")[0],
      };

      queryClient.setQueryData<Review[]>(
        ["reviews", petId],
        [optimisticReview, ...previousReviews],
      );

      return { previousReviews };
    },
    onError: (err, newReview, context) => {
      if (context?.previousReviews) {
        queryClient.setQueryData(["reviews", petId], context.previousReviews);
      }
      toast.error("Failed to submit review. Saved locally.");
    },
    onSuccess: () => {
      toast.success("Thank you for your review!");
      setNewReviewAuthor("");
      setNewReviewText("");
      setNewReviewRating(5);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", petId] });
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: (id: string) => dbService.deleteReview(id, petId),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ["reviews", petId] });
      const previousReviews = queryClient.getQueryData<Review[]>(["reviews", petId]) || [];

      queryClient.setQueryData<Review[]>(
        ["reviews", petId],
        previousReviews.filter((r) => r.id !== deletedId),
      );

      return { previousReviews };
    },
    onError: (err, id, context) => {
      if (context?.previousReviews) {
        queryClient.setQueryData(["reviews", petId], context.previousReviews);
      }
      toast.error("Failed to delete review. Saved locally.");
    },
    onSuccess: () => {
      toast.success("Review deleted successfully.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", petId] });
    },
  });

  const updateReviewMutation = useMutation({
    mutationFn: ({ id, rating, text }: { id: string; rating: number; text: string }) =>
      dbService.updateReview(id, petId, rating, text),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["reviews", petId] });
      const previousReviews = queryClient.getQueryData<Review[]>(["reviews", petId]) || [];

      queryClient.setQueryData<Review[]>(
        ["reviews", petId],
        previousReviews.map((r) =>
          r.id === variables.id ? { ...r, rating: variables.rating, text: variables.text } : r,
        ),
      );

      return { previousReviews };
    },
    onError: (err, variables, context) => {
      if (context?.previousReviews) {
        queryClient.setQueryData(["reviews", petId], context.previousReviews);
      }
      toast.error("Failed to update review. Saved locally.");
    },
    onSuccess: () => {
      toast.success("Review updated successfully.");
      setEditingReviewId(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", petId] });
    },
  });

  const [showVideo, setShowVideo] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    setShowVideo(false);
    setActiveImageIndex(0);

    if (pet?.video_url) {
      setShowVideo(true);
    }
  }, [pet?.id, pet?.video_url]);

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewAuthor || !newReviewText) {
      toast.error("Please enter your name and review");
      return;
    }

    submitReviewMutation.mutate({
      petId: petId,
      author: newReviewAuthor,
      rating: newReviewRating,
      text: newReviewText,
    });
  };

  if (isLoading)
    return (
      <SiteLayout>
        <div className="mx-auto max-w-7xl px-6 py-32">
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      </SiteLayout>
    );
  if (!pet)
    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl px-6 py-32 text-center">
          <h1 className="font-display text-4xl">Pet not found</h1>
          <Link to="/pets" className="text-accent mt-4 inline-block">
            Back to all pets →
          </Link>
        </div>
      </SiteLayout>
    );

  // Filter reviews for this pet (with name-based fallbacks for default reviews)
  const petReviews = reviews.filter(
    (r) =>
      r.petId === pet.id ||
      (pet.name.toLowerCase() === "milo" &&
        (r.petId === "milo" || r.petId === "d1111111-1111-1111-1111-111111111111")) ||
      (pet.name.toLowerCase() === "luna" &&
        (r.petId === "luna" || r.petId === "d2222222-2222-2222-2222-222222222222")) ||
      (pet.name.toLowerCase() === "kiwi" &&
        (r.petId === "kiwi" || r.petId === "d4444444-4444-4444-4444-444444444444")) ||
      (pet.name.toLowerCase() === "mochi" &&
        (r.petId === "mochi" || r.petId === "d6666666-6666-6666-6666-666666666666")),
  );
  if (petReviews.length === 0) {
    petReviews.push(
      {
        id: `mock-1-${pet.id}`,
        petId: pet.id,
        author: "Aditi G.",
        rating: 5,
        text: `Absolutely love ${pet.name}! Super active and healthy.`,
        date: "2026-05-10",
      },
      {
        id: `mock-2-${pet.id}`,
        petId: pet.id,
        author: "Karan J.",
        rating: 5,
        text: `Great onboarding assistance from WOOLF.INDIA. Highly recommended.`,
        date: "2026-05-12",
      },
    );
  }

  const schemaMarkup = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": pet.name,
    "image": parseImages(pet.image_url)[0] || pet.image_url || "",
    "description": pet.description,
    "offers": {
      "@type": "Offer",
      "price": pet.price,
      "priceCurrency": "INR",
      "availability": "https://schema.org/InStock",
      "url": `https://woolfindia.com/pets/${pet.id}`,
    },
  };

  return (
    <SiteLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
      />
      {/* Top Detail Block with spacing and aligned tops */}
      <article className="mx-auto max-w-7xl px-6 pt-32 pb-16 grid lg:grid-cols-2 gap-12 items-start">
        {/* Media Block (Left Column) */}
        <div className="space-y-4 w-full">
          {showVideo && pet.video_url ? (
            <div className="relative rounded-[2.5rem] w-full aspect-square overflow-hidden shadow-soft bg-black border border-border animate-fade-in">
              <video src={pet.video_url} controls autoPlay className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="relative rounded-[2.5rem] w-full aspect-square overflow-hidden shadow-soft border border-border bg-card">
              <img
                src={parseImages(pet.image_url)[activeImageIndex] || pet.image_url || "/pet-1.jpg"}
                alt={`Premium pet companion ${pet.name} - ${pet.breed} breed`}
                className="w-full h-full object-cover"
                loading="eager"
              />
              {pet.video_url && (
                <button
                  onClick={() => setShowVideo(true)}
                  className="absolute bottom-4 right-4 bg-primary/80 hover:bg-primary text-primary-foreground rounded-full px-4 py-2 text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xs shadow-md transition cursor-pointer"
                >
                  <FiPlay size={12} /> Play Video
                </button>
              )}
            </div>
          )}

          {/* Media Thumbnails Navigation */}
          {(parseImages(pet.image_url).length > 1 || pet.video_url) && (
            <div className="flex flex-wrap gap-3 py-2">
              {parseImages(pet.image_url).map((imgUrl, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveImageIndex(idx);
                    setShowVideo(false);
                  }}
                  className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 transition cursor-pointer flex-shrink-0 ${
                    !showVideo && activeImageIndex === idx
                      ? "border-accent shadow-md scale-105"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`${pet.name} thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
              {pet.video_url && (
                <button
                  onClick={() => setShowVideo(true)}
                  className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 transition cursor-pointer flex-shrink-0 bg-black flex flex-col items-center justify-center text-white ${
                    showVideo
                      ? "border-accent shadow-md scale-105"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <FiPlay size={20} className="text-accent" />
                  <span className="text-[9px] font-bold uppercase mt-1">Video</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Details Block (Right Column) */}
        <div className="space-y-6">
          <div>
            <Link
              to="/pets"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              ← All pets
            </Link>
            <h1 className="mt-2 font-display text-5xl lg:text-6xl text-foreground leading-none">
              {pet.name}
            </h1>
            <div className="mt-2.5 text-xs text-muted-foreground font-medium tracking-wide uppercase">
              {pet.breed} • {pet.age} • {pet.type}
            </div>
          </div>

          <div className="border-t border-b border-border/60 py-4 flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
              Price
            </span>
            <div className="font-display text-4xl text-accent font-semibold">
              ₹{Number(pet.price).toFixed(0)}
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
              About {pet.name}
            </h2>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap break-words">
              {pet.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {pet.vaccinated && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-3 py-1 text-accent">
                <FiCheck /> Vaccinated
              </span>
            )}
            <span className="rounded-full bg-secondary px-3 py-1 text-muted-foreground">
              Health-checked
            </span>
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
            <Link
              to="/contact"
              className="rounded-full border border-border hover:bg-muted transition px-6 py-3 text-xs font-bold flex items-center justify-center"
            >
              Enquire to buy
            </Link>
            <button
              aria-label="Wishlist"
              className="rounded-full border border-border p-3 hover:bg-muted cursor-pointer transition text-muted-foreground"
            >
              <FiHeart />
            </button>
          </div>
        </div>
      </article>

      {/* Reviews Block */}
      <section className="mx-auto max-w-7xl px-6 py-16 border-t border-border/60">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          {/* Reviews List (Left Column, col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            <h2 className="font-display text-3xl flex items-center gap-2 text-foreground">
              <FiMessageSquare className="text-accent" /> Customer Reviews ({petReviews.length})
            </h2>

            <div className="space-y-4">
              {petReviews.map((r) => {
                const isEditing = editingReviewId === r.id;
                return (
                  <div
                    key={r.id}
                    className="bg-card p-6 rounded-3xl border border-border shadow-xs hover:border-border/100 transition duration-300 relative group"
                  >
                    {/* Inline edit/delete buttons - only show if not mock reviews */}
                    {!r.id.startsWith("mock-") && !isEditing && (
                      <div className="absolute top-6 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => {
                            setEditingReviewId(r.id);
                            setEditReviewRating(r.rating);
                            setEditReviewText(r.text);
                          }}
                          className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
                          aria-label="Edit review"
                        >
                          <FiEdit2 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this review?")) {
                              deleteReviewMutation.mutate(r.id);
                            }
                          }}
                          className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-destructive transition cursor-pointer"
                          aria-label="Delete review"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    )}

                    {isEditing ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!editReviewText.trim()) {
                            toast.error("Please enter review thoughts");
                            return;
                          }
                          updateReviewMutation.mutate({
                            id: r.id,
                            rating: editReviewRating,
                            text: editReviewText,
                          });
                        }}
                        className="space-y-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm text-foreground">
                            {r.author} (Editing)
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingReviewId(null)}
                            className="p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <FiX size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                              Rating
                            </label>
                            <select
                              value={editReviewRating}
                              onChange={(e) => setEditReviewRating(Number(e.target.value))}
                              className="w-full rounded-full border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-accent cursor-pointer"
                            >
                              <option value={5}>5 Stars</option>
                              <option value={4}>4 Stars</option>
                              <option value={3}>3 Stars</option>
                              <option value={2}>2 Stars</option>
                              <option value={1}>1 Star</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                            Your Thoughts
                          </label>
                          <textarea
                            required
                            value={editReviewText}
                            onChange={(e) => setEditReviewText(e.target.value)}
                            rows={3}
                            className="w-full rounded-xl border border-border bg-background p-3 text-xs outline-none focus:border-accent resize-none"
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="submit"
                            className="rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-[10px] font-bold hover:opacity-90 transition cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingReviewId(null)}
                            className="rounded-full border border-border bg-background px-4 py-1.5 text-[10px] font-bold hover:bg-muted transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-2 pr-14">
                          <span className="font-semibold text-sm text-foreground">{r.author}</span>
                          <span className="text-[10px] text-muted-foreground">{r.date}</span>
                        </div>
                        <div className="flex text-amber-500 mb-2">
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <FiStar key={i} className="fill-amber-500 text-amber-500" size={11} />
                          ))}
                        </div>
                        <p className="text-muted-foreground italic text-sm leading-relaxed">
                          "{r.text}"
                        </p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Review Form (Right Column, col-span-5) */}
          <div className="lg:col-span-5 bg-card border border-border p-8 rounded-3xl shadow-xs glass transition-all hover:border-border/100">
            <h3 className="font-display text-2xl mb-4 text-foreground">Add a Review</h3>
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Your Name
                  </label>
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
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Rating
                  </label>
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Your Thoughts
                </label>
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

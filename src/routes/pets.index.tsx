import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { dbService, Pet, Consultation, parseImages } from "@/services/db-service";
import { FiCheck, FiFilter, FiArrowRight, FiInfo } from "react-icons/fi";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/pets/")({
  head: () => ({
    meta: [
      { title: "Pets Marketplace — WOOLF.INDIA" },
      { name: "description", content: "Browse pets by type, breed, age and price, and request a personalized consultation." }
    ]
  }),
  component: PetsPage,
});

const TYPES = ["All", "Dog", "Cat", "Rabbit", "Bird", "Hamster"] as const;
const DOG_BREEDS = ["All Breeds", "Labrador", "Golden Retriever", "Beagle", "German Shepherd", "Poodle", "Other"] as const;

function PetsPage() {
  const queryClient = useQueryClient();
  const [type, setType] = useState<(typeof TYPES)[number]>("All");
  const [breed, setBreed] = useState<string>("All Breeds");
  const [saleType, setSaleType] = useState<"all" | "sale">("all");

  // Fetch pets
  const { data: pets, isLoading: petsLoading } = useQuery({
    queryKey: ["pets"],
    queryFn: () => dbService.getPets(),
    initialData: () => dbService.initLocalData(),
  });

  // Dynamically resolve maximum price from pet data, fallback to 5000
  const maxSliderValue = useMemo(() => {
    if (!pets || pets.length === 0) return 5000;
    const prices = pets.map(p => Number(p.price));
    const rawMax = Math.max(...prices, 5000);
    return Math.ceil(rawMax / 500) * 500;
  }, [pets]);

  const [max, setMax] = useState<number | null>(null);
  const currentMaxPrice = max ?? maxSliderValue;

  // Consultation form state
  const [consultName, setConsultName] = useState("");
  const [consultEmail, setConsultEmail] = useState("");
  const [consultPetType, setConsultPetType] = useState("Dog");
  const [consultPriceMin, setConsultPriceMin] = useState(100);
  const [consultPriceMax, setConsultPriceMax] = useState(1000);
  const [isSubmittingConsult, setIsSubmittingConsult] = useState(false);

  // Fetch consultations
  const { data: consultations, isLoading: consultsLoading } = useQuery({
    queryKey: ["consultations"],
    queryFn: () => dbService.getConsultations(),
  });

  // Reset breed filter if animal type changes
  const handleTypeChange = (newType: (typeof TYPES)[number]) => {
    setType(newType);
    setBreed("All Breeds");
  };

  const filtered = useMemo(() => {
    return (pets ?? [])
      .filter((p) => !p.adoption) // Completely remove adoption pets to scrub adoption from site
      .filter((p) => {
        // Animal Type Filter
        const matchType = type === "All" || p.type === type;

        // Breed Filter (Only active if Dog is selected)
        let matchBreed = true;
        if (type === "Dog" && breed !== "All Breeds") {
          if (breed === "Other") {
            matchBreed = !["labrador", "golden retriever", "beagle", "german shepherd", "poodle"].includes((p.breed || "").toLowerCase());
          } else {
            matchBreed = (p.breed || "").toLowerCase() === breed.toLowerCase();
          }
        }

        // Price filter: Only applies to pets that are for purchase.
        const matchPrice = Number(p.price) <= currentMaxPrice;

        return matchType && matchBreed && matchPrice;
      });
  }, [pets, type, breed, currentMaxPrice]);

  // Submit consultation
  const handleConsultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultName || !consultEmail) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsSubmittingConsult(true);
    try {
      await dbService.createConsultation({
        name: consultName,
        email: consultEmail,
        pet_type: consultPetType,
        price_min: Number(consultPriceMin),
        price_max: Number(consultPriceMax),
      });
      toast.success("Consultation request submitted successfully!");
      setConsultName("");
      setConsultEmail("");
      queryClient.invalidateQueries({ queryKey: ["consultations"] });
    } catch (err) {
      toast.error("Failed to submit consultation");
    } finally {
      setIsSubmittingConsult(false);
    }
  };

  return (
    <SiteLayout>
      {/* Page Header Section (Full Width with top padding to clear sticky navbar) */}
      <section className="mx-auto max-w-7xl px-6 pt-32 pb-4">
        <div className="text-xs uppercase tracking-[0.25em] text-accent font-semibold">Marketplace</div>
        <h1 className="mt-2 font-display text-5xl lg:text-6xl text-foreground leading-tight">Find your companion</h1>
        <p className="mt-3 text-muted-foreground text-sm lg:text-base max-w-2xl">
          Every pet is health-checked, ethically sourced, and ready for a loving home.
        </p>
      </section>

      {/* Main Layout Grid: Left Catalog, Right Consultation Sidebar */}
      <section className="mx-auto max-w-7xl px-6 pb-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Categories, Filters, & Pet Cards Grid */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Filters Bar Card */}
          <div className="space-y-4 bg-card/40 border border-border/80 rounded-3xl p-5 shadow-xs glass transition-all hover:border-border/100">
            {/* Animal Types Category Row */}
            <div className="flex flex-wrap items-center gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => handleTypeChange(t)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold tracking-wide transition cursor-pointer ${
                    type === t
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "border-border hover:bg-muted text-foreground/80"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Dog Breeds - Only shown when Dog type is selected */}
            {type === "Dog" && (
              <div className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-bold">
                  <FiFilter className="text-accent" /> Dog Breed Filter
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {DOG_BREEDS.map((b) => (
                    <button
                      key={b}
                      onClick={() => setBreed(b)}
                      className={`rounded-full px-3 py-1 text-[11px] font-medium transition cursor-pointer ${
                        breed === b
                          ? "bg-accent text-accent-foreground font-semibold"
                          : "bg-background hover:bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price slider and Purchase Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border/40">
              
              {/* Show All / For Purchase buttons */}
              <div className="flex rounded-full bg-muted p-1 border border-border max-w-fit">
                {(["all", "sale"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSaleType(mode)}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition cursor-pointer ${
                      saleType === mode
                        ? "bg-background text-foreground font-semibold shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {mode === "all" ? "Show All" : "For Purchase"}
                  </button>
                ))}
              </div>

              {/* Price Range Slider */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>Max Price: <strong className="text-foreground">₹{currentMaxPrice}</strong></span>
                <input
                  type="range"
                  min={50}
                  max={maxSliderValue}
                  step={50}
                  value={currentMaxPrice}
                  onChange={(e) => setMax(+e.target.value)}
                  className="accent-primary cursor-pointer w-32 sm:w-40 h-1.5 bg-muted rounded-lg appearance-none"
                />
              </div>
            </div>
          </div>

          {/* Pets Grid */}
          <div className="grid sm:grid-cols-2 gap-6">
            {petsLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-3xl" />)
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
                  </div>
                  <div className="p-5 pb-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-display text-2xl group-hover:text-accent transition-colors duration-300">{p.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{p.breed} • {p.age}</div>
                      </div>
                      <div className="shrink-0 ml-2">
                        <span className="inline-flex rounded-full bg-accent/15 px-3.5 py-1.5 text-xs font-semibold text-accent font-display">
                          ₹{Number(p.price).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-4 flex items-center justify-between border-t border-border/40 mt-4 bg-muted/10">
                  <div className="flex gap-1 text-[10px] text-muted-foreground font-medium">
                    {p.vaccinated && <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-0.5"><FiCheck className="text-accent" /> Vaccinated</span>}
                    <span className="rounded-full bg-secondary px-2.5 py-0.5">Health-checked</span>
                  </div>
                  <span className="text-[11px] font-bold text-accent group-hover:underline flex items-center gap-0.5 transition-colors">
                    View Details <FiArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            ))}
            {!petsLoading && filtered.length === 0 && (
              <p className="text-muted-foreground col-span-2 py-12 text-center border border-dashed border-border rounded-3xl bg-muted/10">No companions match your active filter settings.</p>
            )}
          </div>
        </div>

        {/* Right Column: Consultation Form & Recent Requests */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Consultation Form Card */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-xs glass transition-all hover:border-border/100">
            <h2 className="font-display text-2xl mb-1 text-foreground">Request a Consultation</h2>
            <p className="text-xs text-muted-foreground mb-5 leading-relaxed">Let our coordinator team find the perfect companion matching your budget.</p>
            
            <form onSubmit={handleConsultSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={consultName}
                  onChange={(e) => setConsultName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full rounded-full border border-border bg-background px-4 py-2.5 text-xs outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Email / Phone</label>
                <input
                  type="text"
                  required
                  value={consultEmail}
                  onChange={(e) => setConsultEmail(e.target.value)}
                  placeholder="e.g. john@example.com"
                  className="w-full rounded-full border border-border bg-background px-4 py-2.5 text-xs outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Type of Pet Wanted</label>
                <select
                  value={consultPetType}
                  onChange={(e) => setConsultPetType(e.target.value)}
                  className="w-full rounded-full border border-border bg-background px-4 py-2.5 text-xs outline-none focus:border-accent cursor-pointer"
                >
                  <option value="Dog">Dog</option>
                  <option value="Cat">Cat</option>
                  <option value="Rabbit">Rabbit</option>
                  <option value="Bird">Bird</option>
                  <option value="Hamster">Hamster</option>
                  <option value="Exotic">Exotic Pet</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Budget Range (₹)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={consultPriceMin}
                    onChange={(e) => setConsultPriceMin(Number(e.target.value))}
                    className="w-full rounded-full border border-border bg-background px-3 py-2 text-xs outline-none focus:border-accent"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={consultPriceMax}
                    onChange={(e) => setConsultPriceMax(Number(e.target.value))}
                    className="w-full rounded-full border border-border bg-background px-3 py-2 text-xs outline-none focus:border-accent"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingConsult}
                className="w-full rounded-full bg-primary text-primary-foreground py-2.5 text-xs font-bold hover:opacity-90 transition cursor-pointer"
              >
                {isSubmittingConsult ? "Submitting..." : "Submit Consultation"}
              </button>
            </form>
          </div>

          {/* Recent Requests Table */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-xs overflow-hidden glass transition-all hover:border-border/100">
            <h3 className="font-display text-xl mb-3 flex items-center gap-1.5 text-foreground"><FiInfo size={16} className="text-accent" /> Recent Requests</h3>
            {consultsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : consultations && consultations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2 font-semibold">Name</th>
                      <th className="py-2 font-semibold">Pet Type</th>
                      <th className="py-2 font-semibold">Budget</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultations.slice(0, 5).map((c) => (
                      <tr key={c.id} className="border-b border-border/40 last:border-0 hover:bg-muted/40 transition">
                        <td className="py-2 font-medium">{c.name}</td>
                        <td className="py-2">{c.pet_type}</td>
                        <td className="py-2 text-accent font-semibold">₹{c.price_min} - ₹{c.price_max}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground py-2 italic">No consultation requests submitted yet.</p>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

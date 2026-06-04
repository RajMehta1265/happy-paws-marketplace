import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { dbService, Pet, parseImages } from "@/services/db-service";
import { FiCheck, FiFilter, FiArrowRight, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/pets/")({
  head: () => ({
    meta: [
      { title: "Pets Marketplace — WOOLF.INDIA" },
      {
        name: "description",
        content:
          "Browse pets by type, breed, age and price, and request a personalized consultation.",
      },
    ],
  }),
  component: PetsPage,
});

// Base types always shown even if no pets exist for them yet
const BASE_TYPES = ["Dog", "Cat", "Rabbit", "Bird", "Hamster"];
const PETS_PER_PAGE = 6;

function PetsPage() {
  const queryClient = useQueryClient();
  const [type, setType] = useState<string>("All");
  const [breed, setBreed] = useState<string>("All Breeds");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch pets
  const { data: pets, isLoading: petsLoading } = useQuery({
    queryKey: ["pets"],
    queryFn: () => dbService.getPets(),
    initialData: () => dbService.initLocalData(),
    staleTime: 0,
  });

  // Dynamically resolve maximum price from pet data, fallback to 5000
  const maxSliderValue = useMemo(() => {
    if (!pets || pets.length === 0) return 5000;
    const prices = pets.map((p) => Number(p.price));
    const rawMax = Math.max(...prices, 5000);
    return Math.ceil(rawMax / 500) * 500;
  }, [pets]);

  const [max, setMax] = useState<number | null>(null);
  const currentMaxPrice = max ?? maxSliderValue;

  // Dynamically compute available types from pet data
  const availableTypes = useMemo(() => {
    const nonExotic = (pets ?? []).filter((p) => p.type.toLowerCase() !== "exotic" && !p.adoption);
    const dataTypes = [...new Set(nonExotic.map((p) => p.type))];
    // Merge base types with any new types from data, preserving order
    const merged = [...BASE_TYPES];
    dataTypes.forEach((t) => {
      if (!merged.includes(t)) merged.push(t);
    });
    return ["All", ...merged];
  }, [pets]);

  // Dynamically compute companion types for the consultation form
  const consultationTypes = useMemo(() => {
    const types = availableTypes.filter((t) => t !== "All" && t.toLowerCase() !== "exotic");
    return [...types, "Exotic"];
  }, [availableTypes]);

  // Dynamically compute available breeds for the selected type
  const availableBreeds = useMemo(() => {
    if (type === "All") return [];
    const petsOfType = (pets ?? []).filter(
      (p) => p.type === type && p.type.toLowerCase() !== "exotic" && !p.adoption,
    );
    const breeds = [...new Set(petsOfType.map((p) => p.breed).filter(Boolean))] as string[];
    breeds.sort((a, b) => a.localeCompare(b));
    return breeds.length > 0 ? ["All Breeds", ...breeds] : [];
  }, [pets, type]);

  // Consultation form state
  const [consultName, setConsultName] = useState("");
  const [consultEmail, setConsultEmail] = useState("");
  const [consultPetType, setConsultPetType] = useState("Dog");
  const [consultBreed, setConsultBreed] = useState("");
  const [consultPriceMin, setConsultPriceMin] = useState(100);
  const [consultPriceMax, setConsultPriceMax] = useState(1000);
  const [isSubmittingConsult, setIsSubmittingConsult] = useState(false);

  // Dynamically compute available breeds for the chosen consultation type
  const consultAvailableBreeds = useMemo(() => {
    if (!consultPetType) return [];
    const petsOfType = (pets ?? []).filter(
      (p) => p.type.toLowerCase() === consultPetType.toLowerCase(),
    );
    const breeds = [...new Set(petsOfType.map((p) => p.breed).filter(Boolean))] as string[];
    breeds.sort((a, b) => a.localeCompare(b));
    return breeds;
  }, [pets, consultPetType]);

  // Reset breed filter if animal type changes
  const handleTypeChange = (newType: string) => {
    setType(newType);
    setBreed("All Breeds");
    setCurrentPage(1);
  };

  const filtered = useMemo(() => {
    return (pets ?? [])
      .filter((p) => p.type.toLowerCase() !== "exotic") // Exclude exotic pets from normal pet page
      .filter((p) => !p.adoption) // Completely remove adoption pets to scrub adoption from site
      .filter((p) => {
        // Animal Type Filter
        const matchType = type === "All" || p.type === type;

        // Breed Filter
        let matchBreed = true;
        if (type !== "All" && breed !== "All Breeds") {
          matchBreed = (p.breed || "").toLowerCase() === breed.toLowerCase();
        }

        // Price filter: Only applies to pets that are for purchase.
        const matchPrice = Number(p.price) <= currentMaxPrice;

        return matchType && matchBreed && matchPrice;
      });
  }, [pets, type, breed, currentMaxPrice]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PETS_PER_PAGE));
  const paginatedPets = useMemo(() => {
    const start = (currentPage - 1) * PETS_PER_PAGE;
    return filtered.slice(start, start + PETS_PER_PAGE);
  }, [filtered, currentPage]);

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [type, breed, currentMaxPrice]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
        breed: consultBreed || null,
        price_min: Number(consultPriceMin),
        price_max: Number(consultPriceMax),
      });
      toast.success("Consultation request submitted successfully!");
      setConsultName("");
      setConsultEmail("");
      setConsultBreed("");
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
        <div className="text-xs uppercase tracking-[0.25em] text-accent font-semibold">
          Marketplace
        </div>
        <h1 className="mt-2 font-display text-5xl lg:text-6xl text-foreground leading-tight">
          Find your companion
        </h1>
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
              {availableTypes.map((t) => (
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

            {/* Breed Filter - dynamically generated from pet data */}
            {type !== "All" && availableBreeds.length > 1 && (
              <div className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-bold">
                  <FiFilter className="text-accent" /> {type} Breed Filter
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {availableBreeds.map((b) => (
                    <button
                      key={b}
                      onClick={() => {
                        setBreed(b);
                        setCurrentPage(1);
                      }}
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

            {/* Price Filter */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t border-border/40">
              <span className="text-xs text-muted-foreground">
                Max Price: <strong className="text-foreground">₹{currentMaxPrice}</strong>
              </span>
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

          {/* Pets Grid */}
          <div className="grid sm:grid-cols-2 gap-6">
            {petsLoading
              ? Array.from({ length: PETS_PER_PAGE }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[4/3] rounded-3xl" />
                ))
              : paginatedPets.map((p) => (
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
                            <div className="font-display text-2xl group-hover:text-accent transition-colors duration-300">
                              {p.name}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {p.breed} • {p.age}
                            </div>
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
                        {p.vaccinated && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-0.5">
                            <FiCheck className="text-accent" /> Vaccinated
                          </span>
                        )}
                        <span className="rounded-full bg-secondary px-2.5 py-0.5">
                          Health-checked
                        </span>
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
              <p className="text-muted-foreground col-span-2 py-12 text-center border border-dashed border-border rounded-3xl bg-muted/10">
                No companions match your active filter settings.
              </p>
            )}
          </div>

          {/* Pagination Controls */}
          {!petsLoading && totalPages > 1 && (
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
                  // Show first, last, current, and neighbors; ellipsis for gaps
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
          {!petsLoading && filtered.length > 0 && (
            <div className="text-center text-xs text-muted-foreground">
              Showing {(currentPage - 1) * PETS_PER_PAGE + 1}–
              {Math.min(currentPage * PETS_PER_PAGE, filtered.length)} of {filtered.length}{" "}
              companions
            </div>
          )}
        </div>

        {/* Right Column: Consultation Form & Recent Requests */}
        <div className="lg:col-span-4 space-y-6">
          {/* Consultation Form Card */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-xs glass transition-all hover:border-border/100">
            <h2 className="font-display text-2xl mb-1 text-foreground">Request a Consultation</h2>
            <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
              Let our coordinator team find the perfect companion matching your budget.
            </p>

            <form onSubmit={handleConsultSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Your Name
                </label>
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Email / Phone
                </label>
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Type of Pet Wanted
                </label>
                <input
                  type="text"
                  required
                  list="consult-pet-types"
                  value={consultPetType}
                  onChange={(e) => setConsultPetType(e.target.value)}
                  placeholder="e.g. Dog, Cat, Parrot..."
                  className="w-full rounded-full border border-border bg-background px-4 py-2.5 text-xs outline-none focus:border-accent"
                />
                <datalist id="consult-pet-types">
                  {consultationTypes.map((t) => (
                    <option key={t} value={t === "Exotic" ? "Exotic" : t}>
                      {t === "Exotic" ? "Exotic Pet" : t}
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Breed Wanted (Optional)
                </label>
                <input
                  type="text"
                  list="consult-pet-breeds"
                  value={consultBreed}
                  onChange={(e) => setConsultBreed(e.target.value)}
                  placeholder="e.g. Golden Retriever, Beagle..."
                  className="w-full rounded-full border border-border bg-background px-4 py-2.5 text-xs outline-none focus:border-accent"
                />
                <datalist id="consult-pet-breeds">
                  {consultAvailableBreeds.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Budget Range (₹)
                </label>
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
        </div>
      </section>
    </SiteLayout>
  );
}

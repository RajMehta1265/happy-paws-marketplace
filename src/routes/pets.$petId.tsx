<<<<<<< HEAD
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { pets } from "@/data/sample";
import { FiCheck, FiHeart } from "react-icons/fi";

export const Route = createFileRoute("/pets/$petId")({
  component: PetDetail,
  notFoundComponent: () => (
    <SiteLayout><div className="mx-auto max-w-3xl px-6 py-32 text-center"><h1 className="font-display text-4xl">Pet not found</h1><Link to="/pets" className="text-primary mt-4 inline-block">Back to all pets →</Link></div></SiteLayout>
  ),
  loader: ({ params }) => {
    const pet = pets.find((p) => p.id === params.petId);
    if (!pet) throw notFound();
    return pet;
  },
});

function PetDetail() {
  const pet = Route.useLoaderData();
  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-6 py-16 grid lg:grid-cols-2 gap-12">
        <img src={pet.image} alt={pet.name} width={800} height={800} className="rounded-[2.5rem] w-full aspect-square object-cover shadow-soft" />
=======
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FiCheck, FiHeart } from "react-icons/fi";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/pets/$petId")({
  component: PetDetail,
});

function PetDetail() {
  const { petId } = Route.useParams();
  const { data: pet, isLoading } = useQuery({
    queryKey: ["pet", petId],
    queryFn: async () => {
      const { data, error } = await supabase.from("pets").select("*").eq("id", petId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <SiteLayout><div className="mx-auto max-w-7xl px-6 py-16"><Skeleton className="h-96 rounded-3xl" /></div></SiteLayout>;
  if (!pet) return <SiteLayout><div className="mx-auto max-w-3xl px-6 py-32 text-center"><h1 className="font-display text-4xl">Pet not found</h1><Link to="/pets" className="text-accent mt-4 inline-block">Back to all pets →</Link></div></SiteLayout>;

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-6 py-16 grid lg:grid-cols-2 gap-12">
        <img src={pet.image_url ?? "/pet-1.jpg"} alt={pet.name} width={800} height={800} className="rounded-[2.5rem] w-full aspect-square object-cover shadow-soft" />
>>>>>>> c5e86efeed0b9449abf0d48921bc94c99347db72
        <div>
          <Link to="/pets" className="text-sm text-muted-foreground hover:text-foreground">← All pets</Link>
          <h1 className="mt-3 font-display text-5xl lg:text-6xl">{pet.name}</h1>
          <div className="mt-2 text-muted-foreground">{pet.breed} • {pet.age} • {pet.type}</div>
<<<<<<< HEAD
          <div className="mt-6 font-display text-4xl text-primary">${pet.price}</div>
          <p className="mt-6 leading-relaxed">{pet.description}</p>
          <div className="mt-6 flex flex-wrap gap-2 text-sm">
            {pet.vaccinated && <span className="inline-flex items-center gap-1 rounded-full bg-accent/60 px-3 py-1"><FiCheck /> Vaccinated</span>}
            <span className="rounded-full bg-secondary px-3 py-1">Health-checked</span>
            <span className="rounded-full bg-secondary px-3 py-1">Microchipped</span>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <button className="rounded-full bg-primary px-6 py-3 text-primary-foreground hover:opacity-90 transition">Buy now</button>
            {pet.adoption && <button className="rounded-full border border-border px-6 py-3 hover:bg-muted">Apply to adopt</button>}
=======
          <div className="mt-6 font-display text-4xl text-accent">${Number(pet.price).toFixed(0)}</div>
          <p className="mt-6 leading-relaxed">{pet.description}</p>
          <div className="mt-6 flex flex-wrap gap-2 text-sm">
            {pet.vaccinated && <span className="inline-flex items-center gap-1 rounded-full bg-accent/30 px-3 py-1"><FiCheck /> Vaccinated</span>}
            <span className="rounded-full bg-secondary px-3 py-1">Health-checked</span>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/contact" className="rounded-full bg-primary px-6 py-3 text-primary-foreground hover:opacity-90 transition">Enquire to buy</Link>
            {pet.adoption && <Link to="/adoption" className="rounded-full border border-border px-6 py-3 hover:bg-muted">Apply to adopt</Link>}
>>>>>>> c5e86efeed0b9449abf0d48921bc94c99347db72
            <button aria-label="Wishlist" className="rounded-full border border-border p-3 hover:bg-muted"><FiHeart /></button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

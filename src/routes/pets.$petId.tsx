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
        <div>
          <Link to="/pets" className="text-sm text-muted-foreground hover:text-foreground">← All pets</Link>
          <h1 className="mt-3 font-display text-5xl lg:text-6xl">{pet.name}</h1>
          <div className="mt-2 text-muted-foreground">{pet.breed} • {pet.age} • {pet.type}</div>
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
            <button aria-label="Wishlist" className="rounded-full border border-border p-3 hover:bg-muted"><FiHeart /></button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

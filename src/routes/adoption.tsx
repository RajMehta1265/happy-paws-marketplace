import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { pets } from "@/data/sample";
import { FiHeart } from "react-icons/fi";

export const Route = createFileRoute("/adoption")({
  head: () => ({ meta: [{ title: "Adoption — PawHaven" }, { name: "description", content: "Rescue pets looking for a loving home." }] }),
  component: AdoptionPage,
});

function AdoptionPage() {
  const rescues = pets.filter((p) => p.adoption);
  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-6 pt-16">
        <div className="text-xs uppercase tracking-[0.25em] text-primary">Adoption Center</div>
        <h1 className="mt-2 font-display text-5xl lg:text-6xl max-w-3xl">Every rescue has a story. Help us write the next chapter.</h1>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rescues.map((p) => (
          <div key={p.id} className="rounded-3xl bg-card overflow-hidden hover-lift">
            <img src={p.image} alt={p.name} width={800} height={800} loading="lazy" className="aspect-[4/3] w-full object-cover" />
            <div className="p-5">
              <div className="font-display text-2xl">{p.name}</div>
              <div className="text-sm text-muted-foreground">{p.breed} • {p.age}</div>
              <p className="mt-3 text-sm">{p.description}</p>
              <button className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground text-sm">
                <FiHeart /> Adopt {p.name}
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-3xl px-6 my-16 rounded-[2rem] bg-accent/40 p-10">
        <h3 className="font-display text-3xl">Adoption request</h3>
        <p className="mt-2 text-muted-foreground text-sm">We review every application personally. Tell us a little about your home.</p>
        <form className="mt-6 grid gap-4">
          <input className="rounded-full border border-input bg-background px-5 py-3" placeholder="Full name" />
          <input className="rounded-full border border-input bg-background px-5 py-3" placeholder="Email" />
          <input className="rounded-full border border-input bg-background px-5 py-3" placeholder="Pet you'd like to adopt" />
          <textarea rows={4} className="rounded-2xl border border-input bg-background px-5 py-3" placeholder="Tell us about your home" />
          <button className="rounded-full bg-primary px-6 py-3 text-primary-foreground">Submit application</button>
        </form>
      </section>
    </SiteLayout>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { pets, products } from "@/data/sample";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "My Account — PawHaven" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-6 py-16 grid lg:grid-cols-[260px_1fr] gap-10">
        <aside className="rounded-3xl bg-card border border-border p-6 h-fit">
          <div className="font-display text-xl">Welcome back</div>
          <div className="text-sm text-muted-foreground">Hannah</div>
          <nav className="mt-6 grid gap-1 text-sm">
            {["Overview", "Orders", "Bookings", "Wishlist", "Profile"].map((n) => (
              <button key={n} className="text-left rounded-lg px-3 py-2 hover:bg-muted">{n}</button>
            ))}
          </nav>
        </aside>
        <div className="grid gap-8">
          <Card title="Recent orders">
            <ul className="divide-y divide-border">
              {products.slice(0, 2).map((p) => (
                <li key={p.id} className="py-3 flex justify-between text-sm">
                  <span>{p.name}</span><span className="text-primary">${p.price}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Upcoming bookings">
            <div className="text-sm">Puppy Foundations — Sat 24 May, 10:00am</div>
          </Card>
          <Card title="Wishlist">
            <div className="grid sm:grid-cols-3 gap-4">
              {pets.slice(0, 3).map((p) => (
                <Link key={p.id} to="/pets/$petId" params={{ petId: p.id }} className="rounded-2xl overflow-hidden bg-secondary/50 hover-lift">
                  <img src={p.image} alt={p.name} width={400} height={400} className="aspect-square object-cover w-full" loading="lazy" />
                  <div className="p-3 text-sm">{p.name} <span className="text-primary float-right">${p.price}</span></div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </SiteLayout>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-card border border-border p-7">
      <h3 className="font-display text-2xl mb-4">{title}</h3>
      {children}
    </div>
  );
}

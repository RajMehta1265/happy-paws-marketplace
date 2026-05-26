<<<<<<< HEAD
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
=======
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PawHaven" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });
  const { data: orders } = useQuery({
    queryKey: ["orders", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false })).data ?? [],
  });

  const [form, setForm] = useState({ full_name: "", phone: "", address_line: "", city: "", postal_code: "", country: "" });
  useEffect(() => { if (profile) setForm({
    full_name: profile.full_name ?? "", phone: profile.phone ?? "", address_line: profile.address_line ?? "",
    city: profile.city ?? "", postal_code: profile.postal_code ?? "", country: profile.country ?? "",
  }); }, [profile]);

  const save = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    if (error) toast.error(error.message); else toast.success("Profile saved");
  };

  const claimAdmin = async () => {
    const { data, error } = await supabase.rpc("claim_first_admin");
    if (error) toast.error(error.message);
    else if (data) { toast.success("You are now an admin! Reload the page."); }
    else toast.info("An admin already exists.");
  };

  if (!user) return null;
  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-6 py-16 space-y-10">
        <header>
          <h1 className="font-display text-5xl">Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</h1>
          <p className="mt-2 text-muted-foreground">{user.email}</p>
        </header>

        <div className="rounded-3xl bg-card border border-border p-8">
          <h2 className="font-display text-2xl">Profile & shipping</h2>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            {(["full_name","phone","address_line","city","postal_code","country"] as const).map((k) => (
              <input key={k} placeholder={k.replace("_"," ")} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                className="rounded-full border border-input bg-background px-5 py-3 capitalize" />
            ))}
          </div>
          <button onClick={save} className="mt-4 rounded-full bg-primary px-6 py-3 text-primary-foreground">Save</button>
        </div>

        <div className="rounded-3xl bg-card border border-border p-8">
          <h2 className="font-display text-2xl">Orders</h2>
          {!orders || orders.length === 0 ? (
            <p className="mt-3 text-muted-foreground">No orders yet. <Link to="/products" className="text-accent">Start shopping →</Link></p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {orders.map((o) => (
                <li key={o.id} className="py-4 flex justify-between items-center">
                  <div>
                    <div className="font-medium">Order #{o.id.slice(0,8)}</div>
                    <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()} • {o.order_items?.length ?? 0} items</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg text-accent">${Number(o.total).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground capitalize">{o.status}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl bg-accent/20 border border-border p-6 text-sm">
          <p>First user can claim admin access to manage pets & products.</p>
          <button onClick={claimAdmin} className="mt-3 rounded-full border border-border bg-background px-4 py-2">Claim admin role</button>
>>>>>>> c5e86efeed0b9449abf0d48921bc94c99347db72
        </div>
      </section>
    </SiteLayout>
  );
}
<<<<<<< HEAD

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-card border border-border p-7">
      <h3 className="font-display text-2xl mb-4">{title}</h3>
      {children}
    </div>
  );
}
=======
>>>>>>> c5e86efeed0b9449abf0d48921bc94c99347db72

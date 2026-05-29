import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — WOOLF.INDIA" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id], enabled: !!user,
    queryFn: async () => {
      const isMock = !!localStorage.getItem("pawhaven_mock_session");
      if (isMock) {
        const stored = localStorage.getItem(`pawhaven_profile_${user!.id}`);
        if (stored) {
          try { return JSON.parse(stored); } catch {}
        }
        return {
          full_name: user!.user_metadata?.full_name || "",
          phone: "",
          address_line: "",
          city: "",
          postal_code: "",
          country: ""
        };
      }
      return (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data;
    },
  });
  const { data: orders } = useQuery({
    queryKey: ["orders", user?.id], enabled: !!user,
    queryFn: async () => {
      const isMock = !!localStorage.getItem("pawhaven_mock_session");
      if (isMock) {
        const stored = localStorage.getItem("pawhaven_orders") || "[]";
        try {
          return JSON.parse(stored);
        } catch {
          return [];
        }
      }
      return (await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false })).data ?? [];
    },
  });

  const [form, setForm] = useState({ full_name: "", phone: "", address_line: "", city: "", postal_code: "", country: "" });
  useEffect(() => { if (profile) setForm({
    full_name: profile.full_name ?? "", phone: profile.phone ?? "", address_line: profile.address_line ?? "",
    city: profile.city ?? "", postal_code: profile.postal_code ?? "", country: profile.country ?? "",
  }); }, [profile]);

  const save = async () => {
    if (!user) return;
    const isMock = !!localStorage.getItem("pawhaven_mock_session");
    if (isMock) {
      const stored = localStorage.getItem("pawhaven_mock_session");
      if (stored) {
        try {
          const sessionData = JSON.parse(stored);
          sessionData.user.user_metadata = {
            ...sessionData.user.user_metadata,
            full_name: form.full_name
          };
          localStorage.setItem("pawhaven_mock_session", JSON.stringify(sessionData));
          localStorage.setItem(`pawhaven_profile_${user.id}`, JSON.stringify(form));
          window.dispatchEvent(new Event("auth-change"));
          toast.success("Profile saved locally!");
        } catch (e) {
          console.error(e);
        }
      }
      return;
    }
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    if (error) toast.error(error.message); else toast.success("Profile saved");
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
              {orders.map((o: any) => (
                <li key={o.id} className="py-4 flex justify-between items-center">
                  <div>
                    <div className="font-medium">Order #{o.id.slice(0,8)}</div>
                    <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()} • {o.order_items?.length ?? 0} items</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg text-accent">₹{Number(o.total).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground capitalize">{o.status}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}


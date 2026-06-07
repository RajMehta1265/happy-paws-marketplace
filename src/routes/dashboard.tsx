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
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const isMock = !!localStorage.getItem("pawhaven_mock_session");
      if (isMock) {
        const stored = localStorage.getItem(`pawhaven_profile_${user!.id}`);
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch {}
        }
        return {
          full_name: user!.user_metadata?.full_name || "",
          phone: "",
          address_line: "",
          city: "",
          postal_code: "",
          country: "",
        };
      }
      return (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data;
    },
  });
  const { data: orders } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
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
      return (
        (
          await supabase
            .from("orders")
            .select("*, order_items(*)")
            .order("created_at", { ascending: false })
        ).data ?? []
      );
    },
  });

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    address_line: "",
    city: "",
    postal_code: "",
    country: "",
  });
  useEffect(() => {
    if (profile)
      setForm({
        full_name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        address_line: profile.address_line ?? "",
        city: profile.city ?? "",
        postal_code: profile.postal_code ?? "",
        country: profile.country ?? "",
      });
  }, [profile]);

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
            full_name: form.full_name,
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
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  };

  if (!user) return null;
  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-6 py-16 space-y-10">
        <header>
          <h1 className="font-display text-5xl">
            Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {user.email || user.phone || "No email/phone linked"}
          </p>
        </header>

        <div className="rounded-3xl bg-card border border-border p-8">
          <h2 className="font-display text-2xl">Profile & shipping</h2>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            {(
              ["full_name", "phone", "address_line", "city", "postal_code", "country"] as const
            ).map((k) => (
              <input
                key={k}
                placeholder={k.replace("_", " ")}
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                className="rounded-full border border-input bg-background px-5 py-3 capitalize"
              />
            ))}
          </div>
          <button
            onClick={save}
            className="mt-4 rounded-full bg-primary px-6 py-3 text-primary-foreground"
          >
            Save
          </button>
        </div>

        <div className="rounded-3xl bg-card border border-border p-8">
          <h2 className="font-display text-2xl">Orders</h2>
          {!orders || orders.length === 0 ? (
            <p className="mt-3 text-muted-foreground">
              No orders yet.{" "}
              <Link to="/products" className="text-accent">
                Start shopping →
              </Link>
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {orders.map((o: any) => (
                <li key={o.id} className="py-4 flex justify-between items-center">
                  <div>
                    <div className="font-medium">Order #{o.id.slice(0, 8)}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString()} • {o.order_items?.length ?? 0}{" "}
                      items
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg text-accent">
                      ₹{Number(o.total).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">{o.status}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Explore Training Programs Section */}
        <div className="rounded-3xl bg-card border border-border p-8 md:p-10 space-y-8 animate-fade-in text-foreground">
          <div>
            <h2 className="font-display text-3xl">Professional Pet Training Packages</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              From basic house manners to advanced off-leash obedience, explore our comprehensive conditioning programs.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Basic Obedience Card */}
            <div className="rounded-[2rem] bg-background border border-border/80 p-8 flex flex-col justify-between hover:shadow-lg hover:border-primary/20 transition-all duration-300">
              <div className="space-y-6">
                <div className="flex justify-between items-start flex-wrap gap-4 border-b border-border/60 pb-5">
                  <div>
                    <span className="text-2xl">🦴</span>
                    <h3 className="font-display text-xl font-bold text-foreground mt-2">Basic Obedience Commands</h3>
                    <p className="text-xs text-muted-foreground mt-1">For puppies and beginners</p>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl font-bold text-primary">₹15,000</div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">6–8 Sessions</span>
                  </div>
                </div>

                {/* Basic Highlights */}
                <div className="grid sm:grid-cols-2 gap-4 text-xs leading-relaxed">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-bold text-foreground mb-1">🦴 Basic Commands</h4>
                      <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                        <li>Sit, Stay, Come (Recall)</li>
                        <li>Down (Lie Down)</li>
                        <li>Leave it / Drop it</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground mb-1">🐕‍🦺 Leash Training</h4>
                      <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                        <li>Walking calmly on a leash</li>
                        <li>Not pulling or lunging</li>
                        <li>Direction & pace shifts</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground mb-1">🧠 Focus & Attention</h4>
                      <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                        <li>Name recognition</li>
                        <li>Eye contact on command</li>
                        <li>Ignore distractions</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="font-bold text-foreground mb-1">🏡 House Manners</h4>
                      <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                        <li>No jumping on people</li>
                        <li>Waiting at doors</li>
                        <li>No begging during meals</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground mb-1">💩 Toilet Training</h4>
                      <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                        <li>Crate training guidance</li>
                        <li>Toilet schedule planning</li>
                        <li>Indoor vs outdoor strategies</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground mb-1">🐶 Socialization & Fixes</h4>
                      <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                        <li>Dog & stranger exposure</li>
                        <li>Nipping & biting fixes</li>
                        <li>Correct household chewing</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-4 text-[10px] text-muted-foreground space-y-0.5">
                  <div>🎁 <strong>Included:</strong> Treat advice, practicing calendar, WhatsApp support.</div>
                  <div>🗓️ <strong>Format:</strong> 45-60 min sessions at home or training center.</div>
                </div>
              </div>

              <Link
                to="/training"
                className="mt-8 w-full rounded-full bg-primary text-primary-foreground hover:opacity-90 font-bold py-3 text-xs text-center transition cursor-pointer shadow-md"
              >
                Book Basic Obedience Package
              </Link>
            </div>

            {/* Advanced Training Card */}
            <div className="rounded-[2rem] bg-background border border-border/80 p-8 flex flex-col justify-between hover:shadow-lg hover:border-primary/20 transition-all duration-300">
              <div className="space-y-6">
                <div className="flex justify-between items-start flex-wrap gap-4 border-b border-border/60 pb-5">
                  <div>
                    <span className="text-2xl">🐕</span>
                    <h3 className="font-display text-xl font-bold text-foreground mt-2">Advanced Dog Training</h3>
                    <p className="text-xs text-muted-foreground mt-1">Intermediate to Advanced level</p>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl font-bold text-primary">₹20,000</div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">8–12 Sessions</span>
                  </div>
                </div>

                {/* Advanced Highlights */}
                <div className="grid sm:grid-cols-2 gap-4 text-xs leading-relaxed">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-bold text-foreground mb-1">🐕 Precision Control</h4>
                      <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                        <li>Distance control commands</li>
                        <li>Extended stays + distractions</li>
                        <li>Off-leash command control</li>
                        <li>Heel walking precision</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground mb-1">🧠 Impulse & Discipline</h4>
                      <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                        <li>Food release waiting release</li>
                        <li>Doorway rush control</li>
                        <li>Calm greeting greetings</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground mb-1">🐕‍🦺 Leash & Outdoor</h4>
                      <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                        <li>Loose-leash walking</li>
                        <li>Traffic/crowds control</li>
                        <li>Emergency stop & recall</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="font-bold text-foreground mb-1">🧠 Focus Under Distraction</h4>
                      <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                        <li>Ignoring food & animals</li>
                        <li>Parks/markets obedience</li>
                        <li>Sustained focus on handler</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground mb-1">⚠️ Behavior Modification</h4>
                      <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                        <li>Reactivity (dogs/cars)</li>
                        <li>Aggression management</li>
                        <li>Separation anxiety & guarding</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground mb-1">🎯 Off-Leash Reliability</h4>
                      <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                        <li>Safe zone off-leash recall</li>
                        <li>Emergency command recall</li>
                        <li>Real-world proofing</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-4 text-[10px] text-muted-foreground space-y-0.5">
                  <div>🎁 <strong>Included:</strong> Custom plan, owner drills, reports, WhatsApp support.</div>
                  <div>🗓️ <strong>Format:</strong> 60-75 min sessions. Ahmedabad home + outdoors.</div>
                </div>
              </div>

              <Link
                to="/training"
                className="mt-8 w-full rounded-full bg-primary text-primary-foreground hover:opacity-90 font-bold py-3 text-xs text-center transition cursor-pointer shadow-md"
              >
                Book Advanced Program Package
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

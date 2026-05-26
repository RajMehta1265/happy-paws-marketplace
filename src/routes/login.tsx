import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — PawHaven" }] }),
  component: LoginPage,
});

function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  const onGoogle = async () => {
    const { lovable } = await import("@/integrations/lovable");
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (result.error) toast.error(result.error.message ?? "Google sign-in failed");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: fullName } },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to verify.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteLayout>
      <section className="mx-auto max-w-md px-6 py-24">
        <div className="rounded-[2rem] bg-card border border-border p-10 shadow-soft">
          <h1 className="font-display text-4xl">{mode === "signin" ? "Welcome back" : "Join PawHaven"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to your PawHaven account." : "Create an account to shop, adopt, and track orders."}
          </p>

          <button onClick={onGoogle} type="button" className="mt-6 w-full rounded-full border border-border bg-background px-6 py-3 hover:bg-muted transition">
            Continue with Google
          </button>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <form className="grid gap-3" onSubmit={submit}>
            {mode === "signup" && (
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="rounded-full border border-input bg-background px-5 py-3" placeholder="Full name" />
            )}
            <input required value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-full border border-input bg-background px-5 py-3" placeholder="Email" type="email" />
            <input required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-full border border-input bg-background px-5 py-3" placeholder="Password (min 6)" type="password" />
            <button disabled={loading} className="rounded-full bg-primary px-6 py-3 text-primary-foreground disabled:opacity-60">
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground text-center">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-primary hover:underline">
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}

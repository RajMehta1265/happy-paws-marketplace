import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — WOOLF.INDIA" }] }),
  component: LoginPage,
});

function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupCompleted, setSignupCompleted] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate({ to: "/" });
    }
  }, [user, navigate]);

  const onGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/",
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error("Supabase Google Auth failed:", err);
      toast.error(`Google OAuth failed: ${(err as Error).message}`);
    }
  };

  const resendEmail = async () => {
    if (!verificationEmail) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: verificationEmail,
        options: {
          emailRedirectTo: window.location.origin + "/",
        },
      });
      if (error) throw error;
      toast.success("Verification email resent successfully!");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setResending(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/",
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        setVerificationEmail(email);
        setSignupCompleted(true);
        toast.success("Account created! Check your email to verify.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (signupCompleted) {
    return (
      <SiteLayout>
        <section className="mx-auto max-w-md px-6 py-20">
          <div className="rounded-[2rem] bg-card border border-border p-10 shadow-soft text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 text-accent-foreground animate-pulse">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-mail"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <h1 className="font-display text-3xl">Verify your email</h1>
            <p className="mt-4 text-sm text-muted-foreground">
              We've sent a verification link to{" "}
              <span className="font-semibold text-foreground">{verificationEmail}</span>.
            </p>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              Please check your inbox and spam folders, then click the link to confirm your account
              and log in.
            </p>

            <div className="mt-8 space-y-3">
              <a
                href="https://mail.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-primary-foreground hover:opacity-90 transition font-medium text-sm cursor-pointer shadow-sm"
              >
                Open Gmail
              </a>
              <button
                disabled={resending}
                onClick={resendEmail}
                className="w-full rounded-full border border-border bg-background px-6 py-3 hover:bg-muted transition text-sm font-medium disabled:opacity-60 cursor-pointer"
              >
                {resending ? "Resending email..." : "Resend verification email"}
              </button>
              <button
                onClick={() => {
                  setSignupCompleted(false);
                  setMode("signin");
                }}
                className="w-full rounded-full bg-accent/10 hover:bg-accent/20 px-6 py-3 transition text-sm font-semibold text-accent-foreground cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-md px-6 py-20">
        <div className="rounded-[2rem] bg-card border border-border p-10 shadow-soft">
          <h1 className="font-display text-4xl">
            {mode === "signin" ? "Welcome back" : "Join WOOLF.INDIA"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to your WOOLF.INDIA account."
              : "Create an account to shop, adopt, and track orders."}
          </p>

          <button
            onClick={onGoogle}
            type="button"
            className="mt-6 w-full rounded-full border border-border bg-background px-6 py-3 hover:bg-muted transition cursor-pointer"
          >
            Continue with Google
          </button>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <form className="grid gap-3" onSubmit={submit}>
            {mode === "signup" && (
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="rounded-full border border-input bg-background px-5 py-3"
                placeholder="Full name"
              />
            )}
            <input
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-full border border-input bg-background px-5 py-3"
              placeholder="Email"
              type="email"
            />
            <input
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-full border border-input bg-background px-5 py-3"
              placeholder="Password (min 6)"
              type="password"
            />
            <button
              disabled={loading}
              className="rounded-full bg-primary px-6 py-3 text-primary-foreground disabled:opacity-60 cursor-pointer"
            >
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground text-center">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-primary hover:underline cursor-pointer"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}

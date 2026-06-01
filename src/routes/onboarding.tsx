import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendEmail } from "@/services/mail-service";
import { mailTemplates } from "@/services/mail-templates";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Complete Profile — WOOLF.INDIA" }] }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { user, isProfileComplete, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    address_line: "",
    city: "",
    postal_code: "",
    country: "India",
  });

  // If already complete, go to home
  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate({ to: "/login" });
      } else if (isProfileComplete) {
        navigate({ to: "/" });
      }
    }
  }, [user, isProfileComplete, loading, navigate]);

  // Load existing profile details if any
  useEffect(() => {
    if (user) {
      const loadProfile = async () => {
        const isMock = !!localStorage.getItem("pawhaven_mock_session");
        if (isMock) {
          const stored = localStorage.getItem(`pawhaven_profile_${user.id}`);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              setForm((prev) => ({ ...prev, ...parsed }));
            } catch (err) {
              console.error("Failed to parse local mock profile:", err);
            }
          }
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (data) {
          setForm({
            full_name: data.full_name ?? "",
            phone: data.phone ?? "",
            address_line: data.address_line ?? "",
            city: data.city ?? "",
            postal_code: data.postal_code ?? "",
            country: data.country ?? "India",
          });
        }
      };
      loadProfile();
    }
  }, [user]);

  const handleSkip = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pawhaven_skip_onboarding", "true");
    }
    navigate({ to: "/" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!form.full_name.trim() || !form.phone.trim()) {
        toast.error("Please fill in your name and phone number.");
        return;
      }
      const nameRegex = /^[A-Za-z\s]+$/;
      if (!nameRegex.test(form.full_name.trim())) {
        toast.error("Full name must contain only letters and spaces.");
        return;
      }
      if (form.full_name.trim().length < 2) {
        toast.error("Full name must be at least 2 characters long.");
        return;
      }
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(form.phone.trim())) {
        toast.error("Phone number must be exactly 10 digits (numbers only).");
        return;
      }
      setStep(2);
      return;
    }

    if (
      !form.address_line.trim() ||
      !form.city.trim() ||
      !form.postal_code.trim() ||
      !form.country.trim()
    ) {
      toast.error("Please fill in your complete shipping address.");
      return;
    }

    if (form.country.trim().toLowerCase() === "india") {
      const pinRegex = /^\d{6}$/;
      if (!pinRegex.test(form.postal_code.trim())) {
        toast.error("Postal code must be exactly 6 digits for India (numbers only).");
        return;
      }
    } else {
      const codeRegex = /^[A-Za-z0-9\s-]+$/;
      if (!codeRegex.test(form.postal_code.trim())) {
        toast.error("Postal code must contain only alphanumeric characters, spaces, or hyphens.");
        return;
      }
    }

    setSaving(true);
    try {
      const isMock = !!localStorage.getItem("pawhaven_mock_session");
      if (isMock) {
        localStorage.setItem(`pawhaven_profile_${user!.id}`, JSON.stringify(form));

        // Also update full name in mock session user_metadata
        const storedSession = localStorage.getItem("pawhaven_mock_session");
        if (storedSession) {
          try {
            const parsed = JSON.parse(storedSession);
            parsed.user.user_metadata = {
              ...parsed.user.user_metadata,
              full_name: form.full_name,
            };
            localStorage.setItem("pawhaven_mock_session", JSON.stringify(parsed));
          } catch (err) {
            console.error("Failed to update mock session metadata:", err);
          }
        }

        window.dispatchEvent(new Event("auth-change"));
        toast.success("Profile details saved locally!");
        await refreshProfile();
        if (user?.email) {
          const welcomeHtml = mailTemplates.getWelcomeEmail({ toName: form.full_name });
          sendEmail(user.email, "Welcome to WOOLF.INDIA!", welcomeHtml);
        }
        navigate({ to: "/" });
        return;
      }

      // Upsert profile data
      const { error } = await supabase.from("profiles").upsert({
        id: user!.id,
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        address_line: form.address_line.trim(),
        city: form.city.trim(),
        postal_code: form.postal_code.trim(),
        country: form.country.trim(),
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("Welcome aboard! Profile completed successfully.");
      await refreshProfile();
      if (user?.email) {
        const welcomeHtml = mailTemplates.getWelcomeEmail({ toName: form.full_name });
        sendEmail(user.email, "Welcome to WOOLF.INDIA!", welcomeHtml);
      }
      navigate({ to: "/" });
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <SiteLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground mt-4 font-medium">Preparing onboarding...</p>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-md px-6 py-16">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-[0.25em] text-accent font-bold">
            Onboarding
          </div>
          <h1 className="mt-2 font-display text-4xl">Complete Your Profile</h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Welcome to WOOLF.INDIA! To shop, adopt, and track orders, please provide your billing
            and shipping details.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 flex gap-2">
          <div
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${step >= 1 ? "bg-primary" : "bg-muted"}`}
          />
          <div
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${step >= 2 ? "bg-primary" : "bg-muted"}`}
          />
        </div>

        <div className="rounded-[2rem] bg-card border border-border p-8 shadow-soft">
          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 ? (
              <div className="space-y-4 animate-fade-in">
                <h3 className="font-display text-xl font-semibold mb-4 text-foreground">
                  Step 1: Contact Details
                </h3>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Full Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. John Doe"
                    value={form.full_name}
                    onChange={(e) =>
                      setForm({ ...form, full_name: e.target.value.replace(/[^A-Za-z\s]/g, "") })
                    }
                    className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Phone Number *
                  </label>
                  <input
                    required
                    type="tel"
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })
                    }
                    className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <button
                  type="submit"
                  className="mt-6 w-full rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground font-semibold hover:opacity-90 transition cursor-pointer shadow-sm"
                >
                  Continue to Address
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <h3 className="font-display text-xl font-semibold mb-4 text-foreground">
                  Step 2: Shipping Address
                </h3>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Address Line *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Apartment, Suite, Street Address"
                    value={form.address_line}
                    onChange={(e) => setForm({ ...form, address_line: e.target.value })}
                    className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">City *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Mumbai"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Postal Code *
                    </label>
                    <input
                      required
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 400001"
                      value={form.postal_code}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          postal_code:
                            form.country.toLowerCase() === "india"
                              ? e.target.value.replace(/\D/g, "").slice(0, 6)
                              : e.target.value.replace(/[^A-Za-z0-9\s-]/g, ""),
                        })
                      }
                      className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Country *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. India"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="rounded-full border border-input bg-background px-5 py-3 text-sm focus:outline-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold hover:bg-muted transition cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground font-semibold disabled:opacity-60 cursor-pointer shadow-sm"
                  >
                    {saving ? "Saving..." : "Complete Signup"}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Skip for now option */}
          <div className="mt-6 text-center border-t border-border/60 pt-4">
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer underline underline-offset-4"
            >
              Skip for now & explore website
            </button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

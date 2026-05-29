import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { FiMapPin, FiMail, FiPhone, FiInstagram } from "react-icons/fi";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — WOOLF.INDIA" },
      { name: "description", content: "Get in touch with our team." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      toast.error("Please fill in all the fields.");
      return;
    }

    setSubmitting(true);
    try {
      const isMock = !!localStorage.getItem("pawhaven_mock_session");
      if (isMock) {
        // Save to mock submissions list
        const stored = localStorage.getItem("pawhaven_contact_submissions") || "[]";
        let submissions = [];
        try {
          submissions = JSON.parse(stored);
        } catch {
          submissions = [];
        }
        submissions.push({
          id: crypto.randomUUID(),
          ...form,
          created_at: new Date().toISOString(),
        });
        localStorage.setItem("pawhaven_contact_submissions", JSON.stringify(submissions));
        toast.success("Message submitted successfully (Mock Session)!");
        setForm({ name: "", email: "", subject: "", message: "" });
        return;
      }

      // Insert submission into database
      const { error } = await supabase.from("contact_submissions").insert({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
      });

      if (error) throw error;

      toast.success("Thank you! Your message has been sent successfully.");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      console.error(err);
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-6 py-16 grid lg:grid-cols-2 gap-12">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-primary">Contact</div>
          <h1 className="mt-2 font-display text-5xl lg:text-6xl">Say hello.</h1>
          <p className="mt-4 text-muted-foreground">
            We'd love to hear from you — about a pet, a product, or anything in between.
          </p>
          <ul className="mt-8 space-y-4">
            <li className="flex items-center gap-3">
              <FiMapPin className="text-primary shrink-0" /> Ahmedabad, Gujarat, India
            </li>
            <li className="flex items-center gap-3">
              <FiMail className="text-primary shrink-0" /> woolf.indiaa@gmail.com
            </li>
            <li className="flex items-center gap-3">
              <FiPhone className="text-primary shrink-0" />{" "}
              <a href="tel:+918128040638" className="hover:underline">
                Priyansh Parmar: +91 81280 40638
              </a>
            </li>
          </ul>

          <div className="mt-6">
            <a
              href="https://www.instagram.com/woolf.india/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-accent transition-colors"
            >
              <FiInstagram className="text-lg" /> Follow us on Instagram: @woolf.india
            </a>
          </div>

          <iframe
            title="map"
            className="mt-8 w-full rounded-3xl border border-border"
            height="280"
            src="https://www.openstreetmap.org/export/embed.html?bbox=72.50%2C22.95%2C72.65%2C23.10&layer=mapnik"
          />
        </div>
        <form
          onSubmit={handleSubmit}
          className="rounded-[2rem] bg-card p-8 border border-border h-fit grid gap-4"
        >
          <input
            required
            disabled={submitting}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-full border border-input bg-background px-5 py-3"
            placeholder="Name"
          />
          <input
            required
            disabled={submitting}
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-full border border-input bg-background px-5 py-3"
            placeholder="Email"
          />
          <input
            required
            disabled={submitting}
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="rounded-full border border-input bg-background px-5 py-3"
            placeholder="Subject"
          />
          <textarea
            required
            disabled={submitting}
            rows={6}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="rounded-2xl border border-input bg-background px-5 py-3"
            placeholder="Your message"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-primary px-6 py-3 text-primary-foreground disabled:opacity-65 cursor-pointer hover:opacity-90 transition font-medium"
          >
            {submitting ? "Sending..." : "Send message"}
          </button>
        </form>
      </section>
    </SiteLayout>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { FiMapPin, FiMail, FiPhone } from "react-icons/fi";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact — PawHaven" }, { name: "description", content: "Get in touch with our team." }] }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-6 py-16 grid lg:grid-cols-2 gap-12">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-primary">Contact</div>
          <h1 className="mt-2 font-display text-5xl lg:text-6xl">Say hello.</h1>
          <p className="mt-4 text-muted-foreground">We'd love to hear from you — about a pet, a product, or anything in between.</p>
          <ul className="mt-8 space-y-4">
            <li className="flex items-center gap-3"><FiMapPin className="text-primary" /> 12 Meadow Lane, Cotswolds, UK</li>
            <li className="flex items-center gap-3"><FiMail className="text-primary" /> hello@pawhaven.co</li>
            <li className="flex items-center gap-3"><FiPhone className="text-primary" /> +44 1234 567 890</li>
          </ul>
          <iframe title="map" className="mt-8 w-full rounded-3xl border border-border" height="280"
            src="https://www.openstreetmap.org/export/embed.html?bbox=-1.95%2C51.78%2C-1.78%2C51.88&layer=mapnik" />
        </div>
        <form className="rounded-[2rem] bg-card p-8 border border-border h-fit grid gap-4">
          <input className="rounded-full border border-input bg-background px-5 py-3" placeholder="Name" />
          <input className="rounded-full border border-input bg-background px-5 py-3" placeholder="Email" />
          <input className="rounded-full border border-input bg-background px-5 py-3" placeholder="Subject" />
          <textarea rows={6} className="rounded-2xl border border-input bg-background px-5 py-3" placeholder="Your message" />
          <button className="rounded-full bg-primary px-6 py-3 text-primary-foreground">Send message</button>
        </form>
      </section>
    </SiteLayout>
  );
}

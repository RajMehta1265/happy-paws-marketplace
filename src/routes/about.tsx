import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About — WOOLF.INDIA" }, { name: "description", content: "Our mission, values, and animal care standards." }] }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-4xl px-6 py-20">
        <div className="text-xs uppercase tracking-[0.25em] text-primary">About</div>
        <h1 className="mt-2 font-display text-5xl lg:text-6xl">Built by people who'd rather be with animals.</h1>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
          WOOLF.INDIA began in 2021 as a small rescue in the countryside. Today we are a marketplace, training studio and care shop — but our heart is unchanged: gentle care, ethical sourcing, and lifelong support for every family we welcome.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-6 grid md:grid-cols-3 gap-6">
        {[
          { t: "Our mission", b: "To make ethical pet ownership warm, accessible and joyful." },
          { t: "Our values", b: "Kindness first. Transparency always. Animals are family." },
          { t: "Our standards", b: "Every pet vaccinated, health-checked and ethically raised." },
        ].map((c) => (
          <div key={c.t} className="rounded-3xl bg-card p-7 border border-border">
            <div className="font-display text-2xl">{c.t}</div>
            <p className="mt-2 text-sm text-muted-foreground">{c.b}</p>
          </div>
        ))}
      </section>
    </SiteLayout>
  );
}

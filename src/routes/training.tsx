import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { trainingPlans, trainers } from "@/data/sample";
import { FiAward, FiClock, FiUsers } from "react-icons/fi";

export const Route = createFileRoute("/training")({
  head: () => ({ meta: [{ title: "Pet Training — PawHaven" }, { name: "description", content: "Gentle, science-based training. Online and in-person." }] }),
  component: TrainingPage,
});

function TrainingPage() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-6 pt-16">
        <div className="text-xs uppercase tracking-[0.25em] text-primary">Training</div>
        <h1 className="mt-2 font-display text-5xl lg:text-6xl max-w-3xl">Skills built on trust, not fear.</h1>
        <p className="mt-4 text-muted-foreground max-w-xl">Our certified trainers use positive reinforcement to shape calm, confident pets — at home or in our studio.</p>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 grid md:grid-cols-3 gap-6">
        {trainingPlans.map((t) => (
          <div key={t.id} className="rounded-3xl border border-border bg-card p-7 hover-lift">
            <div className="text-xs uppercase tracking-wider text-primary">{t.mode}</div>
            <h3 className="mt-2 font-display text-2xl">{t.title}</h3>
            <div className="mt-1 text-sm text-muted-foreground flex items-center gap-1"><FiClock /> {t.duration}</div>
            <ul className="mt-5 space-y-2 text-sm">
              {t.perks.map((p) => <li key={p} className="flex gap-2"><FiAward className="text-primary mt-0.5 shrink-0" /> {p}</li>)}
            </ul>
            <div className="mt-6 flex items-center justify-between">
              <span className="font-display text-2xl">${t.price}</span>
              <button className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90">Book session</button>
            </div>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="font-display text-4xl mb-10">Our trainers</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {trainers.map((t) => (
            <div key={t.name} className="rounded-3xl bg-card p-7 border border-border">
              <div className="grid place-items-center h-16 w-16 rounded-full bg-accent/60 text-primary"><FiUsers size={24} /></div>
              <div className="mt-4 font-display text-xl">{t.name}</div>
              <div className="text-sm text-muted-foreground">{t.specialty}</div>
              <div className="mt-2 text-xs text-primary">{t.years} years experience</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 my-16">
        <div className="rounded-[2rem] bg-accent/40 p-10 lg:p-14">
          <h3 className="font-display text-3xl">Book an appointment</h3>
          <form className="mt-6 grid md:grid-cols-2 gap-4">
            <input className="rounded-full border border-input bg-background px-5 py-3" placeholder="Your name" />
            <input className="rounded-full border border-input bg-background px-5 py-3" placeholder="Pet name & breed" />
            <input type="date" className="rounded-full border border-input bg-background px-5 py-3" />
            <select className="rounded-full border border-input bg-background px-5 py-3">
              {trainingPlans.map((t) => <option key={t.id}>{t.title}</option>)}
            </select>
            <button className="md:col-span-2 rounded-full bg-primary px-6 py-3 text-primary-foreground">Request booking</button>
          </form>
        </div>
      </section>
    </SiteLayout>
  );
}

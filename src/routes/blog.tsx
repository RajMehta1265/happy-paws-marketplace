import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { blogs } from "@/data/sample";

export const Route = createFileRoute("/blog")({
  head: () => ({ meta: [{ title: "Journal — PawHaven" }, { name: "description", content: "Pet care tips, training advice and nutrition guidance." }] }),
  component: BlogPage,
});

function BlogPage() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-6 pt-16">
        <div className="text-xs uppercase tracking-[0.25em] text-primary">Journal</div>
        <h1 className="mt-2 font-display text-5xl lg:text-6xl">Stories, tips and gentle wisdom.</h1>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-16 grid md:grid-cols-3 gap-6">
        {blogs.map((b) => (
          <article key={b.id} className="rounded-3xl bg-card p-7 border border-border hover-lift">
            <div className="text-xs text-muted-foreground">{b.date} • {b.read}</div>
            <h2 className="mt-3 font-display text-2xl">{b.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{b.excerpt}</p>
            <a href="#" className="mt-4 inline-block text-sm text-primary hover:underline">Read article →</a>
          </article>
        ))}
      </section>
    </SiteLayout>
  );
}

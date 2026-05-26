import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — PawHaven" }] }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-md px-6 py-24">
        <div className="rounded-[2rem] bg-card border border-border p-10">
          <h1 className="font-display text-4xl">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to your PawHaven account.</p>
          <form className="mt-6 grid gap-4">
            <input className="rounded-full border border-input bg-background px-5 py-3" placeholder="Email" type="email" />
            <input className="rounded-full border border-input bg-background px-5 py-3" placeholder="Password" type="password" />
            <button className="rounded-full bg-primary px-6 py-3 text-primary-foreground">Sign in</button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground text-center">
            New here? <Link to="/login" className="text-primary">Create an account</Link>
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}

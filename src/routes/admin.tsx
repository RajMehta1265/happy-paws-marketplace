import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { pets, products } from "@/data/sample";
import { FiUsers, FiPackage, FiCalendar, FiTrendingUp } from "react-icons/fi";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — PawHaven" }] }),
  component: AdminPage,
});

const stats = [
  { label: "Users", value: "2,431", icon: FiUsers },
  { label: "Orders", value: "318", icon: FiPackage },
  { label: "Bookings", value: "47", icon: FiCalendar },
  { label: "Revenue", value: "$48.2k", icon: FiTrendingUp },
];

function AdminPage() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-xs uppercase tracking-[0.25em] text-primary">Admin</div>
        <h1 className="mt-2 font-display text-5xl">Dashboard</h1>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-3xl bg-card border border-border p-6">
              <s.icon className="text-primary" size={22} />
              <div className="mt-3 font-display text-3xl">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl bg-card border border-border p-7">
          <h3 className="font-display text-2xl mb-4">Monthly orders</h3>
          <div className="flex items-end gap-2 h-44">
            {[40, 65, 30, 80, 55, 90, 70, 95, 60, 75, 85, 100].map((v, i) => (
              <div key={i} className="flex-1 rounded-t-lg bg-primary/80" style={{ height: `${v}%` }} />
            ))}
          </div>
        </div>

        <div className="mt-10 grid lg:grid-cols-2 gap-6">
          <Table title="Pets" headers={["Name", "Breed", "Price"]} rows={pets.slice(0, 4).map((p) => [p.name, p.breed, `$${p.price}`])} />
          <Table title="Products" headers={["Name", "Category", "Price"]} rows={products.slice(0, 4).map((p) => [p.name, p.category, `$${p.price}`])} />
        </div>
      </section>
    </SiteLayout>
  );
}

function Table({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  return (
    <div className="rounded-3xl bg-card border border-border p-7">
      <h3 className="font-display text-2xl mb-4">{title}</h3>
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr>{headers.map((h) => <th key={h} className="py-2">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border">
              {r.map((c, j) => <td key={j} className="py-2">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

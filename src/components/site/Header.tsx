import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FiMenu, FiX, FiShoppingBag, FiUser, FiLogOut } from "react-icons/fi";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";

const nav = [
  { to: "/", label: "Home" },
  { to: "/pets", label: "Pets" },
  { to: "/adoption", label: "Adopt" },
  { to: "/training", label: "Training" },
  { to: "/products", label: "Shop" },
  { to: "/blog", label: "Journal" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground font-display text-lg">P</span>
          <span className="font-display text-2xl tracking-tight">PawHaven</span>
        </Link>
        <nav className="hidden lg:flex items-center gap-7 text-sm">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} activeProps={{ className: "text-primary" }} className="text-foreground/70 hover:text-foreground transition-colors">
              {n.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin" activeProps={{ className: "text-accent" }} className="text-accent/80 hover:text-accent">Admin</Link>
          )}
        </nav>
        <div className="hidden lg:flex items-center gap-3">
          <Link to="/cart" aria-label="Cart" className="relative rounded-full p-2 hover:bg-muted">
            <FiShoppingBag />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">{count}</span>
            )}
          </Link>
          {user ? (
            <>
              <Link to="/dashboard" className="rounded-full p-2 hover:bg-muted" aria-label="Account"><FiUser /></Link>
              <button onClick={handleSignOut} className="rounded-full p-2 hover:bg-muted" aria-label="Sign out"><FiLogOut /></button>
            </>
          ) : (
            <Link to="/login" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 transition">
              <FiUser /> Sign in
            </Link>
          )}
        </div>
        <button className="lg:hidden p-2" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <FiX size={22} /> : <FiMenu size={22} />}
        </button>
      </div>
      {open && (
        <div className="lg:hidden border-t border-border bg-background">
          <nav className="flex flex-col p-4 gap-2">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-muted">{n.label}</Link>
            ))}
            <Link to="/cart" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-muted">Cart ({count})</Link>
            {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-muted">Admin</Link>}
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-muted">Dashboard</Link>
                <button onClick={handleSignOut} className="rounded-lg px-3 py-2 hover:bg-muted text-left">Sign out</button>
              </>
            ) : (
              <Link to="/login" onClick={() => setOpen(false)} className="rounded-lg bg-primary px-3 py-2 text-primary-foreground text-center mt-2">Sign in</Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

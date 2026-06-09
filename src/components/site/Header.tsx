import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FiMenu, FiX, FiShoppingBag, FiUser, FiLogOut, FiSun, FiMoon } from "react-icons/fi";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { toast } from "sonner";
import { WolfLogo } from "@/components/ui/WolfLogo";

const nav = [
  { to: "/", label: "Home" },
  { to: "/pets", label: "Pets" },
  { to: "/exotics", label: "Exotic Pets" },
  { to: "/products", label: "Products" },
  { to: "/training", label: "Training" },
  { to: "/hostelling", label: "Hostelling" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [isHome, setIsHome] = useState(pathname === "/");
  const [visible, setVisible] = useState(pathname !== "/");

  useEffect(() => {
    const isCurrentHome = window.location.pathname === "/";
    setIsHome(isCurrentHome);
    
    const handleScroll = () => {
      if (!isCurrentHome) {
        setVisible(true);
      } else {
        setVisible(window.scrollY > window.innerHeight * 9.8);
      }
    };
    
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkTheme();
    window.addEventListener("woolf_theme_changed", checkTheme);
    return () => window.removeEventListener("woolf_theme_changed", checkTheme);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("woolf_theme", "dark");
      toast.success("Switched to Luxury Dark Mode");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("woolf_theme", "light");
      toast.success("Switched to Classic Light Mode");
    }
    window.dispatchEvent(new Event("woolf_theme_changed"));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <header
      className={`z-50 transition-all duration-500 ${
        isHome ? "fixed top-0 left-0 w-full" : "sticky top-0"
      } ${
        visible
          ? "glass opacity-100 translate-y-0 pointer-events-auto border-b border-border/20 shadow-sm"
          : "opacity-0 -translate-y-full pointer-events-none"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
          <WolfLogo className="h-12 w-12 sm:h-15 sm:w-15 text-primary group-hover:scale-105 group-hover:text-accent transition-all duration-300 shrink-0" />
          <span className="font-display font-extrabold text-lg sm:text-2xl lg:text-3xl tracking-[0.1em] sm:tracking-[0.2em] text-foreground group-hover:text-accent transition-colors duration-300 select-none">
            WOOLF.INDIA
          </span>
        </Link>
        <nav className="hidden xl:flex items-center gap-7 text-sm">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeProps={{ className: "text-primary" }}
              className="text-foreground/70 hover:text-foreground transition-colors"
            >
              {n.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              activeProps={{ className: "text-accent" }}
              className="text-accent/80 hover:text-accent"
            >
              Admin
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-3">

          {/* Cart Icon */}
          <Link
            to="/cart"
            aria-label="Cart"
            className="relative rounded-full p-2 hover:bg-muted flex items-center justify-center"
          >
            <FiShoppingBag size={18} />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 grid h-4 w-4 sm:h-5 sm:w-5 place-items-center rounded-full bg-accent text-[9px] sm:text-[10px] font-bold text-accent-foreground">
                {count}
              </span>
            )}
          </Link>

          {/* Auth & Account Buttons */}
          <div className="hidden sm:flex items-center gap-1.5 sm:gap-3">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="rounded-full p-2 hover:bg-muted"
                  aria-label="Account"
                >
                  <FiUser />
                </Link>
                <button
                  onClick={handleSignOut}
                  className="rounded-full p-2 hover:bg-muted"
                  aria-label="Sign out"
                >
                  <FiLogOut />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 transition"
              >
                <FiUser /> Sign in
              </Link>
            )}
          </div>

          {/* Mobile hamburger menu */}
          <button
            className="xl:hidden p-2 hover:bg-muted rounded-full"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="xl:hidden border-t border-border bg-background">
          <nav className="flex flex-col p-4 gap-2">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-muted"
              >
                {n.label}
              </Link>
            ))}
            <Link
              to="/cart"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-muted"
            >
              Cart ({count})
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-muted"
              >
                Admin
              </Link>
            )}


            {user ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 hover:bg-muted"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="rounded-lg px-3 py-2 hover:bg-muted text-left"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-primary px-3 py-2 text-primary-foreground text-center mt-2"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

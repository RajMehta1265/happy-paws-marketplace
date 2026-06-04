import { Link } from "@tanstack/react-router";
import { FiInstagram, FiTwitter, FiFacebook } from "react-icons/fi";
import { useState, useEffect } from "react";
import { WolfLogo } from "@/components/ui/WolfLogo";

export function Footer() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkTheme();
    window.addEventListener("woolf_theme_changed", checkTheme);
    return () => window.removeEventListener("woolf_theme_changed", checkTheme);
  }, []);

  return (
    <footer className="mt-24 border-t border-border bg-secondary/50">
      <div className="mx-auto max-w-7xl px-6 py-16 grid gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            {isDark ? (
              <img
                src="/woolfindia.jpg"
                alt="WOOLF.INDIA"
                className="h-16 w-auto sm:h-20 object-contain"
                style={{
                  filter: "invert(1) sepia(1) saturate(5) hue-rotate(15deg) brightness(0.9) contrast(1.2)",
                  mixBlendMode: "screen",
                }}
              />
            ) : (
              <WolfLogo className="h-10 w-10 text-primary" />
            )}
            <span className="font-display font-extrabold text-xl tracking-[0.15em] text-foreground">
              WOOLF.INDIA
            </span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground max-w-xs">
            Nourishing bonds, naturally. Premium companions, ethical sourcing, and gentle training.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-3">Explore</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/pets" className="hover:text-foreground">
                Pets
              </Link>
            </li>
            <li>
              <Link to="/training" className="hover:text-foreground">
                Training
              </Link>
            </li>
            <li>
              <Link to="/products" className="hover:text-foreground">
                Products
              </Link>
            </li>
            <li>
              <Link to="/hostelling" className="hover:text-foreground">
                Hostelling
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-3">Care</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/exotics" className="hover:text-foreground">
                Exotic Pets
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-foreground">
                About us
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-foreground">
                Contact
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="hover:text-foreground">
                My account
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-3">Stay close</h4>
          <p className="text-sm text-muted-foreground mb-3">Gentle stories, care tips, no noise.</p>
          <form className="flex gap-2">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm"
            />
            <button className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">
              Join
            </button>
          </form>
          <div className="mt-4 flex gap-3 text-foreground/70">
            <a
              href="https://www.instagram.com/woolf.india/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <FiInstagram />
            </a>
            <a href="#" aria-label="Twitter">
              <FiTwitter />
            </a>
            <a href="#" aria-label="Facebook">
              <FiFacebook />
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} WOOLF.INDIA — Nourishing Bonds. Naturally.
      </div>
    </footer>
  );
}

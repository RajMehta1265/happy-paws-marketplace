import { Link } from "@tanstack/react-router";
import { FiInstagram } from "react-icons/fi";
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
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-24 grid grid-cols-12 gap-x-6 gap-y-12 lg:gap-x-12">
        <div className="col-span-12 md:col-span-6 xl:col-span-4">
          <div className="flex items-center gap-4">
            <WolfLogo className="h-16 w-16 sm:h-20 sm:w-20 text-primary shrink-0" />
            <span className="font-display font-extrabold text-2xl sm:text-3xl tracking-[0.15em] text-foreground">
              WOOLF.INDIA
            </span>
          </div>
          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-sm leading-relaxed">
            Nourishing bonds, naturally. Premium companions, ethical sourcing, and gentle training.
          </p>
        </div>
        <div className="col-span-6 md:col-span-3 xl:col-span-2">
          <h4 className="text-base sm:text-lg font-bold tracking-wider mb-5 uppercase text-foreground">Explore</h4>
          <ul className="space-y-3.5 text-base sm:text-lg text-muted-foreground">
            <li>
              <Link to="/pets" className="hover:text-foreground transition-colors">
                Pets
              </Link>
            </li>
            <li>
              <Link to="/training" className="hover:text-foreground transition-colors">
                Training
              </Link>
            </li>
            <li>
              <Link to="/products" className="hover:text-foreground transition-colors">
                Products
              </Link>
            </li>
            <li>
              <Link to="/hostelling" className="hover:text-foreground transition-colors">
                Hostelling
              </Link>
            </li>
          </ul>
        </div>
        <div className="col-span-6 md:col-span-3 xl:col-span-2">
          <h4 className="text-base sm:text-lg font-bold tracking-wider mb-5 uppercase text-foreground">Care</h4>
          <ul className="space-y-3.5 text-base sm:text-lg text-muted-foreground">
            <li>
              <Link to="/exotics" className="hover:text-foreground transition-colors">
                Exotic Pets
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-foreground transition-colors">
                About us
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-foreground transition-colors">
                Contact
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="hover:text-foreground transition-colors">
                My account
              </Link>
            </li>
          </ul>
        </div>
        <div className="col-span-12 md:col-span-12 xl:col-span-4 max-w-md">
          <h4 className="text-base sm:text-lg font-bold tracking-wider mb-5 uppercase text-foreground">Stay close</h4>
          <p className="text-base sm:text-lg text-muted-foreground mb-5 leading-relaxed">Gentle stories, care tips, no noise.</p>
          <form className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 min-w-0 rounded-full border border-input bg-background px-5 py-3.5 text-base sm:text-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button className="rounded-full bg-primary px-6 py-3.5 text-base sm:text-lg font-bold text-primary-foreground hover:opacity-90 transition-opacity whitespace-nowrap shrink-0">
              Join
            </button>
          </form>
          <div className="mt-6 flex gap-4 text-foreground/80">
            <a
              href="https://www.instagram.com/woolf.india/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
              aria-label="Instagram"
            >
              <FiInstagram size={24} />
            </a>

          </div>
        </div>
      </div>
      <div className="border-t border-border py-8 text-center text-sm sm:text-base text-muted-foreground">
        © {new Date().getFullYear()} WOOLF.INDIA — Nourishing Bonds. Naturally.
      </div>
    </footer>
  );
}

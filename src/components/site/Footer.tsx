import { Link } from "@tanstack/react-router";
import { FiInstagram, FiTwitter, FiFacebook } from "react-icons/fi";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/50">
      <div className="mx-auto max-w-7xl px-6 py-16 grid gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground font-display text-lg">P</span>
            <span className="font-display text-2xl">PawHaven</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground max-w-xs">
            A gentle home for the pets you love — and the ones still looking for one.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-3">Explore</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/pets" className="hover:text-foreground">Pets</Link></li>
            <li><Link to="/adoption" className="hover:text-foreground">Adoption</Link></li>
            <li><Link to="/training" className="hover:text-foreground">Training</Link></li>
            <li><Link to="/products" className="hover:text-foreground">Shop</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-3">Care</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/blog" className="hover:text-foreground">Journal</Link></li>
            <li><Link to="/about" className="hover:text-foreground">About us</Link></li>
            <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
            <li><Link to="/dashboard" className="hover:text-foreground">My account</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-3">Stay close</h4>
          <p className="text-sm text-muted-foreground mb-3">Gentle stories, care tips, no noise.</p>
          <form className="flex gap-2">
            <input type="email" placeholder="your@email.com" className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm" />
            <button className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">Join</button>
          </form>
          <div className="mt-4 flex gap-3 text-foreground/70">
            <a href="#" aria-label="Instagram"><FiInstagram /></a>
            <a href="#" aria-label="Twitter"><FiTwitter /></a>
            <a href="#" aria-label="Facebook"><FiFacebook /></a>
          </div>
        </div>
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} PawHaven — Made with care for every paw.
      </div>
    </footer>
  );
}

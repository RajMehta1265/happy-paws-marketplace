<USER_REQUEST>
import { useLayoutEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * CinematicHero — a pinned scroll-driven "scrollytelling" sequence.
 * Each scene cross-fades while animal silhouettes, paw prints, feathers
 * and a flock of birds animate as the user scrolls.
 */
export function CinematicHero() {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      const scenes = gsap.utils.toArray<HTMLElement>(".scene");
      const total = scenes.length;

      // Master timeline pinned for (total) viewport heights
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: () => `+=${total * 100}%`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
        },
      });

      // Cross-fade scenes
      scenes.forEach((scene, i) => {
        if (i === 0) {
          gsap.set(scene, { autoAlpha: 1 });
        } else {
          gsap.set(scene, { autoAlpha: 0 });
          tl.to(scenes[i - 1], { autoAlpha: 0, duration: 1 }, i)
            .to(scene, { autoAlpha: 1, duration: 1 }, i);
        }
      });

      // Scene 0 — shutter opens: two panels split apart revealing the world
      tl.to(".shutter-left", { xPercent: -100, duration: 1.2, ease: "power3.inOut" }, 0)
        .to(".shutter-right", { xPercent: 100, duration: 1.2, ease: "power3.inOut" }, 0)
        .to(".shutter-logo-left", { x: -80, opacity: 0, duration: 0.8, ease: "power2.in" }, 0)
        .to(".shutter-logo-right", { x: 80, opacity: 0, duration: 0.8, ease: "power2.in" }, 0)
        .to(".shutter-wolf", { x: -140, opacity: 0, duration: 1, ease: "power2.in" }, 0)
        .to(".shutter-cat", { x: 140, opacity: 0, duration: 1, ease: "power2.in" }, 0);

      // Scene 1 — sunrise: sun rises, fog clears, title reve
<truncated 20682 bytes>
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

take this and do necessary in header.tsx
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-06-05T03:59:13+05:30.

The user's current state is as follows:
Active Document: d:\happy-paws-marketplace-main\happy-paws-marketplace\src\routes\index.tsx (LANGUAGE_TSX)
Cursor is on line: 523
Other open documents:
- d:\happy-paws-marketplace-main\happy-paws-marketplace\src\routes\index.tsx (LANGUAGE_TSX)
- d:\happy-paws-marketplace-main\happy-paws-marketplace\src\components\site\CinematicHero.tsx (LANGUAGE_TSX)
Running terminal commands:
- npm run dev (in d:\happy-paws-marketplace-main\happy-paws-marketplace, running for 5h33m14s)
</ADDITIONAL_METADATA>
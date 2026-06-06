import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorTextRef = useRef<HTMLSpanElement>(null);
  const [hoverText, setHoverText] = useState("");

  useEffect(() => {
    // Disable on mobile/touch devices
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    const cursor = cursorRef.current;
    if (!cursor) return;

    gsap.set(cursor, { xPercent: -50, yPercent: -50 });

    const onMouseMove = (e: MouseEvent) => {
      gsap.to(cursor, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.35,
        ease: "power2.out",
      });
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest(".interactive-hover");
      if (target) {
        const text = target.getAttribute("data-hover-text") || "VIEW";
        setHoverText(text);

        gsap.to(cursor, {
          scale: 2.2,
          backgroundColor: "rgba(244, 162, 97, 0.12)",
          borderColor: "#F4A261",
          duration: 0.3,
        });
        if (cursorTextRef.current) {
          gsap.to(cursorTextRef.current, { opacity: 1, duration: 0.2 });
        }
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest(".interactive-hover");
      if (target) {
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (relatedTarget && relatedTarget.closest(".interactive-hover") === target) {
          return;
        }

        gsap.to(cursor, {
          scale: 1,
          backgroundColor: "transparent",
          borderColor: "rgba(244, 162, 97, 0.4)",
          duration: 0.3,
        });
        if (cursorTextRef.current) {
          gsap.to(cursorTextRef.current, { opacity: 0, duration: 0.2 });
        }
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseover", handleMouseOver);
    window.addEventListener("mouseout", handleMouseOut);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseover", handleMouseOver);
      window.removeEventListener("mouseout", handleMouseOut);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className="fixed top-0 left-0 w-8 h-8 rounded-full border border-primary/50 pointer-events-none z-50 flex items-center justify-center -translate-x-1/2 -translate-y-1/2 hidden md:flex"
      style={{ transition: "scale 0.2s, background-color 0.2s, border-color 0.2s" }}
    >
      <span
        ref={cursorTextRef}
        className="text-[7px] font-bold uppercase tracking-widest text-primary opacity-0 whitespace-nowrap pointer-events-none"
      >
        {hoverText}
      </span>
    </div>
  );
}

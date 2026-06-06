import type { SVGProps } from "react";

export function WolfLogo({ className, viewBox = "0 0 200 220", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox={viewBox}
      className={className}
      fill="none"
      {...props}
    >
      <defs>
        <filter id="woolf-recolor-filter">
          <feFlood flood-color="currentColor" result="flood" />
          <feComposite in="flood" in2="SourceAlpha" operator="in" />
        </filter>
      </defs>
      <image
        href="/woolf_edges_only.png"
        x="0"
        y="0"
        width="200"
        height="220"
        filter="url(#woolf-recolor-filter)"
      />
    </svg>
  );
}

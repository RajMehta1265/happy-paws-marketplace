import type { SVGProps } from "react";

export function WolfLogo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 115"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Symmetrical Geometric low-poly Wolf Head composed of clean polygons */}
      
      {/* Left Ear outer/inner */}
      <polygon points="50,28 34,10 26,34" />
      <polygon points="34,10 38,24 26,34" />
      <polygon points="50,28 38,24 43,29" />
      <polygon points="34,10 45,16 38,24" />
      <polygon points="45,16 43,29 38,24" />
      <polygon points="50,28 43,29 50,44" />
      
      {/* Right Ear outer/inner */}
      <polygon points="50,28 66,10 74,34" />
      <polygon points="66,10 62,24 74,34" />
      <polygon points="50,28 62,24 57,29" />
      <polygon points="66,10 54,16 62,24" />
      <polygon points="54,16 57,29 62,24" />
      <polygon points="50,28 57,29 50,44" />

      {/* Forehead */}
      <polygon points="43,29 38,38 50,44" />
      <polygon points="57,29 62,38 50,44" />
      <polygon points="26,34 38,38 43,29" />
      <polygon points="74,34 62,38 57,29" />

      {/* Cheeks Upper */}
      <polygon points="26,34 25,46 32,48" />
      <polygon points="74,34 75,46 68,48" />
      <polygon points="38,38 32,48 34,52" />
      <polygon points="62,38 68,48 66,52" />

      {/* Eyebrows */}
      <polygon points="32,48 34,52 45,52" />
      <polygon points="45,52 50,44 38,38" />
      
      <polygon points="68,48 66,52 55,52" />
      <polygon points="55,52 50,44 62,38" />

      {/* Eye triangles (filled) */}
      <polygon points="36,54 44,54 40,57" fill="currentColor" />
      <polygon points="64,54 56,54 60,57" fill="currentColor" />

      {/* Cheeks Mid */}
      <polygon points="25,46 23,60 31,58" />
      <polygon points="32,48 31,58 34,52" />
      <polygon points="75,46 77,60 69,58" />
      <polygon points="68,48 69,58 66,52" />

      {/* Nose Bridge */}
      <polygon points="50,44 45,52 50,52" />
      <polygon points="50,44 55,52 50,52" />
      <polygon points="45,52 45,64 50,52" />
      <polygon points="55,52 55,64 50,52" />
      <polygon points="45,64 50,76 50,52" />
      <polygon points="55,64 50,76 50,52" />

      {/* Cheeks Lower */}
      <polygon points="23,60 25,76 33,72" />
      <polygon points="31,58 33,72 41,68" />
      <polygon points="41,68 45,64 31,58" />

      <polygon points="77,60 75,76 67,72" />
      <polygon points="69,58 67,72 59,68" />
      <polygon points="59,68 55,64 69,58" />

      {/* Snout Details */}
      <polygon points="41,68 44,82 45,64" />
      <polygon points="59,68 56,82 55,64" />

      {/* Nose (Filled) */}
      <polygon points="46,76 54,76 50,83" fill="currentColor" />

      {/* Mouth & Chin */}
      <polygon points="44,82 50,83 46,92" />
      <polygon points="56,82 50,83 54,92" />
      <polygon points="46,92 50,92 50,108" />
      <polygon points="54,92 50,92 50,108" />

      {/* Lower Jaw */}
      <polygon points="33,88 50,108 46,92" />
      <polygon points="67,88 50,108 54,92" />
      <polygon points="33,72 33,88 46,92" />
      <polygon points="67,72 67,88 54,92" />
    </svg>
  );
}

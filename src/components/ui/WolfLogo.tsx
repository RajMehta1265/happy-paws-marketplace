import type { SVGProps } from "react";

export function WolfLogo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 115"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Symmetrical Geometric low-poly Wolf Head */}
      {/* Left Ear */}
      <polygon points="50,30 32,8 24,35" stroke="currentColor" fill="none" />
      {/* Right Ear */}
      <polygon points="50,30 68,8 76,35" stroke="currentColor" fill="none" />
      
      {/* Forehead */}
      <polygon points="50,30 38,48 50,56 62,48" stroke="currentColor" fill="none" />
      
      {/* Upper Cheeks & Eyes Frame */}
      <polygon points="38,48 20,44 24,35" stroke="currentColor" fill="none" />
      <polygon points="62,48 80,44 76,35" stroke="currentColor" fill="none" />
      
      {/* Eye Triangles */}
      <polygon points="38,48 24,58 50,56" stroke="currentColor" fill="none" />
      <polygon points="62,48 76,58 50,56" stroke="currentColor" fill="none" />

      {/* Cheeks */}
      <polygon points="20,44 14,66 24,58" stroke="currentColor" fill="none" />
      <polygon points="80,44 86,66 76,58" stroke="currentColor" fill="none" />

      {/* Eyes Details (Sharp Wolf Eyes) */}
      <polygon points="34,51 44,53 38,48" fill="currentColor" opacity="0.8" />
      <polygon points="66,51 56,53 62,48" fill="currentColor" opacity="0.8" />

      {/* Nose Bridge */}
      <polygon points="50,56 42,82 50,92" stroke="currentColor" fill="none" />
      <polygon points="50,56 58,82 50,92" stroke="currentColor" fill="none" />

      {/* Cheek Lower Fill */}
      <polygon points="24,58 42,82 32,94" stroke="currentColor" fill="none" />
      <polygon points="76,58 58,82 68,94" stroke="currentColor" fill="none" />
      <polygon points="14,66 32,94 24,58" stroke="currentColor" fill="none" />
      <polygon points="86,66 68,94 76,58" stroke="currentColor" fill="none" />

      {/* Mouth & Chin */}
      <polygon points="42,82 50,82 50,92" stroke="currentColor" fill="none" />
      <polygon points="58,82 50,82 50,92" stroke="currentColor" fill="none" />
      <polygon points="50,92 46,98 50,103 54,98" stroke="currentColor" fill="currentColor" />
      
      {/* Lower Jaw */}
      <polygon points="32,94 50,109 46,98" stroke="currentColor" fill="none" />
      <polygon points="68,94 50,109 54,98" stroke="currentColor" fill="none" />
    </svg>
  );
}

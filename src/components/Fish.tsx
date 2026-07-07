import { useMemo } from "react";

function FishShape({ color }: { color: string }) {
  return (
    <svg width="34" height="18" viewBox="0 0 34 18" fill="none" aria-hidden>
      <ellipse cx="14" cy="9" rx="12" ry="6" fill={color} />
      <path d="M26 9 L34 3 L34 15 Z" fill={color} />
      <circle cx="8" cy="7.5" r="1.3" fill="#05070b" />
    </svg>
  );
}

type FishSpec = {
  top: number;      // % from top of the water layer
  duration: number; // seconds per lap
  delay: number;    // negative to pre-distribute across the screen
  scale: number;
  opacity: number;
  left: boolean;    // swims right-to-left
  color: string;
};

// A small school with varied depth, speed, size and direction.
const SCHOOL: FishSpec[] = [
  { top: 14, duration: 26, delay: -4,  scale: 1.0,  opacity: 0.55, left: false, color: "#34f5a0" },
  { top: 40, duration: 34, delay: -18, scale: 0.7,  opacity: 0.4,  left: true,  color: "#0fd482" },
  { top: 62, duration: 22, delay: -10, scale: 1.25, opacity: 0.5,  left: false, color: "#2fe0c4" },
  { top: 30, duration: 40, delay: -30, scale: 0.55, opacity: 0.3,  left: true,  color: "#34f5a0" },
  { top: 78, duration: 30, delay: -6,  scale: 0.85, opacity: 0.35, left: false, color: "#0fd482" },
];

export function Fish({ height }: { height: number }) {
  // Fish live in the lower ~55% of the screen — the "water" under the wave line.
  const waterTop = Math.max(0, height * 0.45);
  const waterHeight = height - waterTop;
  const school = useMemo(() => SCHOOL, []);

  return (
    <div
      className="absolute inset-x-0 z-[2] overflow-hidden pointer-events-none"
      style={{ top: waterTop, height: waterHeight }}
      aria-hidden
    >
      {school.map((f, i) => (
        <span
          key={i}
          className={`fish ${f.left ? "left" : ""}`}
          style={{
            top: `${f.top}%`,
            animationDuration: `${f.duration}s`,
            animationDelay: `${f.delay}s`,
            opacity: f.opacity,
          }}
        >
          {/* Scale on an inner wrapper so the swim keyframes (which own `transform`) don't clobber it */}
          <span style={{ display: "block", transform: `scale(${f.scale})` }}>
            <FishShape color={f.color} />
          </span>
        </span>
      ))}
    </div>
  );
}

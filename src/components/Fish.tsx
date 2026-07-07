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

// Deterministic PRNG so the school layout is stable between renders for a
// given health value (no jittering on every re-render).
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Blend a "distress" red toward a healthy green/teal as t goes 0 -> 1.
function toneColor(t: number, teal: boolean) {
  const distress = { r: 0xf5, g: 0x4b, b: 0x5c };            // muted red
  const healthy = teal ? { r: 0x2f, g: 0xe0, b: 0xc4 }        // teal
                       : { r: 0x34, g: 0xf5, b: 0xa0 };       // green
  const r = Math.round(lerp(distress.r, healthy.r, t));
  const g = Math.round(lerp(distress.g, healthy.g, t));
  const b = Math.round(lerp(distress.b, healthy.b, t));
  return `rgb(${r},${g},${b})`;
}

/**
 * The school reacts to financial health:
 *  - net-positive month  -> a full, lively, bright-green school moving quickly
 *  - flat                -> a modest, calmer school
 *  - net-negative        -> a lone/sparse, slow, desaturated-toward-red school
 */
function buildSchool(health: number): FishSpec[] {
  const t = clamp((health + 1) / 2, 0, 1); // -1..1  ->  0..1
  const count = Math.round(lerp(1, 8, t)); // 1 lonely fish up to a teeming shoal
  const rand = mulberry32(1013904223 + count * 2654435761);

  return Array.from({ length: count }, () => {
    const jitter = rand();
    return {
      top: lerp(8, 88, rand()),
      // healthier = livelier (shorter laps); add per-fish variance so they desync
      duration: lerp(40, 18, t) + jitter * 10,
      delay: -rand() * 40,
      scale: lerp(0.5, 1.3, rand()),
      // brighter and more present when healthy, faint and shy when stressed
      opacity: lerp(0.22, 0.6, t) * lerp(0.7, 1, rand()),
      left: rand() > 0.5,
      color: toneColor(t, rand() > 0.5),
    };
  });
}

export function Fish({ height, delta, balance }: { height: number; delta: number; balance: number }) {
  // Fish live in the lower ~55% of the screen — the "water" under the wave line.
  const waterTop = Math.max(0, height * 0.45);
  const waterHeight = height - waterTop;

  // Normalize the net change into a -1..1 health signal. The denominator scales
  // with the balance so "healthy" is relative to how much money is in play.
  const health = useMemo(() => {
    const denom = Math.max(Math.abs(balance) * 0.15, 300);
    return clamp(delta / denom, -1, 1);
  }, [delta, balance]);

  const school = useMemo(() => buildSchool(health), [health]);

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

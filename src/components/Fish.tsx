import { useEffect, useMemo, useRef } from "react";
import type { DayBalance } from "../lib/engine";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type RGB = { r: number; g: number; b: number };
const DISTRESS: RGB = { r: 0xf5, g: 0x4b, b: 0x5c };
const GREEN: RGB = { r: 0x34, g: 0xf5, b: 0xa0 };
const TEAL: RGB = { r: 0x2f, g: 0xe0, b: 0xc4 };
const WHITE: RGB = { r: 0xf2, g: 0xff, b: 0xf8 };

function blend(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(lerp(a.r, b.r, t)),
    g: Math.round(lerp(a.g, b.g, t)),
    b: Math.round(lerp(a.b, b.b, t)),
  };
}
const rgba = (c: RGB, a: number) => `rgba(${c.r},${c.g},${c.b},${a})`;

type FishState = {
  x: number; y: number; vx: number; vy: number;
  size: number; phase: number; wobble: number; baseOpacity: number;
  color: RGB; belly: RGB;
};

type Ripple = { x: number; y: number; born: number };

// Recreate the Wave component's balance→y mapping so the water surface sits
// exactly on the balance trend line.
function buildSurface(data: DayBalance[], width: number, height: number) {
  const n = data.length;
  const vals = data.map((d) => d.balance);
  const yMin = Math.min(0, ...vals);
  const yMax = Math.max(1, ...vals);
  const top = height * 0.15;
  const bottom = height * 0.9;
  const toY = (v: number) => bottom + ((v - yMin) / (yMax - yMin)) * (top - bottom);
  const pts = data.map((d, i) => ({ x: (i / Math.max(1, n - 1)) * width, y: toY(d.balance) }));
  const surfaceYAt = (x: number) => {
    if (pts.length === 1) return pts[0].y;
    const fx = clamp(x, 0, width);
    const step = width / Math.max(1, n - 1);
    const i = clamp(Math.floor(fx / step), 0, n - 2);
    const a = pts[i], b = pts[i + 1];
    const t = (fx - a.x) / (b.x - a.x || 1);
    return lerp(a.y, b.y, t);
  };
  return { pts, surfaceYAt };
}

function makeFish(
  count: number, t: number, w: number, h: number,
  surfaceYAt: (x: number) => number,
): FishState[] {
  const rand = mulberry32(1013904223 + count * 2654435761);
  return Array.from({ length: count }, () => {
    const teal = rand() > 0.5;
    const color = blend(DISTRESS, teal ? TEAL : GREEN, t);
    const belly = blend(color, WHITE, 0.55);
    const dir = rand() > 0.5 ? 1 : -1;
    const speed = lerp(14, 40, t) * lerp(0.7, 1.2, rand());
    const x = rand() * w;
    const surf = surfaceYAt(x) + 18;
    return {
      x,
      y: lerp(surf, h - 10, rand()),
      vx: dir * speed,
      vy: 0,
      size: lerp(0.6, 1.4, rand()),
      phase: rand() * Math.PI * 2,
      wobble: lerp(0.7, 1.5, rand()),
      baseOpacity: lerp(0.35, 0.7, t) * lerp(0.8, 1, rand()),
      color,
      belly,
    };
  });
}

// A tapered, finned fish with a tail that wiggles as it swims.
function drawFish(ctx: CanvasRenderingContext2D, f: FishState, opacity: number) {
  const speed = Math.hypot(f.vx, f.vy);
  const facing = f.vx >= 0 ? 1 : -1;
  const pitch = clamp(Math.atan2(f.vy, Math.abs(f.vx) + 20), -0.5, 0.5);
  const swim = Math.sin(f.phase * 3) * clamp(speed / 40, 0.3, 1); // tail beat

  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(pitch * facing);
  ctx.scale(f.size * facing, f.size);
  ctx.globalAlpha = opacity;

  // tail (behind body, at -x) — sweeps with the swim phase
  const tailSpread = 6 + swim * 2;
  ctx.fillStyle = rgba(f.color, 1);
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.quadraticCurveTo(-16, swim * 4 - tailSpread, -20, swim * 5 - tailSpread);
  ctx.quadraticCurveTo(-17, 0, -20, swim * 5 + tailSpread);
  ctx.quadraticCurveTo(-16, swim * 4 + tailSpread, -10, 0);
  ctx.fill();

  // dorsal fin
  ctx.fillStyle = rgba(blend(f.color, DISTRESS, 0.1), 0.85);
  ctx.beginPath();
  ctx.moveTo(-2, -5);
  ctx.quadraticCurveTo(-6, -12, -9, -5);
  ctx.closePath();
  ctx.fill();

  // pectoral fin (flicks with swim)
  ctx.beginPath();
  ctx.moveTo(2, 3);
  ctx.quadraticCurveTo(-2, 9 + swim * 2, -6, 4);
  ctx.closePath();
  ctx.fill();

  // body with a belly gradient for volume
  const grad = ctx.createLinearGradient(0, -7, 0, 7);
  grad.addColorStop(0, rgba(f.color, 1));
  grad.addColorStop(1, rgba(f.belly, 1));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(13, 0);                       // nose
  ctx.quadraticCurveTo(6, -7, -8, -4);     // top curve
  ctx.quadraticCurveTo(-11, 0, -8, 4);     // tail base
  ctx.quadraticCurveTo(6, 7, 13, 0);       // bottom curve
  ctx.fill();

  // eye
  ctx.fillStyle = "#05070b";
  ctx.beginPath();
  ctx.arc(8, -1.5, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(WHITE, 0.9);
  ctx.beginPath();
  ctx.arc(8.6, -2, 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function Fish({
  data, width, height, delta, balance,
}: { data: DayBalance[]; width: number; height: number; delta: number; balance: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fishRef = useRef<FishState[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  const health = useMemo(() => {
    const denom = Math.max(Math.abs(balance) * 0.15, 300);
    return clamp(delta / denom, -1, 1);
  }, [delta, balance]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0 || data.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const t = clamp((health + 1) / 2, 0, 1);
    const count = Math.round(lerp(2, 8, t));
    const { pts, surfaceYAt } = buildSurface(data, width, height);
    const waterTop = blend({ r: 0x3a, g: 0x14, b: 0x1c }, TEAL, t);
    const waterBottom = blend(DISTRESS, GREEN, t);

    fishRef.current = makeFish(count, t, width, height, surfaceYAt);

    const toLocal = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e: PointerEvent) => {
      const p = toLocal(e);
      pointerRef.current = {
        x: p.x, y: p.y,
        active: p.x >= 0 && p.x <= width && p.y >= surfaceYAt(p.x) - 24 && p.y <= height,
      };
    };
    const onDown = (e: PointerEvent) => {
      const p = toLocal(e);
      if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) return;
      pointerRef.current = { x: p.x, y: p.y, active: true };
      if (!reduced) ripplesRef.current.push({ x: p.x, y: Math.max(p.y, surfaceYAt(p.x)), born: performance.now() });
    };
    const onLeave = () => { pointerRef.current.active = false; };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onLeave, { passive: true });

    const RIPPLE_MS = 1500;
    const RIPPLE_MAX = Math.min(width, height) * 0.55;

    const drawWater = (now: number) => {
      const amp = reduced ? 0 : 3;
      const wob = (x: number) => Math.sin(x * 0.02 + now * 0.0015) * amp;
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, rgba(waterTop, 0.18));
      grad.addColorStop(1, rgba(waterBottom, 0.05));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(pts[0].x, pts[0].y + wob(pts[0].x));
      for (const p of pts) ctx.lineTo(p.x, p.y + wob(p.x));
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();
      // surface glint following the balance line
      ctx.strokeStyle = rgba(waterBottom, 0.22);
      ctx.lineWidth = 1;
      ctx.beginPath();
      pts.forEach((p, i) => {
        const y = p.y + wob(p.x);
        if (i === 0) ctx.moveTo(p.x, y); else ctx.lineTo(p.x, y);
      });
      ctx.stroke();
    };

    const drawRipples = (now: number) => {
      ripplesRef.current = ripplesRef.current.filter((r) => now - r.born < RIPPLE_MS);
      for (const r of ripplesRef.current) {
        const age = (now - r.born) / RIPPLE_MS;
        const radius = age * RIPPLE_MAX;
        ctx.strokeStyle = rgba(TEAL, (1 - age) * 0.4);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, radius, radius * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, width, height);
      drawWater(now);
      drawRipples(now);

      const ptr = pointerRef.current;
      const cruise = lerp(14, 40, t);
      for (const f of fishRef.current) {
        if (!reduced) {
          f.phase += dt * (2 + f.wobble);
          f.vy += Math.sin(f.phase) * 3 * dt;

          if (ptr.active) {
            const dx = f.x - ptr.x;
            const dy = f.y - ptr.y;
            const d2 = dx * dx + dy * dy;
            const R = 130;
            if (d2 < R * R) {
              const d = Math.sqrt(d2) || 1;
              const force = (1 - d / R) * 900;
              f.vx += (dx / d) * force * dt;
              f.vy += (dy / d) * force * dt;
            }
          }

          for (const rp of ripplesRef.current) {
            const age = (now - rp.born) / RIPPLE_MS;
            const ring = age * RIPPLE_MAX;
            const dx = f.x - rp.x;
            const dy = f.y - rp.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            if (Math.abs(d - ring) < 24) {
              const force = (1 - age) * 140;
              f.vx += (dx / d) * force * dt;
              f.vy += (dy / d) * force * dt;
            }
          }

          f.vx *= 0.98;
          f.vy *= 0.92;
          if (Math.abs(f.vx) < 6) f.vx += (f.vx >= 0 ? 1 : -1) * cruise * dt;

          f.x += f.vx * dt;
          f.y += f.vy * dt;

          if (f.x < -30) f.x = width + 30;
          if (f.x > width + 30) f.x = -30;
          const top = surfaceYAt(f.x) + 12;
          if (f.y < top) { f.y = top; f.vy = Math.abs(f.vy) * 0.5; }
          if (f.y > height - 8) { f.y = height - 8; f.vy = -Math.abs(f.vy) * 0.5; }
        }
        drawFish(ctx, f, reduced ? f.baseOpacity * 0.6 : f.baseOpacity);
      }

      if (!reduced || ripplesRef.current.length) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onLeave);
    };
  }, [width, height, health, data]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[2] pointer-events-none"
      style={{ width, height }}
      aria-hidden
    />
  );
}

import { useEffect, useMemo, useRef } from "react";

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
  color: RGB;
};

type Ripple = { x: number; y: number; born: number };

function makeFish(count: number, t: number, w: number, surfaceY: number, h: number): FishState[] {
  const rand = mulberry32(1013904223 + count * 2654435761);
  return Array.from({ length: count }, () => {
    const teal = rand() > 0.5;
    const color = blend(DISTRESS, teal ? TEAL : GREEN, t);
    const dir = rand() > 0.5 ? 1 : -1;
    const speed = lerp(14, 42, t) * lerp(0.7, 1.2, rand()); // px/s, healthier = livelier
    return {
      x: rand() * w,
      y: lerp(surfaceY + 12, h - 10, rand()),
      vx: dir * speed,
      vy: 0,
      size: lerp(0.55, 1.35, rand()),
      phase: rand() * Math.PI * 2,
      wobble: lerp(0.6, 1.4, rand()),
      baseOpacity: lerp(0.24, 0.62, t) * lerp(0.75, 1, rand()),
      color,
    };
  });
}

function drawFish(ctx: CanvasRenderingContext2D, f: FishState, opacity: number) {
  const facing = f.vx >= 0 ? 1 : -1;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.size * facing, f.size);
  ctx.globalAlpha = opacity;
  // body
  ctx.fillStyle = rgba(f.color, 1);
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // tail
  ctx.beginPath();
  ctx.moveTo(11, 0);
  ctx.lineTo(19, -6);
  ctx.lineTo(19, 6);
  ctx.closePath();
  ctx.fill();
  // eye
  ctx.globalAlpha = opacity;
  ctx.fillStyle = "#05070b";
  ctx.beginPath();
  ctx.arc(-6, -1.5, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function Fish({
  width, height, delta, balance,
}: { width: number; height: number; delta: number; balance: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fishRef = useRef<FishState[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  // -1 (deep negative) .. +1 (thriving)
  const health = useMemo(() => {
    const denom = Math.max(Math.abs(balance) * 0.15, 300);
    return clamp(delta / denom, -1, 1);
  }, [delta, balance]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const t = clamp((health + 1) / 2, 0, 1);          // 0..1
    const count = Math.round(lerp(1, 8, t));           // lonely fish -> teeming shoal
    // Water level: healthy = deep (surface high), stressed = shallow (surface low)
    const surfaceFrac = lerp(0.66, 0.26, t);
    const surfaceY = height * surfaceFrac;
    // Water tint: murky red when negative, clear teal/green when healthy
    const waterTop = blend({ r: 0x3a, g: 0x14, b: 0x1c }, TEAL, t);
    const waterBottom = blend(DISTRESS, GREEN, t);

    fishRef.current = makeFish(count, t, width, surfaceY, height);

    // Passive global pointer tracking (canvas itself stays pointer-events:none so
    // it never steals taps from the tiles / FAB beneath it).
    const toLocal = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e: PointerEvent) => {
      const p = toLocal(e);
      pointerRef.current = { x: p.x, y: p.y, active: p.y >= surfaceY - 20 && p.x >= 0 && p.x <= width };
    };
    const onDown = (e: PointerEvent) => {
      const p = toLocal(e);
      if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) return;
      pointerRef.current = { x: p.x, y: p.y, active: true };
      if (!reduced) ripplesRef.current.push({ x: p.x, y: Math.max(p.y, surfaceY), born: performance.now() });
    };
    const onLeave = () => { pointerRef.current.active = false; };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onLeave, { passive: true });

    const RIPPLE_MS = 1500;
    const RIPPLE_MAX = Math.min(width, height) * 0.55;

    const drawWater = (now: number) => {
      // gentle surface wobble
      const grad = ctx.createLinearGradient(0, surfaceY, 0, height);
      grad.addColorStop(0, rgba(waterTop, 0.16));
      grad.addColorStop(1, rgba(waterBottom, 0.05));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, surfaceY);
      const amp = reduced ? 0 : 4;
      for (let x = 0; x <= width; x += 12) {
        const y = surfaceY + Math.sin(x * 0.02 + now * 0.0015) * amp;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();
      // surface glint line
      ctx.strokeStyle = rgba(waterBottom, 0.18);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 12) {
        const y = surfaceY + Math.sin(x * 0.02 + now * 0.0015) * amp;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    const drawRipples = (now: number) => {
      ripplesRef.current = ripplesRef.current.filter((r) => now - r.born < RIPPLE_MS);
      for (const r of ripplesRef.current) {
        const age = (now - r.born) / RIPPLE_MS;
        const radius = age * RIPPLE_MAX;
        const alpha = (1 - age) * 0.4;
        ctx.strokeStyle = rgba(TEAL, alpha);
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
      for (const f of fishRef.current) {
        if (!reduced) {
          // gentle vertical bob
          f.phase += dt * f.wobble;
          f.vy += Math.sin(f.phase) * 2 * dt;

          // flee the pointer, then ease back to a calm cruise
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

          // ripples give a little push too
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

          // damping / drag toward a steady cruise speed
          f.vx *= 0.98;
          f.vy *= 0.92;
          const cruise = lerp(14, 42, t);
          if (Math.abs(f.vx) < 6) f.vx += (f.vx >= 0 ? 1 : -1) * cruise * dt;

          f.x += f.vx * dt;
          f.y += f.vy * dt;

          // wrap horizontally
          if (f.x < -30) f.x = width + 30;
          if (f.x > width + 30) f.x = -30;
          // keep below the surface, above the floor
          const top = surfaceY + 10;
          if (f.y < top) { f.y = top; f.vy = Math.abs(f.vy) * 0.5; }
          if (f.y > height - 8) { f.y = height - 8; f.vy = -Math.abs(f.vy) * 0.5; }
        }
        drawFish(ctx, f, reduced ? f.baseOpacity * 0.5 : f.baseOpacity);
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
  }, [width, height, health]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[2] pointer-events-none"
      style={{ width, height }}
      aria-hidden
    />
  );
}

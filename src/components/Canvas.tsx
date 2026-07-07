import { useEffect, useRef } from "react";
import { useGesture } from "@use-gesture/react";
import { AnimatePresence, motion } from "motion/react";
import type { ZoomLevel } from "./TopBar";

const ORDER: ZoomLevel[] = ["year", "quarter", "month"];

export function Canvas({ zoom, onZoom, children }: {
  zoom: ZoomLevel; onZoom: (z: ZoomLevel) => void; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const acc = useRef(0);

  // Pinch-zoom survival kit:
  // 1. touch-action: none (className below)
  // 2. passive: false via eventOptions
  // 3. gesturestart preventDefault for Safari accessibility zoom
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", stop);
    document.addEventListener("gesturechange", stop);
    return () => {
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
    };
  }, []);

  const step = (dir: 1 | -1) => {
    const idx = ORDER.indexOf(zoom) + dir;
    if (idx >= 0 && idx < ORDER.length) onZoom(ORDER[idx]);
  };

  useGesture(
    {
      // trackpad pinch arrives as wheel with ctrlKey — use-gesture routes it to onPinch
      onPinch: ({ movement: [scale], last }) => {
        if (!last) return;
        if (scale > 1.25) step(1);      // pinch out = zoom in
        else if (scale < 0.8) step(-1); // pinch in = zoom out
      },
      onWheel: ({ event, delta: [, dy] }) => {
        if ((event as WheelEvent).ctrlKey) return; // handled by pinch
        acc.current += dy;
        if (acc.current > 260) { step(1); acc.current = 0; }
        if (acc.current < -260) { step(-1); acc.current = 0; }
      },
    },
    { target: ref, eventOptions: { passive: false } }
  );

  return (
    <div ref={ref} className="relative h-[calc(100vh-120px)] touch-none select-none">
      <AnimatePresence mode="wait">
        <motion.div key={zoom} className="absolute inset-0"
          initial={{ opacity: 0, scale: zoom === "month" ? 1.06 : 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: zoom === "month" ? 0.94 : 1.06 }}
          transition={{ type: "spring", stiffness: 180, damping: 24 }}>
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

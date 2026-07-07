import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";

export function BalanceCounter({ value, label, delta }: { value: number; label: string; delta?: string }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) =>
    (v < 0 ? "-$" : "$") + Math.abs(Math.round(v)).toLocaleString());
  useEffect(() => {
    const controls = animate(mv, value, { type: "spring", stiffness: 80, damping: 20 });
    return () => controls.stop();
  }, [value, mv]);
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--dim)]">{label}</div>
      <motion.div
        className="num text-3xl font-extrabold bg-gradient-to-r from-[var(--text)] to-[var(--green)] bg-clip-text text-transparent"
        style={{ textShadow: "0 0 40px #34f5a033" }}
      >
        {text}
      </motion.div>
      {delta && <div className="num text-xs font-semibold text-[var(--green)]">{delta}</div>}
    </div>
  );
}

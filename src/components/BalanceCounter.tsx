import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";

function formatMoney(v: number) {
  return (v < 0 ? "−$" : "$") + Math.abs(Math.round(v)).toLocaleString();
}

function AnimatedAmount({ value, className }: { value: number; className?: string }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, formatMoney);
  useEffect(() => {
    const controls = animate(mv, value, { type: "spring", stiffness: 80, damping: 20 });
    return () => controls.stop();
  }, [value, mv]);
  return <motion.div className={className}>{text}</motion.div>;
}

const LABEL = "whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--dim)]";

export function BalancePair({
  now, endValue, endLabel, onEditNow,
}: {
  now: number;
  endValue: number;
  endLabel: string;
  onEditNow: () => void;
}) {
  const delta = endValue - now;
  return (
    // Gap between the two figures is wider than the gap inside either one, so
    // each label reads as belonging to the number under it.
    <div className="flex min-w-0 flex-col gap-3.5">
      <button
        type="button"
        onClick={onEditNow}
        className="group min-w-0 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--green)]"
        aria-label="Update balance today"
      >
        <div className={LABEL}>
          Now
          <span className="ml-1.5 normal-case tracking-normal text-[var(--dim)] transition-colors group-hover:text-[var(--green)]">
            · tap to update
          </span>
        </div>
        <AnimatedAmount
          value={now}
          className="num -mt-0.5 text-3xl font-extrabold leading-none tracking-tight text-[var(--text)] transition-colors group-hover:text-[var(--green)]"
        />
      </button>

      <div className="min-w-0">
        <div className={LABEL}>{endLabel}</div>
        <AnimatedAmount
          value={endValue}
          className="num -mt-0.5 bg-gradient-to-r from-[var(--text)] to-[var(--green)] bg-clip-text text-xl font-bold leading-none tracking-tight text-transparent sm:text-2xl"
        />
        <div className={`num mt-1 whitespace-nowrap text-xs font-semibold ${delta >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
          {delta >= 0 ? "▲ +" : "▼ −"}${Math.abs(Math.round(delta)).toLocaleString()}
          <span className="ml-1 font-normal text-[var(--dim)]">from now</span>
        </div>
      </div>
    </div>
  );
}

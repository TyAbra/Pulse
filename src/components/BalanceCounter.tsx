import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";

function formatMoney(v: number) {
  return (v < 0 ? "-$" : "$") + Math.abs(Math.round(v)).toLocaleString();
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

export function BalancePair({
  now, monthEnd, onEditNow,
}: {
  now: number;
  monthEnd: number;
  onEditNow: () => void;
}) {
  const delta = monthEnd - now;
  return (
    <div className="min-w-0 flex flex-col gap-2">
      <button
        type="button"
        onClick={onEditNow}
        className="text-left group min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--green)]"
        aria-label="Update balance today"
      >
        <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--dim)]">
          Now
          <span className="ml-1.5 normal-case tracking-normal text-[var(--dim)] group-hover:text-[var(--green)] transition-colors">
            · tap to update
          </span>
        </div>
        <AnimatedAmount
          value={now}
          className="num text-3xl font-extrabold text-[var(--text)] group-hover:text-[var(--green)] transition-colors"
        />
      </button>

      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--dim)]">Month end</div>
        <AnimatedAmount
          value={monthEnd}
          className="num text-xl sm:text-2xl font-bold bg-gradient-to-r from-[var(--text)] to-[var(--green)] bg-clip-text text-transparent"
        />
        <div className={`num text-xs font-semibold ${delta >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
          {delta >= 0 ? "▲ +" : "▼ -"}${Math.abs(Math.round(delta)).toLocaleString()} this month
        </div>
      </div>
    </div>
  );
}

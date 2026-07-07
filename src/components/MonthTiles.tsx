import { motion } from "motion/react";
import type { DayBalance, MonthSummary } from "../lib/engine";
import { monthKey } from "../lib/dates";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function Spark({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const min = Math.min(...points), max = Math.max(...points);
  const norm = (v: number) => max === min ? 10 : 18 - ((v - min) / (max - min)) * 16;
  const step = 80 / (points.length - 1);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${i * step},${norm(p)}`).join(" ");
  const up = points[points.length - 1] >= points[0];
  return (
    <svg viewBox="0 0 80 20" className="mt-1.5 h-5 w-full opacity-80" aria-hidden>
      <path d={d} fill="none" stroke={up ? "var(--green)" : "var(--red)"} strokeWidth="1.5" />
    </svg>
  );
}

export function MonthTiles({ summaries, dailyBalance, onPick }: {
  summaries: MonthSummary[]; dailyBalance: DayBalance[]; onPick: (month: string) => void;
}) {
  return (
    <div className="absolute inset-x-0 bottom-20 z-[4] mx-auto flex max-w-3xl gap-3 overflow-x-auto px-4">
      {summaries.map((m, i) => {
        const hot = m.net >= 0;
        const monthDays = dailyBalance.filter(d => monthKey(d.date) === m.month);
        const spark = monthDays
          .filter((_, idx, arr) => idx % Math.max(1, Math.ceil(arr.length / 12)) === 0)
          .map(d => d.balance);
        return (
          <motion.button key={m.month} onClick={() => onPick(m.month)}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, type: "spring", stiffness: 200, damping: 22 }}
            whileHover={{ y: -6, scale: 1.03 }}
            className={`min-w-[104px] flex-1 shrink-0 rounded-2xl border p-3 text-center backdrop-blur
              ${hot ? "border-[#232c3f] bg-[#141926ee]" : "border-[#3f2330] bg-[#1a1420ee]"}`}>
            <div className="text-[11px] uppercase tracking-widest text-[var(--dim)]">
              {MONTH_NAMES[Number(m.month.slice(5)) - 1]} {m.month.slice(2, 4)}
            </div>
            <div className={`num text-lg font-extrabold ${hot ? "text-[var(--green)]" : "text-[var(--red)]"}`}
              style={{ textShadow: hot ? "0 0 16px #34f5a066" : "0 0 16px #ff5d7a55" }}>
              {m.net >= 0 ? "+" : "−"}${Math.abs(m.net).toLocaleString()}
            </div>
            <div className="mt-0.5 flex items-center justify-center gap-2 text-[10px]">
              <span className="num text-[var(--green)]">in ${m.in.toLocaleString()}</span>
              <span className="text-[var(--dim)]">·</span>
              <span className="num text-[var(--red)]">out ${m.out.toLocaleString()}</span>
            </div>
            <Spark points={spark} />
          </motion.button>
        );
      })}
    </div>
  );
}

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

const money = (n: number) =>
  `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString()}`;

// Tiles are a glance, not a ledger: whole dollars keep "in $4,114 · out $1,860"
// on one line at 375px instead of clipping mid-number.
const compact = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function MonthTiles({ summaries, dailyBalance, onPick }: {
  summaries: MonthSummary[]; dailyBalance: DayBalance[]; onPick: (month: string) => void;
}) {
  // A quarter fits in a row; a year needs to wrap into a grid or the tiles are
  // unreadable slivers in a horizontal scroller.
  const grid = summaries.length > 4;
  return (
    <div className={`absolute inset-x-0 bottom-24 z-[4] mx-auto max-w-3xl px-4 ${
      grid
        ? "top-2 grid auto-rows-min grid-cols-2 gap-2 overflow-y-auto pb-2 sm:grid-cols-3 md:grid-cols-4"
        : "flex gap-3 overflow-x-auto"}`}>
      {summaries.map((m, i) => {
        const hot = m.endBalance >= 0;
        const monthDays = dailyBalance.filter(d => monthKey(d.date) === m.month);
        const spark = monthDays
          .filter((_, idx, arr) => idx % Math.max(1, Math.ceil(arr.length / 12)) === 0)
          .map(d => d.balance);
        return (
          <motion.button key={m.month} onClick={() => onPick(m.month)}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, type: "spring", stiffness: 200, damping: 22 }}
            whileHover={{ y: -6, scale: 1.03 }}
            className={`min-w-[104px] flex-1 shrink-0 overflow-hidden rounded-2xl border p-3 text-center backdrop-blur
              ${hot ? "border-[#232c3f] bg-[#141926ee]" : "border-[#3f2330] bg-[#1a1420ee]"}`}>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-[var(--dim)]">
              {MONTH_NAMES[Number(m.month.slice(5)) - 1]} {m.month.slice(2, 4)}
            </div>
            {/* The headline is what you'd actually have at month end, not the flow. */}
            <div className={`num text-xl font-extrabold leading-tight ${hot ? "text-[var(--green)]" : "text-[var(--red)]"}`}
              style={{ textShadow: hot ? "0 0 16px #34f5a066" : "0 0 16px #ff5d7a55" }}>
              {money(m.endBalance)}
            </div>
            <div className="-mt-0.5 text-[9px] uppercase tracking-widest text-[var(--dim)]">left over</div>
            <div className={`num mt-1 whitespace-nowrap text-[11px] font-semibold ${m.net >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
              {m.net >= 0 ? "▲" : "▼"} {m.net >= 0 ? "+" : "−"}{compact(Math.abs(m.net))}
            </div>
            {/* Stacked, not inline: three tiles across a 375px phone leave ~104px
                each, and "in $4,114 · out $1,860" needs half again as much. */}
            <div className="mx-auto mt-1.5 flex max-w-[8.5rem] flex-col gap-0.5 text-[10px] leading-tight">
              <span className="flex items-baseline justify-between gap-1">
                <span className="text-[var(--dim)]">in</span>
                <span className="num text-[var(--green)]">{compact(m.in)}</span>
              </span>
              <span className="flex items-baseline justify-between gap-1">
                <span className="text-[var(--dim)]">out</span>
                <span className="num text-[var(--red)]">{compact(m.out)}</span>
              </span>
            </div>
            <Spark points={spark} />
          </motion.button>
        );
      })}
    </div>
  );
}

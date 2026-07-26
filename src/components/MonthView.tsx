import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { CashEvent } from "../lib/engine";
import { daysInMonth, todayLocal, toUTCDate } from "../lib/dates";
import { EventCard } from "./EventCard";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function MonthView({ month, events, startBalance, endBalance, onEdit, onNav }: {
  month: string; events: CashEvent[]; startBalance: number; endBalance: number;
  onEdit: (e: CashEvent) => void; onNav: (dir: 1 | -1) => void;
}) {
  const today = todayLocal();
  const [showDetails, setShowDetails] = useState(false);

  const n = daysInMonth(month);
  const firstWeekday = toUTCDate(`${month}-01`).getUTCDay(); // 0 = Sun
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: n }, (_, i) => i + 1),
  ];
  const monthEvents = events.filter(e => e.date.startsWith(month));
  const byDay = new Map<number, CashEvent[]>();
  let income = 0, expense = 0;
  for (const e of monthEvents) {
    if (e.kind === "income") income += e.amount; else expense += e.amount;
    const d = Number(e.date.slice(8));
    byDay.set(d, [...(byDay.get(d) ?? []), e]);
  }
  const net = income - expense;

  const navBtn = "flex h-9 w-9 items-center justify-center rounded-full border border-[#232c3f] bg-[#10141ecc] text-lg text-[var(--dim)] hover:text-[var(--text)]";
  return (
    <div className="relative z-[4] mx-auto flex h-full w-full max-w-md flex-col gap-4 px-4 pb-6">
      <div className="mt-1 flex items-center justify-center gap-4">
        <button onClick={() => onNav(-1)} aria-label="Previous month" className={navBtn}>‹</button>
        <div className="min-w-[9rem] text-center text-sm font-semibold tracking-wide">
          {MONTH_NAMES[Number(month.slice(5)) - 1]} {month.slice(0, 4)}
        </div>
        <button onClick={() => onNav(1)} aria-label="Next month" className={navBtn}>›</button>
      </div>

      {/* Money summary — the whole point: in, out, and where you land */}
      <div className="rounded-3xl border border-[#232c3f] bg-[#10141ecc] p-5 backdrop-blur">
        <div className="pb-4 text-center">
          <div className="text-[10px] uppercase tracking-widest text-[var(--dim)]">
            Left over end of {MONTH_NAMES[Number(month.slice(5)) - 1]}
          </div>
          <div className={`num text-4xl font-extrabold ${endBalance >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}
            style={{ textShadow: endBalance >= 0 ? "0 0 24px #34f5a055" : "0 0 24px #ff5d7a55" }}>
            {endBalance < 0 ? "−" : ""}${Math.round(Math.abs(endBalance)).toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-[var(--dim)]">
            starts at <span className="num text-[var(--text)]">
              {startBalance < 0 ? "−" : ""}${Math.round(Math.abs(startBalance)).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="flex items-stretch justify-between gap-3 border-t border-[#232c3f] pt-4">
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-widest text-[var(--dim)]">Coming in</div>
            <div className="num text-2xl font-extrabold text-[var(--green)]" style={{ textShadow: "0 0 18px #34f5a044" }}>
              +${income.toLocaleString()}
            </div>
          </div>
          <div className="w-px bg-[#232c3f]" />
          <div className="flex-1 text-right">
            <div className="text-[10px] uppercase tracking-widest text-[var(--dim)]">Going out</div>
            <div className="num text-2xl font-extrabold text-[var(--red)]" style={{ textShadow: "0 0 18px #ff5d7a44" }}>
              −${expense.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-[#232c3f] pt-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--dim)]">Net this month</span>
          <span className={`num text-lg font-extrabold ${net >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
            {net >= 0 ? "+" : "−"}${Math.abs(net).toLocaleString()}
          </span>
        </div>
      </div>

      <button onClick={() => setShowDetails(s => !s)}
        className="self-center rounded-full border border-[#232c3f] bg-[#10141ecc] px-4 py-1.5 text-[11px] font-semibold text-[var(--dim)] hover:text-[var(--text)]">
        {showDetails ? "Hide details" : "Details & calendar"}
      </button>

      <AnimatePresence initial={false}>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
            <div>
              <div className="grid grid-cols-7 gap-1 pb-1">
                {WEEKDAYS.map((w, i) => (
                  <div key={i} className="text-center text-[9px] font-semibold uppercase text-[var(--dim)]">{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((d, i) => {
                  if (d === null) return <div key={`e${i}`} />;
                  const evs = byDay.get(d) ?? [];
                  const pay = evs.some(e => e.kind === "income");
                  const bill = !pay && evs.length > 0;
                  return (
                    <div key={d}
                      className={`flex aspect-square items-center justify-center rounded-lg text-xs font-semibold
                        ${pay ? "bg-gradient-to-br from-[var(--green)] to-[var(--green2)] text-[#03140c] shadow-[0_0_14px_#34f5a066]"
                          : bill ? "border border-[#ff5d7a44] bg-[#2a1220] text-[var(--red)]"
                          : "text-[var(--dim)]"}`}>
                      {d}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
              {monthEvents.map((e, i) => (
                <EventCard key={`${e.ruleId}-${e.date}`} event={e} projected={e.date > today} onClick={() => onEdit(e)} index={i} />
              ))}
              {monthEvents.length === 0 && (
                <div className="py-8 text-center text-sm text-[var(--dim)]">
                  Nothing this month yet — hit + to add your paycheck or a bill.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

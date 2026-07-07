import type { CashEvent } from "../lib/engine";
import { daysInMonth, todayLocal, toUTCDate } from "../lib/dates";
import { EventCard } from "./EventCard";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function MonthView({ month, events, onEdit, onNav }: {
  month: string; events: CashEvent[]; onEdit: (e: CashEvent) => void; onNav: (dir: 1 | -1) => void;
}) {
  const today = todayLocal();
  const n = daysInMonth(month);
  const firstWeekday = toUTCDate(`${month}-01`).getUTCDay(); // 0 = Sun
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: n }, (_, i) => i + 1),
  ];
  const monthEvents = events.filter(e => e.date.startsWith(month));
  const byDay = new Map<number, CashEvent[]>();
  for (const e of monthEvents) {
    const d = Number(e.date.slice(8));
    byDay.set(d, [...(byDay.get(d) ?? []), e]);
  }
  const navBtn = "flex h-9 w-9 items-center justify-center rounded-full border border-[#232c3f] bg-[#10141ecc] text-lg text-[var(--dim)] hover:text-[var(--text)]";
  return (
    <div className="relative z-[4] mx-auto flex h-full w-full max-w-lg flex-col gap-3 px-4 pb-6">
      <div className="mt-1 flex items-center justify-center gap-4">
        <button onClick={() => onNav(-1)} aria-label="Previous month" className={navBtn}>‹</button>
        <div className="min-w-[9rem] text-center text-sm font-semibold tracking-wide">
          {MONTH_NAMES[Number(month.slice(5)) - 1]} {month.slice(0, 4)}
        </div>
        <button onClick={() => onNav(1)} aria-label="Next month" className={navBtn}>›</button>
      </div>
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
                  ${pay ? "animate-pulse bg-gradient-to-br from-[var(--green)] to-[var(--green2)] text-[#03140c] shadow-[0_0_14px_#34f5a066]"
                    : bill ? "border border-[#ff5d7a44] bg-[#2a1220] text-[var(--red)]"
                    : "text-[var(--dim)]"}`}>
                {d}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {monthEvents.slice(0, 8).map((e, i) => (
          <EventCard key={`${e.ruleId}-${e.date}`} event={e} projected={e.date > today} onClick={() => onEdit(e)} index={i} />
        ))}
        {monthEvents.length === 0 && (
          <div className="py-8 text-center text-sm text-[var(--dim)]">
            Nothing this month yet — hit + to add your paycheck or a bill.
          </div>
        )}
      </div>
    </div>
  );
}

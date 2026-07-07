import type { CashEvent } from "../lib/engine";
import { daysInMonth, todayLocal } from "../lib/dates";
import { EventCard } from "./EventCard";

export function MonthView({ month, events, onEdit }: {
  month: string; events: CashEvent[]; onEdit: (e: CashEvent) => void;
}) {
  const today = todayLocal();
  const n = daysInMonth(month);
  const monthEvents = events.filter(e => e.date.startsWith(month));
  const byDay = new Map<number, CashEvent[]>();
  for (const e of monthEvents) {
    const d = Number(e.date.slice(8));
    byDay.set(d, [...(byDay.get(d) ?? []), e]);
  }
  return (
    <div className="relative z-[4] flex h-full flex-col justify-between px-6 pb-8">
      <div className="mt-2 flex gap-1">
        {Array.from({ length: n }, (_, i) => i + 1).map((d) => {
          const evs = byDay.get(d) ?? [];
          const pay = evs.some(e => e.kind === "income");
          const bill = !pay && evs.length > 0;
          return (
            <div key={d}
              className={`flex-1 rounded-lg py-2 text-center text-[10px] font-semibold
                ${pay ? "animate-pulse bg-gradient-to-br from-[var(--green)] to-[var(--green2)] text-[#03140c] shadow-[0_0_18px_#34f5a066]"
                  : bill ? "border border-[#ff5d7a44] bg-[#2a1220] text-[var(--red)]"
                  : "text-[var(--dim)]"}`}>
              {d}
            </div>
          );
        })}
      </div>
      <div className="flex max-h-[45%] flex-col gap-2 overflow-y-auto">
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

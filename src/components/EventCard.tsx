import { motion } from "motion/react";
import type { CashEvent } from "../lib/engine";

export function EventCard({ event, projected, onClick, index }: {
  event: CashEvent; projected: boolean; onClick: () => void; index: number;
}) {
  const income = event.kind === "income";
  return (
    <motion.button onClick={onClick}
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: projected ? 0.75 : 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      whileHover={{ x: 6 }}
      className={`flex w-full items-center justify-between rounded-xl border border-[#232c3f]
        bg-[#10141ed9] px-4 py-3 text-sm backdrop-blur ${projected ? "border-dashed" : ""}`}>
      <span className="flex items-center gap-2.5">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm
          ${income ? "bg-[#12281c]" : "bg-[#2a1220]"}`}>
          {event.emoji ?? (income ? "💵" : "💸")}
        </span>
        {event.name}
        <span className="text-[11px] text-[var(--dim)]">{event.date}{projected ? " · projected" : ""}</span>
      </span>
      <span className={`num font-bold ${income ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
        {income ? "+" : "−"}${event.amount.toLocaleString()}
      </span>
    </motion.button>
  );
}

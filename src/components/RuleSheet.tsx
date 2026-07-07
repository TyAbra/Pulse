import { useState } from "react";
import { motion } from "motion/react";
import { makeRule, validateRule, type Repeat, type Rule, type RuleInput } from "../lib/rules";
import { todayLocal } from "../lib/dates";
import { useStore } from "../store/useStore";

const REPEATS: { value: Repeat; label: string }[] = [
  { value: "none", label: "One-off" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
];

export function RuleSheet({ editing, onClose }: { editing: Rule | null; onClose: () => void }) {
  const { addRule, updateRule, deleteRule } = useStore();
  const [form, setForm] = useState<RuleInput>({
    name: editing?.name ?? "",
    amount: editing?.amount ?? 0,
    kind: editing?.kind ?? "income",
    startDate: editing?.startDate ?? todayLocal(),
    endDate: editing?.endDate,
    repeat: editing ? (editing.recurrence?.includes("INTERVAL=2") ? "biweekly"
      : editing.recurrence?.includes("WEEKLY") ? "weekly"
      : editing.recurrence ? "monthly" : "none") : "biweekly",
    emoji: editing?.emoji,
  });
  const [errors, setErrors] = useState<string[]>([]);

  const submit = () => {
    const errs = validateRule(form);
    setErrors(errs);
    if (errs.length) return;
    if (editing) updateRule({ ...makeRule(form), id: editing.id });
    else addRule(makeRule(form));
    onClose();
  };

  const field = "w-full rounded-xl border border-[#232c3f] bg-[#0d1016] px-3 py-2.5 text-sm outline-none focus:border-[var(--green)]";

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50" onClick={onClose}>
      <motion.div initial={{ y: 400 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border border-[#232c3f] bg-[var(--panel)] p-6 pb-8">
        <h2 className="mb-4 text-lg font-bold">{editing ? "Edit" : "Add"} money event</h2>
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            {(["income", "expense"] as const).map(k => (
              <button key={k} onClick={() => setForm(f => ({ ...f, kind: k }))}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold capitalize
                  ${form.kind === k
                    ? k === "income" ? "bg-gradient-to-br from-[var(--green)] to-[var(--green2)] text-[#03140c]" : "bg-[var(--red)] text-[#1a0510]"
                    : "border border-[#232c3f] text-[var(--dim)]"}`}>
                {k === "income" ? "💵 Income" : "💸 Expense"}
              </button>
            ))}
          </div>
          <input className={field} placeholder="Name (Paycheck, Rent…)" value={form.name}
            onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          <input className={`${field} num`} type="number" min="0" step="0.01" placeholder="Amount" value={form.amount || ""}
            onChange={(e) => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
          <div className="flex gap-2">
            {REPEATS.map(r => (
              <button key={r.value} onClick={() => setForm(f => ({ ...f, repeat: r.value }))}
                className={`flex-1 rounded-xl border py-2 text-[11px] font-semibold
                  ${form.repeat === r.value ? "border-[var(--green)] text-[var(--green)]" : "border-[#232c3f] text-[var(--dim)]"}`}>
                {r.label}
              </button>
            ))}
          </div>
          <label className="text-xs text-[var(--dim)]">Starts
            <input className={`${field} mt-1`} type="date" value={form.startDate}
              onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))} />
          </label>
          {errors.map(e => <div key={e} className="text-xs text-[var(--red)]">{e}</div>)}
          <button onClick={submit}
            className="mt-1 rounded-xl bg-gradient-to-br from-[var(--green)] to-[var(--green2)] py-3 font-bold text-[#03140c] shadow-[0_0_24px_#34f5a055]">
            Save
          </button>
          {editing && (
            <button onClick={() => { deleteRule(editing.id); onClose(); }}
              className="text-xs text-[var(--red)]">Delete this rule</button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

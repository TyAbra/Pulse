import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { makeRule, validateRule, type Repeat, type Rule, type RuleInput } from "../lib/rules";
import { bulkTotal, parseBulkLines, rowsToRules } from "../lib/bulk";
import { todayLocal } from "../lib/dates";
import { useStore } from "../store/useStore";

const REPEATS: { value: Repeat; label: string }[] = [
  { value: "none", label: "One-off" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
];

const field = "w-full rounded-xl border border-[#232c3f] bg-[#0d1016] px-3 py-2.5 text-sm outline-none focus:border-[var(--green)]";
const money = (n: number) => `$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function KindToggle({ kind, onChange }: {
  kind: "income" | "expense"; onChange: (k: "income" | "expense") => void;
}) {
  return (
    <div className="flex gap-2">
      {(["income", "expense"] as const).map(k => (
        <button key={k} onClick={() => onChange(k)}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold capitalize
            ${kind === k
              ? k === "income" ? "bg-gradient-to-br from-[var(--green)] to-[var(--green2)] text-[#03140c]" : "bg-[var(--red)] text-[#1a0510]"
              : "border border-[#232c3f] text-[var(--dim)]"}`}>
          {k === "income" ? "💵 Income" : "💸 Expense"}
        </button>
      ))}
    </div>
  );
}

function BulkForm({ now, onClose }: { now: number; onClose: () => void }) {
  const { addRules } = useStore();
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [date, setDate] = useState(todayLocal());

  const rows = useMemo(() => parseBulkLines(text), [text]);
  const usable = rows.filter(r => !r.error);
  const total = bulkTotal(rows);
  const signed = kind === "income" ? total : -total;
  const noun = kind === "income" ? "deposit" : "withdrawal";

  const submit = () => {
    if (!usable.length) return;
    addRules(rowsToRules(rows, kind, date));
    onClose();
  };

  return (
    <div className="flex flex-col gap-3">
      <KindToggle kind={kind} onChange={setKind} />
      <label className="text-xs text-[var(--dim)]">Date they hit
        <input className={`${field} mt-1`} type="date" value={date}
          onChange={(e) => setDate(e.target.value)} />
      </label>
      <label className="text-xs text-[var(--dim)]">One per line — name and amount
        <textarea className={`${field} mt-1 min-h-28 resize-y font-mono text-[13px]`}
          autoFocus
          placeholder={"Costco 84.32\nGas 51.10\nAmazon 129.99"}
          value={text} onChange={(e) => setText(e.target.value)} />
      </label>

      {rows.length > 0 && (
        <div className="rounded-xl border border-[#232c3f] bg-[#0d1016]">
          <div className="max-h-44 overflow-y-auto">
            {rows.map((r, i) => (
              <div key={`${r.raw}-${i}`}
                className="flex items-center justify-between gap-3 border-b border-[#1a2030] px-3 py-2 text-sm last:border-b-0">
                {r.error ? (
                  <>
                    <span className="truncate text-[var(--dim)] line-through">{r.raw.trim()}</span>
                    <span className="shrink-0 text-[11px] text-[var(--red)]">{r.error}</span>
                  </>
                ) : (
                  <>
                    <span className="truncate">{kind === "income" ? "💵" : "💸"} {r.name}</span>
                    <span className={`num shrink-0 font-semibold ${kind === "income" ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                      {kind === "income" ? "+" : "−"}{money(r.amount)}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
          {usable.length > 0 && (
            <div className="border-t border-[#232c3f] px-3 py-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--dim)]">{usable.length} {noun}{usable.length === 1 ? "" : "s"}</span>
                <span className={`num font-bold ${kind === "income" ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                  {kind === "income" ? "+" : "−"}{money(total)}
                </span>
              </div>
              {/* The point of the whole screen: what this does to your balance. */}
              <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--dim)]">
                <span>Balance</span>
                <span className="num">
                  {money(now)} → <span className="text-[var(--text)]">{money(now + signed)}</span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <button onClick={submit} disabled={!usable.length}
        className="mt-1 rounded-xl bg-gradient-to-br from-[var(--green)] to-[var(--green2)] py-3 font-bold text-[#03140c]
          shadow-[0_0_24px_#34f5a055] disabled:opacity-40 disabled:shadow-none">
        {usable.length ? `Add ${usable.length} ${noun}${usable.length === 1 ? "" : "s"}` : "Add"}
      </button>
    </div>
  );
}

function SingleForm({ editing, onClose }: { editing: Rule | null; onClose: () => void }) {
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

  return (
    <div className="flex flex-col gap-3">
      <KindToggle kind={form.kind} onChange={(k) => setForm(f => ({ ...f, kind: k }))} />
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
  );
}

export function RuleSheet({ editing, now, onClose }: {
  editing: Rule | null; now: number; onClose: () => void;
}) {
  const [bulk, setBulk] = useState(false);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50" onClick={onClose}>
      <motion.div initial={{ y: 400 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl border border-[#232c3f] bg-[var(--panel)] p-6 pb-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">
            {editing ? "Edit money event" : bulk ? "Add several" : "Add money event"}
          </h2>
          {/* Editing is always a single rule, so the switch only makes sense when adding. */}
          {!editing && (
            <div className="flex shrink-0 gap-1 rounded-full border border-[#232c3f] p-1 text-[11px] font-semibold">
              {[{ b: false, label: "One" }, { b: true, label: "Several" }].map(({ b, label }) => (
                <button key={label} onClick={() => setBulk(b)}
                  className={`rounded-full px-3 py-1 transition-colors
                    ${bulk === b ? "bg-gradient-to-br from-[var(--green)] to-[var(--green2)] text-[#03140c]" : "text-[var(--dim)]"}`}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        {bulk && !editing
          ? <BulkForm now={now} onClose={onClose} />
          : <SingleForm editing={editing} onClose={onClose} />}
      </motion.div>
    </div>
  );
}

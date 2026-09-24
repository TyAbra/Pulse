import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { BalancePair } from "./BalanceCounter";
import { useStore } from "../store/useStore";
import { todayLocal } from "../lib/dates";

export type ZoomLevel = "month" | "quarter" | "year";
const LEVELS: ZoomLevel[] = ["month", "quarter", "year"];

function BalanceEditor({ open, now, todayNet, onClose }: {
  open: boolean; now: number; todayNet: number; onClose: () => void;
}) {
  const { setSettings } = useStore();
  const [draft, setDraft] = useState(String(now));
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(String(now));
    setError("");
    const id = requestAnimationFrame(() => inputRef.current?.select());
    return () => cancelAnimationFrame(id);
  }, [open, now]);

  if (!open) return null;

  const save = () => {
    const n = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(n)) {
      setError("Enter a valid dollar amount.");
      inputRef.current?.focus();
      return;
    }
    // The typed number is the balance right now, which already reflects today's logged
    // events — so anchor the start of today behind them to avoid double-counting.
    setSettings({ startingBalance: n - todayNet, asOfDate: todayLocal() });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/55 px-4"
      onClick={onClose}
      role="presentation"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="balance-editor-title"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border border-[#232c3f] bg-[var(--panel)] p-5 shadow-lg"
      >
        <h2 id="balance-editor-title" className="text-lg font-bold text-balance">
          Balance today
        </h2>
        <p className="mt-1 text-sm text-[var(--dim)] text-pretty">
          What you actually have right now. Everything ahead is projected from this number.
        </p>
        <label className="mt-4 block">
          <span className="sr-only">Amount in dollars</span>
          <div className={`flex items-center gap-2 rounded-2xl border bg-[#0d1016] px-3 py-2
            ${error ? "border-[var(--red)]" : "border-[#232c3f] focus-within:border-[var(--green)]"}`}>
            <span className="num text-xl text-[var(--dim)]">$</span>
            <input
              ref={inputRef}
              type="number"
              inputMode="decimal"
              step="0.01"
              className="num w-full bg-transparent text-2xl font-extrabold outline-none"
              value={draft}
              onChange={(e) => { setDraft(e.target.value); if (error) setError(""); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") onClose();
              }}
            />
          </div>
          {error && <p className="mt-1.5 text-xs text-[var(--red)]">{error}</p>}
        </label>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-xl border border-[#232c3f] py-2.5 text-sm text-[var(--dim)]">
            Cancel
          </button>
          <button type="button" onClick={save}
            className="flex-1 rounded-xl bg-gradient-to-br from-[var(--green)] to-[var(--green2)] py-2.5 text-sm font-semibold text-[#03140c]">
            Save
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function SettingsButton({ onNotice }: { onNotice: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  const { exportJSON, importJSON } = useStore();
  const doExport = () => {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pulse-backup-${todayLocal()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const doImport = (file: File) => {
    file.text().then((t) => {
      const result = importJSON(t);
      if (!result) {
        onNotice("That file isn't a valid Pulse backup.");
        return;
      }
      const { added, skipped } = result;
      const parts = [`Added ${added} ${added === 1 ? "entry" : "entries"}`];
      if (skipped) parts.push(`${skipped} already here`);
      onNotice(`${parts.join(", ")}.`);
      setOpen(false);
    });
  };
  return (
    <div className="relative ml-2">
      <button onClick={() => setOpen(o => !o)} aria-label="Settings"
        className="rounded-full border border-[#232c3f] bg-[#10141ecc] px-3 py-1.5 text-sm">⚙</button>
      {open && (
        <div className="absolute right-0 top-10 z-40 w-64 rounded-2xl border border-[#232c3f] bg-[var(--panel)] p-4 text-sm">
          <p className="mb-3 text-pretty text-xs text-[var(--dim)]">
            Tap <span className="text-[var(--text)]">Now</span> in the header to update your balance.
          </p>
          <div className="flex gap-2">
            <button onClick={doExport} className="flex-1 rounded-xl border border-[#232c3f] py-2 text-xs">Export</button>
            <label className="flex-1 cursor-pointer rounded-xl border border-[#232c3f] py-2 text-center text-xs">
              Import<input type="file" accept=".json" className="hidden"
                onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
            </label>
          </div>
          <p className="mt-2 text-pretty text-[10px] leading-relaxed text-[var(--dim)]">
            Import adds to what you have — it never replaces it. Your data never leaves this device.
          </p>
        </div>
      )}
    </div>
  );
}

export function TopBar({ now, endValue, endLabel, todayNet, zoom, onZoom, onNotice }: {
  now: number; endValue: number; endLabel: string; todayNet: number;
  zoom: ZoomLevel; onZoom: (z: ZoomLevel) => void;
  onNotice: (message: string) => void;
}) {
  const [editingBalance, setEditingBalance] = useState(false);

  return (
    <>
      {/* On a phone the pills claim most of 375px, which wrapped every balance
          label onto three lines. Stack there, sit side by side from sm up. */}
      <div className="safe-top relative z-10 flex flex-col gap-3 px-5 pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="flex shrink-0 items-start justify-end sm:order-2">
          <div className="flex gap-1 rounded-full border border-[#232c3f] bg-[#10141ecc] p-1 backdrop-blur">
            {LEVELS.map((l) => (
              <button key={l} onClick={() => onZoom(l)}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize transition-colors
                  ${zoom === l ? "bg-gradient-to-br from-[var(--green)] to-[var(--green2)] text-[#03140c]" : "text-[var(--dim)]"}`}>
                {l}
              </button>
            ))}
          </div>
          <SettingsButton onNotice={onNotice} />
        </div>
        <div className="min-w-0 sm:order-1">
          <BalancePair now={now} endValue={endValue} endLabel={endLabel}
            onEditNow={() => setEditingBalance(true)} />
        </div>
      </div>
      <BalanceEditor open={editingBalance} now={now} todayNet={todayNet}
        onClose={() => setEditingBalance(false)} />
    </>
  );
}
